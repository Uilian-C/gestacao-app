import { useMemo, useState } from 'react';
import { ArrowLeft, CalendarHeart, ChevronRight, ClipboardCopy, ExternalLink, FileText, HelpCircle, Plus, Printer, ShieldCheck, Trash2 } from 'lucide-react';
import { googleCalendarUrl } from '../../lib/calendar';
import { SPECIALTIES, questionSpecialty, specialtyOf, type SpecialtyId } from '../../data/specialties';
import { daysBetween, formatBR, localDay, parseLocalDate, parseTimestamp, toISODate } from '../../lib/dates';
import { TREND_LABEL, buildReport, defaultReportPeriod, reportToText, type ConsultationReport } from '../../lib/report';
import { timeOfDayLabel } from '../../lib/symptoms';
import { buildFicha, fichaToText, type FichaItem } from '../../lib/ficha';
import { laborReportLines } from '../../lib/labor';
import { planProgress, toPlan } from '../../lib/birthPlan';
import { FichaGrid } from '../FichaBar';
import { BMI_LABEL, GAIN_STATUS_LABEL } from '../../lib/weightGain';
import { PLAN_ITEMS } from '../../content/prenatalPlan';
import { APPOINTMENT_KINDS, isConsultation, appointmentEmoji, appointmentTitle, hasResult, kindInfo, kindOf, resultOf } from '../../lib/appointments';
import type { ExamItem } from '../../hooks/useGestationData';
import type { AppointmentKind, BirthPlanRecord, Contraction, KickSession, Consultation, HealthMetric, PartnerComment, PregnancyProfile, QuestionItem, SymptomItem } from '../../types';
import AuthorBadge from '../AuthorBadge';
import AddressInput from '../AddressInput';
import LocationLinks from '../LocationLinks';
import SpecialtyIcon from '../SpecialtyIcon';
import { InsightList } from '../InsightList';
import { inputClass } from '../styles';
import { Button, Card, Chip, EmptyState, Field, Pill, SectionTitle } from '../ui';

export interface ReportRequest {
  specialtyId: SpecialtyId;
  consultationId: string | null;
}

export interface NewConsultation {
  scheduledAt: string;
  specialty: SpecialtyId;
  professional: string;
  location: string;
  /** Consulta, exame, ultrassom ou vacina. */
  kind: AppointmentKind;
  /** Nome do exame, ultrassom ou vacina. */
  title: string | null;
  planItem: string | null;
}

/** Sugestões de nome para cada tipo, tiradas da jornada do pré-natal. */
function suggestionsFor(kind: AppointmentKind) {
  if (kind === 'vacina') return PLAN_ITEMS.filter(i => i.kind === 'vacina');
  const exams = PLAN_ITEMS.filter(i => i.kind === 'exame');
  return kind === 'ultrassom' ? exams.filter(i => i.title.startsWith('Ultrassom')) : exams.filter(i => !i.title.startsWith('Ultrassom'));
}

interface Props {
  profile: PregnancyProfile & { dumDate: string };
  consultations: Consultation[];
  questions: QuestionItem[];
  symptoms: SymptomItem[];
  comments: PartnerComment[];
  metrics: HealthMetric[];
  busy: boolean;
  migrationPending: boolean;
  report: ReportRequest | null;
  onOpenReport: (r: ReportRequest | null) => void;
  onCreateConsultation: (c: NewConsultation) => Promise<boolean>;
  /** Abre os detalhes do agendamento (com editar e excluir). */
  onOpenConsultation: (c: Consultation) => void;
  /** Resultados já guardados (para saber o que falta guardar). */
  exams: ExamItem[];
  /** Guarda o resultado de um exame agendado, ou abre o que já foi guardado. */
  onResult: (c: Consultation) => void;
  onCreateQuestion: (text: string, category: string, specialty: SpecialtyId) => Promise<boolean>;
  onAnswer: (id: string, answer: string) => Promise<boolean>;
  onDeleteQuestion: (q: QuestionItem) => void;
  onNotify: (text: string) => void;
  kickSessions: KickSession[];
  contractions: Contraction[];
  birthPlan: BirthPlanRecord | null;
}

