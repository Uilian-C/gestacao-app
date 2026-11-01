import { useState } from 'react';
import { Activity, CalendarPlus, ChevronDown, ChevronRight, ClipboardList, FileText, FlaskConical, HeartPulse, Plus, Route, Siren } from 'lucide-react';
import type { ExamItem } from '../../hooks/useGestationData';
import { appointmentTitle, isConsultation } from '../../lib/appointments';
import { daysBetween, formatBR, localDay, parseLocalDate, parseTimestamp, toISODate } from '../../lib/dates';
import { buildFicha, missingFicha } from '../../lib/ficha';
import { isHighBloodPressure } from '../../lib/health';
import { journeySummary, statusText, todoNow, type JourneyRow } from '../../lib/journeyPlan';
import { questionSpecialty, type SpecialtyId } from '../../data/specialties';
import type { CareView, Consultation, HealthMetric, PregnancyProfile, QuestionItem, SymptomItem } from '../../types';
import AlertSigns from '../AlertSigns';
import FichaPanel, { type FichaInput } from '../FichaBar';
import Sheet from '../Sheet';
import { canonSymptom } from '../../lib/symptomCanon';

// Cuidados numa página só e curta: a próxima consulta (e o que levar), dois
// atalhos de um toque (os dados da gestação, para responder na hora durante a
// consulta, e o relatório dos registros), os registros de saúde e uma lista com
// o pré-natal, os resultados e os sinais de alerta.

const fmt = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const inDays = (n: number) => (n === 0 ? 'hoje' : n === 1 ? 'amanhã' : `em ${n} dias`);

interface Props {
  profile: PregnancyProfile & { dumDate: string };
  consultations: Consultation[];
  questions: QuestionItem[];
  symptoms: SymptomItem[];
  metrics: HealthMetric[];
  exams: ExamItem[];
  journey: JourneyRow[];
  currentWeek: number;
  /** Algum sinal de alerta nos registros recentes. */
  alert: boolean;
  busy: boolean;
  onPrepare: (c: Consultation) => void;
  onReport: (specialty: SpecialtyId) => void;
  onSchedule: () => void;
  onOpenConsultation: (c: Consultation) => void;
  onOpen: (view: Exclude<CareView, 'inicio'>) => void;
  onOpenJourney: (itemId: string) => void;
  onOpenExam: (id: string) => void;
  onNewExam: () => void;
  onSaveFicha: (input: FichaInput) => Promise<boolean>;
}

