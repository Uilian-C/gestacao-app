import { useState } from 'react';
import { Activity, ChevronDown, ChevronRight, ClipboardList, FileText, FlaskConical, HeartPulse, Plus, Route, Siren } from 'lucide-react';
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
import { Button } from '../ui';

// Cuidados numa página só e curta: a próxima consulta (e o que levar), os
// registros de saúde e uma lista com o pré-natal, os resultados e o que é bom
// ter à mão, que abre no lugar ou leva à página de cada um (com "voltar").

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
  const [open, setOpen] = useState<'prenatal' | 'mao' | null>(null);
  const toggle = (id: 'prenatal' | 'mao') => setOpen(o => (o === id ? null : id));
  const today = parseLocalDate(toISODate(new Date()));
  const next = props.consultations.filter(isConsultation).find(c => daysBetween(today, localDay(c.scheduled_at)) >= 0) ?? null;

  // Registros: as últimas 4 semanas de sintomas e a última medida.
  const recent = props.symptoms.filter(s => daysBetween(parseLocalDate(s.log_date.slice(0, 10)), today) <= 27);
  const top = [...recent.reduce((m, s) => m.set(s.symptom_name, (m.get(s.symptom_name) ?? 0) + 1), new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
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

      {/* 2. Os registros de saúde. */}
      <section aria-labelledby="registros-titulo">
        <h2 id="registros-titulo" className="sr-only">
          Seus registros
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Tile
            icon={<Activity />}
            label="Sintomas"
            value={recent.length ? `${recent.length} ${recent.length === 1 ? 'registro' : 'registros'}` : 'Nenhum ainda'}
            hint={recent.length ? `4 semanas${top ? ` · mais: ${top}` : ''}` : 'Toque em Registrar'}
            tone={props.alert ? 'alert' : undefined}
            onClick={() => props.onOpen('sintomas')}
          />
          <Tile
            icon={<HeartPulse />}
            label="Peso e pressão"
            value={weight ? `${fmt(weight.weight_kg!)} kg` : bp ? `${bp.systolic_bp}/${bp.diastolic_bp}` : 'Nenhum ainda'}
            hint={bp && weight ? `${bp.systolic_bp}/${bp.diastolic_bp} mmHg${highBp ? ' · alta' : ''}` : weight ? formatBR(weight.recorded_at) : 'Toque em Registrar'}
            tone={highBp ? 'alert' : undefined}
            onClick={() => props.onOpen('medidas')}
          />
        </div>
      </section>

      {/* 3. O resto numa lista só: cada linha abre no lugar (ou leva à página dela). */}
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
              {plan.late > 0 && <span className="text-warn font-semibold"> · {plan.late} {plan.late === 1 ? 'atrasado' : 'atrasados'}</span>}
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
                      <span className={`block text-[12.5px] ${r.status === 'atrasado' ? 'text-warn' : 'text-ink-soft'}`}>{statusText(r, props.profile.dumDate)}</span>
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

        <Fold id="mao" open={open === 'mao'} onToggle={() => toggle('mao')} icon={<ClipboardList />} title="Para ter à mão" hint={missing.length ? `Dados da gestação: faltam ${missing.length}` : 'Dados, resumo para emergência e sinais de alerta'}>
          <ul className="space-y-1">
            <HandyRow icon={<ClipboardList />} title="Dados da gestação" hint={missing.length ? `Faltam ${missing.length} ${missing.length === 1 ? 'item' : 'itens'}` : 'Completos'} onClick={() => setSheet('dados')} />
            <HandyRow icon={<FileText />} title="Resumo para emergência" hint="Para mostrar no pronto-atendimento" onClick={() => props.onReport('obstetra')} />
            <HandyRow icon={<Siren />} title="Quando procurar a maternidade" hint="Os sinais que não esperam a consulta" tone="alert" onClick={() => setSheet('alerta')} />
          </ul>
        </Fold>
      </ul>

      {sheet === 'dados' && (
        <Sheet title="Dados da gestação" subtitle="Aparecem no topo de todo resumo de consulta" onClose={() => setSheet(null)}>
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

function NextVisit({ next, today, questions, onPrepare, onSchedule, onOpen }: { next: Consultation | null; today: Date; questions: QuestionItem[]; onPrepare: (c: Consultation) => void; onSchedule: () => void; onOpen: (c: Consultation) => void }) {
  if (!next) {
    return (
      <section aria-label="Próxima consulta" className="rounded-[28px] bg-gradient-to-br from-verde-soft via-verde-soft/60 to-azul-soft/40 p-5 space-y-3">
        <p className="text-[12px] font-extrabold uppercase tracking-wide text-verde-strong">Próxima consulta</p>
        <p className="font-display text-[1.35rem] leading-snug text-ink">Nenhuma consulta marcada</p>
        <p className="text-[14px] text-ink-soft">Marquem a próxima: o app lembra na véspera e ajuda a preparar o que levar.</p>
        <Button onClick={onSchedule}>
          <Plus className="w-4 h-4" /> Agendar consulta
        </Button>
      </section>
    );
  }
  const when = parseTimestamp(next.scheduled_at);
  const days = daysBetween(today, localDay(next.scheduled_at));
  const pending = questions.filter(q => !q.doctor_answer && questionSpecialty(q.specialty) === questionSpecialty(next.specialty)).length;
  return (
    <section aria-label="Próxima consulta" className="rounded-[28px] bg-gradient-to-br from-verde-soft via-verde-soft/60 to-azul-soft/40 p-5 space-y-3">
      <p className="text-[12px] font-extrabold uppercase tracking-wide text-verde-strong">Próxima consulta · {inDays(days)}</p>
      <button type="button" onClick={() => onOpen(next)} className="block text-left">
        <span className="block font-display text-[1.35rem] leading-snug text-ink">{appointmentTitle(next)}</span>
        <span className="block text-[14px] text-ink-soft first-letter:uppercase">
          {when.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} às {when.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          {next.professional_name && ` · ${next.professional_name}`}
        </span>
      </button>
      <p className="text-[13.5px] text-ink-soft">{pending ? `${pending} ${pending === 1 ? 'dúvida anotada' : 'dúvidas anotadas'} para levar.` : 'Anotem as dúvidas e levem o resumo dos registros.'}</p>
      <Button onClick={() => onPrepare(next)}>
        <FileText className="w-4 h-4" /> Preparar a consulta
      </Button>
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
function Link({ icon, title, hint, onClick }: { icon: React.ReactNode; title: string; hint: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
        <RowIcon>{icon}</RowIcon>
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

function HandyRow({ icon, title, hint, tone, onClick }: { icon: React.ReactNode; title: string; hint: string; tone?: 'alert'; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="w-full flex items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-surface-2/60">
        <RowIcon tone={tone}>{icon}</RowIcon>
        <span className="flex-1 min-w-0">
          <span className="block text-[14px] font-semibold text-ink">{title}</span>
          <span className="block text-[12.5px] text-ink-soft truncate">{hint}</span>
        </span>
        <ChevronRight className="w-4 h-4 text-ink-mute shrink-0" />
      </button>
    </li>
  );
}