const QUESTION_CATEGORIES = ['Alimentação', 'Medicação', 'Exames', 'Parto', 'Geral'];

export default function ConsultationsTab(props: Props) {
  const today = parseLocalDate(toISODate(new Date()));
  if (props.report) {
    return <ReportScreen {...props} request={props.report} today={today} />;
  }

  const upcoming = props.consultations.filter(c => daysBetween(today, localDay(c.scheduled_at)) >= 0);
  const past = props.consultations.filter(c => daysBetween(today, localDay(c.scheduled_at)) < 0).reverse();
  const waiting = past.filter(c => hasResult(c) && !resultOf(c, props.exams)).length;
  const row = (c: Consultation) => (
    <ConsultationRow
      key={c.id}
      consultation={c}
      today={today}
      questions={props.questions}
      result={resultOf(c, props.exams)}
      onPrepare={() => props.onOpenReport({ specialtyId: questionSpecialty(c.specialty), consultationId: c.id })}
      onResult={() => props.onResult(c)}
      onOpen={() => props.onOpenConsultation(c)}
    />
  );

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle icon={<CalendarHeart className="w-5 h-5" />} title="Agendados" subtitle="Consultas, exames, ultrassons e vacinas marcados. Tudo vai para a Agenda, com lembrete na véspera." />
        {props.migrationPending ? (
          <p className="text-sm text-warn bg-warn-soft rounded-2xl p-4">
            Para agendar, rodem a migração <code>db/migrations/002_consultas_e_padroes.sql</code> no Neon. Enquanto isso, o resumo avulso abaixo já funciona.
          </p>
        ) : (
          <div className="space-y-4">
            {upcoming.length === 0 && <p className="text-ink-soft">Nada marcado por enquanto.</p>}
            {upcoming.map(c => row(c))}
            <ScheduleForm busy={props.busy} onCreate={props.onCreateConsultation} />
            {past.length > 0 && (
              <details open={waiting > 0}>
                <summary className="cursor-pointer text-sm font-semibold text-ink-mute">
                  Já aconteceram ({past.length}){waiting > 0 && ` · ${waiting} sem resultado guardado`}
                </summary>
                <div className="space-y-3 mt-3">{past.map(c => row(c))}</div>
              </details>
            )}
          </div>
        )}
      </Card>

      <QuickReport onOpen={specialtyId => props.onOpenReport({ specialtyId, consultationId: null })} />

      <QuestionsSection {...props} />
    </div>
  );
}