export default function CareHome(props: Props) {
  const [sheet, setSheet] = useState<'dados' | 'alerta' | null>(null);
  // Uma linha aberta por vez: o resto fica recolhido.
  const [open, setOpen] = useState<'prenatal' | null>(null);
  const toggle = (id: 'prenatal') => setOpen(o => (o === id ? null : id));
  const today = parseLocalDate(toISODate(new Date()));
  const next = props.consultations.filter(isConsultation).find(c => daysBetween(today, localDay(c.scheduled_at)) >= 0) ?? null;

  // Registros: as últimas 4 semanas de sintomas e a última medida.
  const recent = props.symptoms.filter(s => daysBetween(parseLocalDate(s.log_date.slice(0, 10)), today) <= 27);
  const top = [...recent.map(s => canonSymptom(s.symptom_name).name).reduce((m, n) => m.set(n, (m.get(n) ?? 0) + 1), new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const byDate = [...props.metrics].sort((a, b) => b.recorded_at.localeCompare(a.recorded_at));
  const weight = byDate.find(m => m.weight_kg !== null);
  const bp = byDate.find(m => m.systolic_bp !== null && m.diastolic_bp !== null);
  const highBp = bp ? isHighBloodPressure(bp.systolic_bp, bp.diastolic_bp) : false;

  const plan = journeySummary(props.journey, props.currentWeek);
  const todo = todoNow(props.journey).slice(0, 2);
  const last = [...props.exams].sort((a, b) => b.exam_date.localeCompare(a.exam_date))[0];
  const missing = missingFicha(buildFicha(props.profile, props.metrics));

  return (
    <div className="space-y-4">
      {/* 1. A próxima consulta e o que levar. */}
      <NextVisit next={next} today={today} questions={props.questions} onPrepare={props.onPrepare} onSchedule={props.onSchedule} onOpen={props.onOpenConsultation} />

      {/* 2. À mão em um toque: na consulta, quando perguntarem algo, os dados estão aqui. */}
      <div className="grid grid-cols-2 gap-3">
        <Shortcut icon={<ClipboardList />} title="Dados da gestação" hint={missing.length ? 'Para completar' : 'Tipo sanguíneo, DPP…'} warn={missing.length > 0} onClick={() => setSheet('dados')} />
        <Shortcut icon={<FileText />} title="Relatório" hint="O que levar" onClick={() => props.onReport('obstetra')} />
      </div>

      {/* 3. Os registros de saúde. */}
      <section aria-labelledby="registros-titulo">
        <h2 id="registros-titulo" className="sr-only">
          Seus registros
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Tile
            icon={<Activity />}
            label="Sintomas"
            value={recent.length ? `${recent.length} ${recent.length === 1 ? 'registro' : 'registros'}` : 'Ainda não'}
            hint={recent.length ? `4 semanas${top ? ` · mais: ${top}` : ''}` : 'Toque em Registrar'}
            tone={props.alert ? 'alert' : undefined}
            onClick={() => props.onOpen('sintomas')}
          />
          <Tile
            icon={<HeartPulse />}
            label="Peso e pressão"
            value={weight ? `${fmt(weight.weight_kg!)} kg` : bp ? `${bp.systolic_bp}/${bp.diastolic_bp}` : 'Ainda não'}
            hint={bp && weight ? `${bp.systolic_bp}/${bp.diastolic_bp} mmHg${highBp ? ' · alta' : ''}` : weight ? formatBR(weight.recorded_at) : 'Toque em Registrar'}
            tone={highBp ? 'alert' : undefined}
            onClick={() => props.onOpen('medidas')}
          />
        </div>
      </section>

      {/* 4. O resto numa lista só: cada linha abre no lugar (ou leva à página dela). */}
      <ul aria-label="Mais de Cuidados" className="rounded-[24px] bg-surface/80 divide-y divide-line/60">
        <Fold
          id="prenatal"
          open={open === 'prenatal'}
          onToggle={() => toggle('prenatal')}
          icon={<Route />}
          title="Pré-natal"
          hint={
            <>
              {plan.done} de {plan.dueByNow} feitos
              {plan.late > 0 && <span className="text-lilas-strong font-semibold"> · {plan.late} para conversar na consulta</span>}
            </>
          }
          extra={
            <span className="block mt-1.5 h-1 w-24 rounded-full bg-surface-2 overflow-hidden" role="progressbar" aria-label="O pré-natal até agora" aria-valuenow={plan.done} aria-valuemin={0} aria-valuemax={plan.dueByNow}>
              <span className="block h-full rounded-full bg-verde" style={{ width: `${plan.dueByNow ? (plan.done / plan.dueByNow) * 100 : 0}%` }} />
            </span>
          }
        >
          {todo.length > 0 && (
            <ul className="space-y-1">
              {todo.map(r => (
                <li key={r.item.id}>
                  <button type="button" onClick={() => props.onOpenJourney(r.item.id)} className="w-full flex items-center gap-2 rounded-xl px-2 py-2 text-left hover:bg-surface-2/60">
                    <span className="flex-1 min-w-0">
                      <span className="block text-[14px] font-semibold text-ink leading-snug">{r.item.title}</span>
                      <span className={`block text-[12.5px] ${r.status === 'atrasado' ? 'text-lilas-strong' : 'text-ink-soft'}`}>{statusText(r, props.profile.dumDate)}</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-ink-mute shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" onClick={() => props.onOpen('jornada')} className="mt-1 px-2 text-[13px] font-bold text-verde-strong">
            Ver a jornada completa ›
          </button>
        </Fold>

        <Link
          icon={<FlaskConical />}
          title="Resultados"
          hint={last ? `${props.exams.length} ${props.exams.length === 1 ? 'guardado' : 'guardados'} · ${last.title}, ${formatBR(last.exam_date)}` : 'Fotos e PDFs dos exames, num lugar só'}
          onClick={() => props.onOpen('exames')}
        />

        <Link icon={<Siren />} tone="alert" title="Quando procurar a maternidade" hint="Os sinais que não esperam a consulta" onClick={() => setSheet('alerta')} />
      </ul>

      {sheet === 'dados' && (
        <Sheet title="Dados da gestação" subtitle="Para responder na hora e no topo de todo relatório" onClose={() => setSheet(null)}>
          <FichaPanel profile={props.profile} metrics={props.metrics} busy={props.busy} onSave={props.onSaveFicha} />
        </Sheet>
      )}
      {sheet === 'alerta' && (
        <Sheet title="Quando procurar a maternidade" onClose={() => setSheet(null)}>
          <AlertSigns open />
        </Sheet>
      )}
    </div>
  );
}

/** A próxima consulta, compacta: a data num bloquinho, o nome, a hora e o que levar, com o "Preparar" ao lado. */
function NextVisit({ next, today, questions, onPrepare, onSchedule, onOpen }: { next: Consultation | null; today: Date; questions: QuestionItem[]; onPrepare: (c: Consultation) => void; onSchedule: () => void; onOpen: (c: Consultation) => void }) {
  const box = 'rounded-[24px] bg-gradient-to-br from-verde-soft via-verde-soft/60 to-azul-soft/40 p-3.5';
  if (!next) {
    return (
      <section aria-label="Próxima consulta" className={`${box} flex items-center gap-3`}>
        <span className="w-12 h-12 rounded-2xl bg-surface/80 text-verde-strong flex items-center justify-center shrink-0">
          <CalendarPlus className="w-5 h-5" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-ink leading-tight">Nenhuma consulta marcada</span>
          <span className="block text-[12.5px] text-ink-soft">O app lembra na véspera e ajuda a preparar.</span>
        </span>
        <button type="button" onClick={onSchedule} className="shrink-0 inline-flex items-center gap-1 rounded-full bg-verde-strong text-on-accent px-3.5 py-2 text-[13px] font-bold">
          <Plus className="w-4 h-4" /> Agendar consulta
        </button>
      </section>
    );
  }
  const when = parseTimestamp(next.scheduled_at);
  const days = daysBetween(today, localDay(next.scheduled_at));
  const pending = questions.filter(q => !q.doctor_answer && questionSpecialty(q.specialty) === questionSpecialty(next.specialty)).length;
  return (
    <section aria-label="Próxima consulta" className={`${box} space-y-3`}>
      <button type="button" onClick={() => onOpen(next)} className="w-full flex items-center gap-3 text-left">
        <span className="w-12 shrink-0 rounded-2xl bg-surface/80 py-1.5 text-center leading-none" aria-hidden>
          <span className="block text-[10.5px] font-extrabold uppercase text-verde-strong">{when.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
          <span className="block font-display text-[1.35rem] text-ink tabular mt-0.5">{when.getDate()}</span>
          <span className="block text-[10px] font-bold uppercase text-ink-mute mt-0.5">{when.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[11.5px] font-extrabold uppercase tracking-wide text-verde-strong">Próxima consulta · {inDays(days)}</span>
          <span className="block font-display text-[1.15rem] leading-snug text-ink truncate">{appointmentTitle(next)}</span>
          <span className="block text-[13px] text-ink-soft truncate">
            {when.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            {next.professional_name && ` · ${next.professional_name}`}
          </span>
        </span>
      </button>
      <div className="flex items-center gap-2 pl-[3.75rem]">
        <span className="flex-1 min-w-0 text-[12.5px] text-ink-soft">{pending ? `${pending} ${pending === 1 ? 'dúvida anotada' : 'dúvidas anotadas'}` : 'Nenhuma dúvida ainda'}</span>
        <button type="button" onClick={() => onPrepare(next)} className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-verde-strong text-on-accent px-3.5 py-2 text-[13px] font-bold">
          <FileText className="w-4 h-4" /> Preparar a consulta
        </button>
      </div>
    </section>
  );
}

function Tile({ icon, label, value, hint, tone, onClick }: { icon: React.ReactNode; label: string; value: string; hint: string; tone?: 'alert'; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-left rounded-[24px] bg-surface/80 p-4 min-w-0 transition active:scale-[0.98]">
      <span className={`flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wide [&_svg]:w-4 [&_svg]:h-4 ${tone === 'alert' ? 'text-alert' : 'text-verde-strong'}`}>
        {icon} {label}
      </span>
      <span className="block font-display text-[1.35rem] leading-tight text-ink tabular mt-1.5 truncate">{value}</span>
      <span className={`block text-[12.5px] truncate ${tone === 'alert' ? 'text-alert font-semibold' : 'text-ink-soft'}`}>{hint}</span>
    </button>
  );
}

/** Uma linha da lista que abre no lugar (com o resumo dela quando fechada). */
function Fold({ id, open, onToggle, icon, title, hint, extra, children }: { id: string; open: boolean; onToggle: () => void; icon: React.ReactNode; title: string; hint: React.ReactNode; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <li>
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={`dobra-${id}`} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
        <RowIcon>{icon}</RowIcon>
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-ink">{title}</span>
          <span className="block text-[12.5px] text-ink-soft truncate">{hint}</span>
          {extra}
        </span>
        <ChevronDown className={`w-4 h-4 text-ink-mute shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div id={`dobra-${id}`} className="px-3 pb-3 -mt-1">
          {children}
        </div>
      )}
    </li>
  );
}

/** Uma linha da lista que leva a outra página. */
function Link({ icon, title, hint, tone, onClick }: { icon: React.ReactNode; title: string; hint: string; tone?: 'alert'; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
        <RowIcon tone={tone}>{icon}</RowIcon>
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-ink">{title}</span>
          <span className="block text-[12.5px] text-ink-soft truncate">{hint}</span>
        </span>
        <ChevronRight className="w-4 h-4 text-ink-mute shrink-0" />
      </button>
    </li>
  );
}

function RowIcon({ children, tone }: { children: React.ReactNode; tone?: 'alert' }) {
  return <span className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 [&_svg]:w-[18px] [&_svg]:h-[18px] ${tone === 'alert' ? 'bg-alert-soft text-alert' : 'bg-verde-soft text-verde-strong'}`}>{children}</span>;
}

/** Atalho de um toque, logo abaixo da consulta. */
function Shortcut({ icon, title, hint, warn, onClick }: { icon: React.ReactNode; title: string; hint: string; warn?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-2.5 rounded-[20px] bg-surface/80 px-3 py-3 text-left min-w-0 transition active:scale-[0.98]">
      <RowIcon>{icon}</RowIcon>
      <span className="flex-1 min-w-0">
        <span className="block text-[14px] font-semibold text-ink leading-tight">{title}</span>
        <span className={`block text-[12.5px] truncate ${warn ? 'text-warn font-semibold' : 'text-ink-soft'}`}>{hint}</span>
      </span>
    </button>
  );
}
