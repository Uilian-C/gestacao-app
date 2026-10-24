import { useState } from 'react';
import { Activity, ChevronRight, ClipboardList, FileText, FlaskConical, HeartPulse, Plus, Route, Siren } from 'lucide-react';
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

// Cuidados numa página só, na ordem do que se procura: a próxima consulta (e o
// que levar), os registros de saúde, o pré-natal, os resultados e o que é bom
// ter à mão. Os detalhes abrem a um toque, cada um numa página com "voltar".

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
  const exams = [...props.exams].sort((a, b) => b.exam_date.localeCompare(a.exam_date)).slice(0, 2);
  const missing = missingFicha(buildFicha(props.profile, props.metrics));

  return (
    <div className="space-y-8">
      {/* 1. A próxima consulta e o que levar. */}
      <NextVisit next={next} today={today} questions={props.questions} onPrepare={props.onPrepare} onSchedule={props.onSchedule} onOpen={props.onOpenConsultation} />

      {/* 2. Os registros de saúde. */}
      <section aria-labelledby="registros-titulo" className="space-y-3">
        <h2 id="registros-titulo" className="px-1 text-[1.2rem] text-ink">
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

      {/* 3. O pré-natal: o que já foi feito e o que fazer agora. */}
      <section aria-labelledby="prenatal-titulo" className="rounded-[28px] bg-surface/80 p-4 space-y-3">
        <button type="button" onClick={() => props.onOpen('jornada')} className="w-full flex items-center justify-between gap-3 px-1 text-left">
          <span className="min-w-0">
            <h2 id="prenatal-titulo" className="text-[1.2rem] text-ink">
              Pré-natal
            </h2>
            <span className="block text-[13px] text-ink-soft">
              {plan.done} de {plan.dueByNow} feitos até agora
              {plan.late > 0 && <span className="text-warn font-semibold"> · {plan.late} {plan.late === 1 ? 'atrasado' : 'atrasados'}</span>}
            </span>
          </span>
          <span className="shrink-0 inline-flex items-center text-[13px] font-bold text-verde-strong">
            Jornada <ChevronRight className="w-4 h-4" />
          </span>
        </button>
        <div className="mx-1 h-1.5 rounded-full bg-surface-2 overflow-hidden" role="progressbar" aria-label="O pré-natal até agora" aria-valuenow={plan.done} aria-valuemin={0} aria-valuemax={plan.dueByNow}>
          <div className="h-full rounded-full bg-verde" style={{ width: `${plan.dueByNow ? (plan.done / plan.dueByNow) * 100 : 0}%` }} />
        </div>
        {todo.length > 0 && (
          <ul className="divide-y divide-line/60">
            {todo.map(r => (
              <li key={r.item.id}>
                <button type="button" onClick={() => props.onOpenJourney(r.item.id)} className="w-full flex items-center gap-3 px-1 py-2.5 text-left">
                  <span className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${r.status === 'atrasado' ? 'bg-warn-soft text-warn' : 'bg-verde-soft text-verde-strong'}`}>
                    <Route className="w-4 h-4" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-ink leading-snug line-clamp-2">{r.item.title}</span>
                    <span className={`block text-[12.5px] ${r.status === 'atrasado' ? 'text-warn' : 'text-ink-soft'}`}>{statusText(r, props.profile.dumDate)}</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-ink-mute shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 4. Os resultados guardados. */}
      <section aria-labelledby="resultados-titulo" className="space-y-3">
        <div className="flex items-baseline justify-between gap-3 px-1">
          <h2 id="resultados-titulo" className="text-[1.2rem] text-ink">
            Resultados
          </h2>
          <button type="button" onClick={() => props.onOpen('exames')} className="inline-flex items-center text-[13px] font-bold text-verde-strong">
            {props.exams.length ? `Ver todos (${props.exams.length})` : 'Abrir'} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {exams.length > 0 ? (
          <ul className="rounded-[24px] bg-surface/80 divide-y divide-line/60">
            {exams.map(e => (
              <li key={e.id}>
                <button type="button" onClick={() => props.onOpenExam(e.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                  <FlaskConical className="w-5 h-5 text-verde-strong shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-ink truncate">{e.title}</span>
                    <span className="block text-[12.5px] text-ink-soft">{formatBR(e.exam_date)}</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-ink-mute shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-1 text-[14px] text-ink-soft">Fotos e PDFs dos exames, num lugar só, para os dois.</p>
        )}
        <Button tone="soft" onClick={props.onNewExam}>
          <Plus className="w-4 h-4" /> Guardar resultado
        </Button>
      </section>

      {/* 5. O que é bom ter à mão. */}
      <section aria-labelledby="mao-titulo" className="space-y-3">
        <h2 id="mao-titulo" className="px-1 text-[1.2rem] text-ink">
          Para ter à mão
        </h2>
        <ul className="rounded-[24px] bg-surface/80 divide-y divide-line/60">
          <HandyRow icon={<ClipboardList />} title="Dados da gestação" hint={missing.length ? `Faltam ${missing.length} ${missing.length === 1 ? 'item' : 'itens'}` : 'Completos'} onClick={() => setSheet('dados')} />
          <HandyRow icon={<FileText />} title="Resumo para emergência" hint="Para mostrar no pronto-atendimento" onClick={() => props.onReport('obstetra')} />
          <HandyRow icon={<Siren />} title="Quando procurar a maternidade" hint="Os sinais que não esperam a consulta" tone="alert" onClick={() => setSheet('alerta')} />
        </ul>
      </section>

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

function HandyRow({ icon, title, hint, tone, onClick }: { icon: React.ReactNode; title: string; hint: string; tone?: 'alert'; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <span className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 [&_svg]:w-[18px] [&_svg]:h-[18px] ${tone === 'alert' ? 'bg-alert-soft text-alert' : 'bg-verde-soft text-verde-strong'}`}>{icon}</span>
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-ink">{title}</span>
          <span className="block text-[12.5px] text-ink-soft truncate">{hint}</span>
        </span>
        <ChevronRight className="w-4 h-4 text-ink-mute shrink-0" />
      </button>
    </li>
  );
}