function ConsultationRow({ consultation: c, today, questions, result, onPrepare, onResult, onOpen }: { consultation: Consultation; today: Date; questions: QuestionItem[]; result: ExamItem | null; onPrepare: () => void; onResult: () => void; onOpen: () => void }) {
  const spec = specialtyOf(c.specialty);
  const kind = kindOf(c);
  const consulta = kind === 'consulta';
  const when = parseTimestamp(c.scheduled_at);
  const days = daysBetween(today, localDay(c.scheduled_at));
  const pending = questions.filter(q => !q.doctor_answer && questionSpecialty(q.specialty) === spec.id).length;
  const title = appointmentTitle(c);
  return (
    <div className="rounded-2xl border border-transparent bg-surface-2/60 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      {consulta ? (
        <SpecialtyIcon id={spec.id} />
      ) : (
        <span className="w-10 h-10 rounded-2xl bg-brand-soft flex items-center justify-center text-lg shrink-0" aria-hidden>
          {appointmentEmoji(c)}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <button type="button" onClick={onOpen} className="flex flex-wrap items-center gap-2 text-left" aria-label={consulta ? `Consulta de ${title}: ver detalhes, editar ou excluir` : `${kindInfo(kind).label}: ${title}: ver detalhes, editar ou excluir`}>
          {!consulta && <span className="text-[11px] font-bold uppercase tracking-wide text-brand-strong">{kindInfo(kind).label}</span>}
          <p className="font-semibold text-ink">{title}</p>
          {days >= 0 && <Pill tone={days <= 2 ? 'warm' : 'brand'}>{days === 0 ? 'hoje' : days === 1 ? 'amanhã' : `em ${days} dias`}</Pill>}
          {result && <Pill tone="brand">resultado guardado</Pill>}
          <ChevronRight className="w-4 h-4 text-ink-mute" />
        </button>
        <p className="text-sm text-ink-soft">
          {when.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })} às {when.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          {c.professional_name && ` · ${c.professional_name}`}
        </p>
        {c.location && <div className="mt-2"><LocationLinks address={c.location} /></div>}
        {days >= 0 && (
          <p className="text-xs text-ink-mute mt-1 flex flex-wrap gap-x-3">
            {consulta && <span>{pending} {pending === 1 ? 'dúvida anotada' : 'dúvidas anotadas'}</span>}
            <a href={googleCalendarUrl(c)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand underline underline-offset-2">
              <ExternalLink className="w-3 h-3" /> Google Agenda
            </a>
          </p>
        )}
      </div>
      <div className="flex gap-2">
        {consulta ? (
          <Button onClick={onPrepare} tone={days >= 0 ? 'soft' : 'ghost'}>
            <FileText className="w-4 h-4" /> {days >= 0 ? 'Preparar resumo' : 'Ver resumo'}
          </Button>
        ) : (
          hasResult(c) &&
          (result || days <= 0) && (
            <Button onClick={onResult} tone={result ? 'ghost' : 'soft'}>
              <FileText className="w-4 h-4" /> {result ? 'Ver resultado' : 'Guardar resultado'}
            </Button>
          )
        )}
      </div>
    </div>
  );
}

export function ScheduleForm({ busy, onCreate, initialDate, startOpen = false, onClose, initial }: { busy: boolean; onCreate: (c: NewConsultation) => Promise<boolean>; initialDate?: string; startOpen?: boolean; onClose?: () => void; initial?: Consultation }) {
  const [open, setOpenState] = useState(startOpen || !!initial);
  const setOpen = (value: boolean) => {
    setOpenState(value);
    if (!value) onClose?.();
  };
  const at = initial ? parseTimestamp(initial.scheduled_at) : null;
  const [kind, setKind] = useState<AppointmentKind>(initial ? kindOf(initial) : 'consulta');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [planItem, setPlanItem] = useState<string | null>(initial?.plan_item ?? null);
  const [date, setDate] = useState(at ? toISODate(at) : (initialDate ?? ''));
  const [time, setTime] = useState(at ? at.toTimeString().slice(0, 5) : '09:00');
  const [specialty, setSpecialty] = useState<SpecialtyId>(initial && kindOf(initial) === 'consulta' ? questionSpecialty(initial.specialty) : 'obstetra');
  const [professional, setProfessional] = useState(initial?.professional_name ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const consulta = kind === 'consulta';

  if (!open) {
    return (
      <Button tone="soft" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" /> Agendar
      </Button>
    );
  }

  return (
    <form
      className="rounded-2xl bg-surface-2 p-4 space-y-4"
      onSubmit={async e => {
        e.preventDefault();
        if (!date || (!consulta && !title.trim())) return;
        // Horário local com fuso explícito, para o banco guardar o instante certo.
        const local = new Date(`${date}T${time || '09:00'}`);
        const ok = await onCreate({
          scheduledAt: local.toISOString(),
          // Exames e ultrassons ficam com a especialidade "Ultrassom / exames"; vacinas, "Outra".
          specialty: consulta ? specialty : kind === 'vacina' ? 'outra' : 'ultrassom',
          professional: professional.trim(),
          location: location.trim(),
          kind,
          title: consulta ? null : title.trim(),
          planItem: consulta ? null : planItem,
        });
        if (ok) {
          setOpen(false);
          setDate('');
          setTitle('');
          setPlanItem(null);
          setProfessional('');
          setLocation('');
        }
      }}
    >
      <div role="group" aria-label="Tipo de agendamento" className="grid grid-cols-4 gap-1.5">
        {APPOINTMENT_KINDS.map(k => (
          <button
            key={k.id}
            type="button"
            aria-pressed={kind === k.id}
            onClick={() => {
              setKind(k.id);
              setTitle('');
              setPlanItem(null);
            }}
            className={`flex flex-col items-center gap-0.5 rounded-2xl px-1 py-2 text-[12px] font-bold transition ${kind === k.id ? 'bg-brand text-on-accent shadow-soft' : 'bg-surface text-ink-soft hover:text-ink'}`}
          >
            <span className="text-base leading-none" aria-hidden>{k.emoji}</span>
            {k.label}
          </button>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {consulta ? (
          <Field label="Especialidade" htmlFor="esp">
            <select id="esp" className={inputClass} value={specialty} onChange={e => setSpecialty(e.target.value as SpecialtyId)}>
              {SPECIALTIES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </Field>
        ) : (
          <div className="space-y-2 sm:col-span-2">
            <Field label={kind === 'vacina' ? 'Qual vacina?' : kind === 'ultrassom' ? 'Qual ultrassom?' : 'Qual exame?'} htmlFor="nome-agendamento">
              <input
                id="nome-agendamento"
                className={inputClass}
                placeholder={kind === 'vacina' ? 'Ex.: Vacina dTpa' : kind === 'ultrassom' ? 'Ex.: Ultrassom obstétrico' : 'Ex.: Exames de sangue'}
                value={title}
                maxLength={120}
                onChange={e => {
                  setTitle(e.target.value);
                  setPlanItem(null);
                }}
              />
            </Field>
            <div className="-mx-1 px-1 flex gap-1.5 overflow-x-auto no-scrollbar" aria-label="Sugestões da jornada">
              {suggestionsFor(kind).map(i => (
                <Chip
                  key={i.id}
                  active={planItem === i.id}
                  onClick={() => {
                    setTitle(i.title);
                    setPlanItem(i.id);
                  }}
                >
                  {i.short}
                </Chip>
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data" htmlFor="data-consulta">
            <input id="data-consulta" type="date" required className={inputClass} value={date} onChange={e => setDate(e.target.value)} />
          </Field>
          <Field label="Hora" htmlFor="hora-consulta">
            <input id="hora-consulta" type="time" className={inputClass} value={time} onChange={e => setTime(e.target.value)} />
          </Field>
        </div>
        <Field label={consulta ? 'Profissional (opcional)' : 'Laboratório ou clínica (opcional)'} htmlFor="prof">
          <input id="prof" className={inputClass} placeholder={consulta ? 'Ex.: Dra. Ana' : 'Ex.: Laboratório Vida'} value={professional} onChange={e => setProfessional(e.target.value)} />
        </Field>
        <Field label="Endereço (opcional)" htmlFor="local" hint="Escolha uma sugestão para ter atalhos de Maps, Waze e Uber.">
          <AddressInput id="local" placeholder="Digite o nome da clínica ou o endereço" value={location} onChange={setLocation} />
        </Field>
      </div>
      <div className="flex gap-2 justify-end">
        <Button tone="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
        <Button type="submit" disabled={busy || !date || (!consulta && !title.trim())}>{initial ? 'Salvar alterações' : 'Agendar'}</Button>
      </div>
    </form>
  );
}

function QuickReport({ onOpen }: { onOpen: (id: SpecialtyId) => void }) {
  const [specialty, setSpecialty] = useState<SpecialtyId>('obstetra');
  return (
    <section className="rounded-[24px] bg-surface shadow-soft px-5 py-4">
      <p className="text-sm font-semibold text-ink mb-2 flex items-center gap-2">
        <FileText className="w-4 h-4 text-brand" /> Resumo para pronto-atendimento
      </p>
      <div className="flex gap-2">
        <select aria-label="Especialidade do resumo" className={`${inputClass} !py-2 text-sm`} value={specialty} onChange={e => setSpecialty(e.target.value as SpecialtyId)}>
          {SPECIALTIES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <Button tone="soft" onClick={() => onOpen(specialty)} className="shrink-0 !py-2">Gerar</Button>
      </div>
    </section>
  );
}

function QuestionsSection({ questions, busy, migrationPending, onCreateQuestion, onAnswer, onDeleteQuestion }: Props) {
  const [text, setText] = useState('');
  const [category, setCategory] = useState('Geral');
  const [specialty, setSpecialty] = useState<SpecialtyId>('obstetra');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [answering, setAnswering] = useState<string | null>(null);

  const pending = questions.filter(q => !q.doctor_answer);
  const answered = questions.filter(q => q.doctor_answer);
  const groups = SPECIALTIES.map(s => ({ spec: s, items: pending.filter(q => questionSpecialty(q.specialty) === s.id) })).filter(g => g.items.length);

  return (
    <Card>
      <SectionTitle icon={<HelpCircle className="w-5 h-5" />} title="Dúvidas" subtitle="Anotem quando surgir; entram no resumo da consulta." />
      <form
        className="space-y-3"
        onSubmit={async e => {
          e.preventDefault();
          if (text.trim() && (await onCreateQuestion(text.trim(), category, specialty))) setText('');
        }}
      >
        <div className="flex gap-2">
          <input aria-label="Dúvida" className={inputClass} placeholder="Ex.: Posso continuar o pilates?" value={text} onChange={e => setText(e.target.value)} />
          <Button type="submit" disabled={busy || !text.trim()} className="shrink-0">Anotar</Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {!migrationPending && (
            <select aria-label="Para quem" className={`${inputClass} !py-2 text-sm`} value={specialty} onChange={e => setSpecialty(e.target.value as SpecialtyId)}>
              {SPECIALTIES.map(s => <option key={s.id} value={s.id}>Para: {s.label}</option>)}
            </select>
          )}
          <select aria-label="Assunto" className={`${inputClass} !py-2 text-sm`} value={category} onChange={e => setCategory(e.target.value)}>
            {QUESTION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </form>

      <div className="mt-5 space-y-4">
        {groups.length === 0 && <EmptyState icon={<HelpCircle />} title="Nenhuma dúvida pendente">Quando surgir uma pergunta no dia a dia, anotem aqui para não esquecer na consulta.</EmptyState>}
        {groups.map(g => (
          <div key={g.spec.id} className="space-y-2">
            <h3 className="text-sm font-semibold text-ink-soft">{g.spec.label} ({g.items.length})</h3>
            {g.items.map(q => (
              <div key={q.id} className="rounded-2xl bg-surface-2/60 px-4 py-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink leading-snug">{q.questions_to_ask}</p>
                    <p className="text-xs text-ink-mute mt-0.5 flex flex-wrap items-center gap-x-1.5">
                      <span>{q.category}</span>·<span>{formatBR(q.created_at)}</span>
                      <AuthorBadge role={q.created_by} />
                    </p>
                  </div>
                  <button type="button" onClick={() => setAnswering(answering === q.id ? null : q.id)} aria-expanded={answering === q.id} className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium text-brand hover:bg-brand-soft">
                    Responder
                  </button>
                  <button onClick={() => onDeleteQuestion(q)} aria-label="Excluir dúvida" className="shrink-0 p-1 rounded-full text-ink-mute hover:text-alert hover:bg-alert-soft">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {answering === q.id && <form
                  className="flex gap-2"
                  onSubmit={async e => {
                    e.preventDefault();
                    const a = answers[q.id]?.trim();
                    if (a && (await onAnswer(q.id, a))) {
                      setAnswers(s => ({ ...s, [q.id]: '' }));
                      setAnswering(null);
                    }
                  }}
                >
                  <input autoFocus aria-label={`Resposta para "${q.questions_to_ask}"`} className={`${inputClass} !py-2 text-sm`} placeholder="O que o profissional respondeu..." value={answers[q.id] ?? ''} onChange={e => setAnswers(s => ({ ...s, [q.id]: e.target.value }))} />
                  <Button type="submit" tone="soft" disabled={busy || !answers[q.id]?.trim()} className="!px-4 !py-2 shrink-0">Salvar</Button>
                </form>}
              </div>
            ))}
          </div>
        ))}
        {answered.length > 0 && (
          <details>
            <summary className="cursor-pointer text-sm font-semibold text-ink-mute">Respondidas ({answered.length})</summary>
            <div className="space-y-3 mt-3">
              {answered.map(q => (
                <div key={q.id} className="rounded-2xl border border-transparent bg-surface-2/60 p-4 space-y-2">
                  <div className="flex justify-between gap-3">
                    <p className="font-semibold text-ink">{q.questions_to_ask}</p>
                    <button onClick={() => onDeleteQuestion(q)} aria-label="Excluir dúvida" className="p-1.5 rounded-full text-ink-mute hover:text-alert self-start">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="rounded-xl bg-ok-soft p-3 text-sm">
                    <span className="font-semibold text-ok flex items-center gap-1 text-xs"><ShieldCheck className="w-3.5 h-3.5" /> {specialtyOf(questionSpecialty(q.specialty)).label}</span>
                    <p className="text-ink mt-1">{q.doctor_answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </Card>
  );
}

function ReportScreen(props: Props & { request: ReportRequest; today: Date }) {
  const { request, today } = props;
  const consultation = props.consultations.find(c => c.id === request.consultationId) ?? null;
  const [from, setFrom] = useState(() => toISODate(defaultReportPeriod(props.consultations.filter(isConsultation), request.specialtyId, today).from));

  const report = useMemo(
    () =>
      buildReport({
        specialtyId: request.specialtyId,
        period: { from: parseLocalDate(from), to: today },
        today,
        dumDate: props.profile.dumDate,
        preWeightKg: props.profile.preWeightKg,
        heightCm: props.profile.heightCm,
        symptoms: props.symptoms,
        comments: props.comments,
        metrics: props.metrics,
        questions: props.questions,
        consultation,
      }),
    [request.specialtyId, from, today, props.profile, props.symptoms, props.comments, props.metrics, props.questions, consultation],
  );

  const ficha = buildFicha(props.profile, props.metrics, today);
  // A reta final (movimentos, contrações e plano de parto) interessa ao obstetra.
  const showLabor = request.specialtyId === 'obstetra' || request.specialtyId === 'outra';
  const plan = props.birthPlan ? toPlan(props.birthPlan.data) : null;
  const labor = showLabor
    ? laborReportLines(
        { kicks: props.kickSessions, contractions: props.contractions, plan: plan ? { progress: planProgress(plan), discussed: plan.discussedWithDoctor } : null },
        report.period,
      )
    : [];

  const copy = async () => {
    const text = reportToText(report, fichaToText(ficha)) + (labor.length ? `\n\nRETA FINAL\n${labor.map(l => `- ${l}`).join('\n')}` : '');
    try {
      await navigator.clipboard.writeText(text);
      props.onNotify('Resumo copiado. Cole no WhatsApp ou no e-mail do profissional.');
    } catch {
      props.onNotify('Não foi possível copiar automaticamente. Use Imprimir / PDF.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Button tone="ghost" onClick={() => props.onOpenReport(null)}>
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button tone="soft" onClick={copy}>
            <ClipboardCopy className="w-4 h-4" /> Copiar texto
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> Imprimir / PDF
          </Button>
        </div>
      </div>
      <div className="no-print flex flex-wrap items-center gap-3 text-sm text-ink-soft">
        <label htmlFor="inicio-periodo">Analisar a partir de</label>
        <input id="inicio-periodo" type="date" max={toISODate(today)} className={`${inputClass} !w-auto !py-1.5`} value={from} onChange={e => e.target.value && setFrom(e.target.value)} />
        <span className="text-ink-mute">(padrão: desde a última consulta desta especialidade, ou 30 dias)</span>
      </div>
      <ReportDocument report={report} ficha={ficha} labor={labor} />
    </div>
  );
}

function ReportDocument({ report: r, ficha, labor }: { report: ConsultationReport; ficha: FichaItem[]; labor: string[] }) {
  const kg = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`;
  const signed = (n: number) => `${n >= 0 ? '+' : ''}${kg(n)}`;
  const when = r.consultation ? parseTimestamp(r.consultation.scheduled_at) : null;

  return (
    <article className="print-area rounded-[28px] bg-surface shadow-soft p-6 md:p-8 space-y-7 print:border-0 print:p-0">
      <header className="space-y-3 border-b border-line pb-5">
        <p className="text-sm font-semibold text-brand">Tumtum · resumo para consulta</p>
        <h2 className="text-2xl font-semibold text-ink">{r.specialty.label}</h2>
        {when && (
          <p className="text-ink-soft">
            {when.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} às {when.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            {r.consultation?.professional_name && ` · ${r.consultation.professional_name}`}
          </p>
        )}
      </header>

      {/* Ficha da gestante: o mesmo cabeçalho de prontuário em todo resumo. */}
      <section className="space-y-3 rounded-2xl bg-surface-2 p-4 break-inside-avoid print:bg-transparent print:border print:border-line">
        <h3 className="text-sm font-semibold text-ink-soft">Ficha da gestante</h3>
        <FichaGrid items={ficha} compact />
        <p className="text-xs text-ink-mute border-t border-line pt-2">
          Período analisado neste resumo: semanas {r.weekFrom} a {r.weekTo} ({formatBR(toISODate(r.period.from))} a {formatBR(toISODate(r.period.to))})
        </p>
      </section>

      {r.insights.length > 0 && (
        <ReportSection title="Pontos de atenção">
          <InsightList insights={r.insights} />
        </ReportSection>
      )}

      {r.specialty.symptomCategories !== 'todas' && r.specialty.symptomCategories.length === 0 ? null : (
        <ReportSection title="Sintomas no período" note={r.hiddenSymptomCount > 0 ? `${r.hiddenSymptomCount} ${r.hiddenSymptomCount === 1 ? 'sintoma de outra área foi omitido' : 'sintomas de outras áreas foram omitidos'} neste resumo.` : undefined}>
          {r.symptoms.length === 0 ? (
            <p className="text-ink-soft">Nenhum sintoma registrado no período para esta especialidade.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="text-left text-xs text-ink-mute border-b border-line">
                    <th className="py-2 pr-2 font-semibold">Sintoma</th>
                    <th className="py-2 px-2 font-semibold text-right">Vezes</th>
                    <th className="py-2 px-2 font-semibold text-right">Média</th>
                    <th className="py-2 px-2 font-semibold text-right">Máx.</th>
                    <th className="py-2 px-2 font-semibold">Tendência</th>
                    <th className="py-2 pl-2 font-semibold">Quando</th>
                  </tr>
                </thead>
                <tbody>
                  {r.symptoms.map(s => (
                    <tr key={s.key} className="border-b border-line align-top">
                      <td className="py-2.5 pr-2">
                        <span className="font-semibold text-ink">{s.name}</span>
                        <span className="block text-xs text-ink-mute">{s.category}</span>
                        {s.care.length > 0 && <span className="block text-xs text-ink-soft mt-1">Cuidados: {s.care.slice(-2).map(c => c.comment_text).join('; ')}</span>}
                      </td>
                      <td className="py-2.5 px-2 text-right tabular">{s.count}</td>
                      <td className="py-2.5 px-2 text-right tabular">{s.avgIntensity.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</td>
                      <td className="py-2.5 px-2 text-right tabular">{s.maxIntensity}</td>
                      <td className="py-2.5 px-2">{s.trend ? TREND_LABEL[s.trend] : '—'}</td>
                      <td className="py-2.5 pl-2">{s.timeOfDay.dominant && s.timeOfDay.known >= 2 ? timeOfDayLabel(s.timeOfDay.dominant) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-ink-mute mt-2">Intensidade de 1 (muito leve) a 5 (muito forte), registrada pelo casal.</p>
            </div>
          )}
        </ReportSection>
      )}

      {r.weight && (
        <ReportSection title="Peso">
          <ul className="space-y-1.5 text-ink">
            <li>
              {kg(r.weight.first.kg)} (sem {r.weight.first.week}) → <strong>{kg(r.weight.last.kg)}</strong> (sem {r.weight.last.week}): <strong>{signed(r.weight.periodDelta)}</strong> no período
            </li>
            {r.weight.totalGain !== null && (
              <li>
                Ganho desde antes da gravidez: <strong>{signed(r.weight.totalGain)}</strong>
                {r.weight.bmiClass && r.weight.expected && r.weight.status && (
                  <> · {GAIN_STATUS_LABEL[r.weight.status]} esperada para {BMI_LABEL[r.weight.bmiClass].toLowerCase()} ({r.weight.expected[0].toLocaleString('pt-BR', { maximumFractionDigits: 1 })} a {r.weight.expected[1].toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg)</>
                )}
              </li>
            )}
          </ul>
        </ReportSection>
      )}

      {r.bloodPressure && (
        <ReportSection title="Pressão arterial" note={r.bloodPressure.highCount ? `${r.bloodPressure.highCount} ${r.bloodPressure.highCount === 1 ? 'medição' : 'medições'} em 140/90 ou mais.` : 'Nenhuma medição em 140/90 ou mais.'}>
          <div className="flex flex-wrap gap-2">
            {r.bloodPressure.readings.map((b, i) => (
              <Pill key={i} tone={b.high ? 'alert' : 'neutral'}>
                {formatBR(b.date)} · {b.systolic}/{b.diastolic}
              </Pill>
            ))}
          </div>
        </ReportSection>
      )}

      {labor.length > 0 && (
        <ReportSection title="Reta final">
          <ul className="space-y-1.5 text-ink">{labor.map(l => <li key={l}>{l}</li>)}</ul>
        </ReportSection>
      )}

      <ReportSection title="Dúvidas do casal">
        {r.pendingQuestions.length === 0 ? (
          <p className="text-ink-soft">Nenhuma dúvida anotada para esta especialidade.</p>
        ) : (
          <ol className="space-y-3">
            {r.pendingQuestions.map(q => (
              <li key={q.id} className="flex gap-3">
                <span className="w-5 h-5 mt-0.5 rounded border-2 border-ink-mute shrink-0" aria-hidden />
                <div className="flex-1">
                  <p className="text-ink font-semibold">{q.questions_to_ask}</p>
                  <p className="text-xs text-ink-mute">{q.category} · anotada por {q.created_by === 'pai' ? 'pai' : 'mãe'} em {formatBR(q.created_at)}</p>
                  <div className="hidden print:block border-b border-ink-mute/40 h-6" />
                </div>
              </li>
            ))}
          </ol>
        )}
      </ReportSection>

      {r.answeredQuestions.length > 0 && (
        <ReportSection title="Respondidas no período">
          <ul className="space-y-2 text-sm">
            {r.answeredQuestions.map(q => (
              <li key={q.id}>
                <span className="font-semibold text-ink">{q.questions_to_ask}</span>
                <span className="block text-ink-soft">{q.doctor_answer}</span>
              </li>
            ))}
          </ul>
        </ReportSection>
      )}

      <footer className="text-xs text-ink-mute border-t border-line pt-4">
        Registros feitos pelo casal no app Tumtum. Não substituem a avaliação profissional.
      </footer>
    </article>
  );
}

function ReportSection({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 break-inside-avoid">
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {children}
      {note && <p className="text-xs text-ink-mute">{note}</p>}
    </section>
  );
}
