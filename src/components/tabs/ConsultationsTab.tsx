import { useContext, useMemo, useState } from 'react';
import { ArrowLeft, Check, ClipboardCopy, MessageCircleQuestion, Plus, Printer, Route, ShieldCheck, Trash2 } from 'lucide-react';
import { SPECIALTIES, questionSpecialty, type SpecialtyId } from '../../data/specialties';
import { formatBR, parseLocalDate, parseTimestamp, toISODate, weekOfDay } from '../../lib/dates';
import { REPORT_PARTS, TREND_LABEL, buildReport, presetStart, reportToText, type ConsultationReport, type PeriodPreset, type ReportPart } from '../../lib/report';
import { timeOfDayLabel } from '../../lib/symptoms';
import { buildFicha, fichaToText, type FichaItem } from '../../lib/ficha';
import { laborReportLines } from '../../lib/labor';
import { planProgress, toPlan } from '../../lib/birthPlan';
import { FichaGrid } from '../FichaBar';
import { BMI_LABEL, GAIN_STATUS_LABEL } from '../../lib/weightGain';
import { PLAN_ITEMS } from '../../content/prenatalPlan';
import { APPOINTMENT_KINDS, isConsultation, kindOf } from '../../lib/appointments';
import type { AppointmentKind, Assignee, BirthPlanRecord, Contraction, KickSession, Consultation, HealthMetric, PartnerComment, PregnancyProfile, QuestionItem, SymptomItem } from '../../types';
import AuthorBadge from '../AuthorBadge';
import AddressInput from '../AddressInput';
import WhoPicker from '../WhoPicker';
import AppointmentIcon from '../AppointmentIcon';
import { AttendeesReady, PeopleContext, TimedRemindersReady } from '../../lib/people';
import { JourneyContext } from '../../lib/journeyContext';
import { linkableItems, suggestPlanItem, type JourneyItem } from '../../lib/journeyPlan';
import { InsightList } from '../InsightList';
import { inputClass } from '../styles';
import { Button, Chip, Field, Pill } from '../ui';

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
  /** Quem vai (migração 016); null quando o app ainda não pergunta. */
  attendees: Assignee | null;
  /** Aviso a mais antes do horário, em minutos (migração 018); undefined quando o app ainda não pergunta. */
  remindBefore?: number | null;
}

/** Aviso a mais antes do horário do agendamento (minutos). */
const BEFORE_OPTIONS: Array<{ minutes: number | null; text: string }> = [
  { minutes: null, text: 'Só os de sempre' },
  { minutes: 30, text: '30 min antes' },
  { minutes: 60, text: '1 h antes' },
  { minutes: 120, text: '2 h antes' },
  { minutes: 1440, text: '1 dia antes' },
];

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
  /** Abre os detalhes da consulta (com editar e excluir). */
  onOpenConsultation: (c: Consultation) => void;
  /** Leva para Agenda → Próximos, onde se agenda. */
  onOpenAgenda: () => void;
  onCreateQuestion: (text: string, category: string, specialty: SpecialtyId) => Promise<boolean>;
  onAnswer: (id: string, answer: string) => Promise<boolean>;
  onDeleteQuestion: (q: QuestionItem) => void;
  onNotify: (text: string) => void;
  kickSessions: KickSession[];
  contractions: Contraction[];
  birthPlan: BirthPlanRecord | null;
}


/** Preparar a consulta (ou o relatório dos registros): as dúvidas para levar e o relatório, com período e partes à escolha. */
export default function ConsultationsTab(props: Props) {
  const today = parseLocalDate(toISODate(new Date()));
  if (!props.report) return null;
  return <ReportScreen {...props} request={props.report} today={today} />;
}

/** Agendar a partir da jornada: tipo, nome, item e uma data dentro da janela já vêm preenchidos. */
export interface SchedulePreset {
  kind: AppointmentKind;
  title: string;
  /** Item da jornada; sem ele (ex.: consulta de rotina), o app encaixa sozinho. */
  planItem?: string;
  date: string;
}

export function ScheduleForm({ busy, onCreate, initialDate, startOpen = false, onClose, initial, preset }: { busy: boolean; onCreate: (c: NewConsultation) => Promise<boolean>; initialDate?: string; startOpen?: boolean; onClose?: () => void; initial?: Consultation; preset?: SchedulePreset }) {
  const [open, setOpenState] = useState(startOpen || !!initial || !!preset);
  const setOpen = (value: boolean) => {
    setOpenState(value);
    if (!value) onClose?.();
  };
  const at = initial ? parseTimestamp(initial.scheduled_at) : null;
  const [kind, setKind] = useState<AppointmentKind>(initial ? kindOf(initial) : (preset?.kind ?? 'consulta'));
  const [title, setTitle] = useState(initial?.title ?? (preset && preset.kind !== 'consulta' ? preset.title : ''));
  // Item da jornada: undefined = o app encaixa sozinho (pelo nome e pela data); null = fora da jornada.
  const [planItem, setPlanItem] = useState<string | null | undefined>(initial ? (initial.plan_item ?? null) : preset?.planItem);
  const [date, setDate] = useState(at ? toISODate(at) : (preset?.date ?? initialDate ?? ''));
  const [time, setTime] = useState(at ? at.toTimeString().slice(0, 5) : '09:00');
  const [specialty, setSpecialty] = useState<SpecialtyId>(initial && kindOf(initial) === 'consulta' ? questionSpecialty(initial.specialty) : 'obstetra');
  const [professional, setProfessional] = useState(initial?.professional_name ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const consulta = kind === 'consulta';
  const attendeesReady = useContext(AttendeesReady);
  const timedReady = useContext(TimedRemindersReady);
  const [before, setBefore] = useState<number | null>(initial?.remind_before ?? null);
  const people = useContext(PeopleContext);
  const askWho = attendeesReady && people.length > 1;
  // Quem vai: em consulta e ultrassom, os dois; em exame e vacina, a mãe (dá para trocar).
  const [whoPicked, setWho] = useState<Assignee | null>(initial?.attendees ?? null);
  const who: Assignee = whoPicked ?? (kind === 'consulta' || kind === 'ultrassom' ? 'casal' : 'mae');
  const journey = useContext(JourneyContext);
  // Consultas só encaixam na jornada quando são do pré-natal (obstetra).
  const fitsJourney = !!journey && (!consulta || specialty === 'obstetra');
  const suggested = fitsJourney && planItem === undefined ? suggestPlanItem({ kind, title, date, id: initial?.id }, { ...journey, now: new Date() }) : null;
  const linked = planItem === undefined ? (suggested?.id ?? null) : planItem;

  if (!open) {
    return (
      <Button tone="soft" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" /> Agendar
      </Button>
    );
  }

  return (
    <form
      className="rounded-[24px] bg-surface/80 p-4 space-y-5"
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
          planItem: fitsJourney ? linked : consulta ? null : (planItem ?? null),
          attendees: askWho ? who : (initial?.attendees ?? null),
          ...(timedReady ? { remindBefore: before } : {}),
        });
        if (ok) {
          setOpen(false);
          setDate('');
          setTitle('');
          setPlanItem(undefined);
          setProfessional('');
          setLocation('');
          setWho(null);
          setBefore(null);
        }
      }}
    >
      <FormPart title="O que é">
        <div role="group" aria-label="Tipo de agendamento" className="grid grid-cols-4 gap-1.5">
          {APPOINTMENT_KINDS.map(k => (
            <button
              key={k.id}
              type="button"
              aria-pressed={kind === k.id}
              onClick={() => {
                setKind(k.id);
                setTitle('');
                setPlanItem(undefined);
              }}
              className={`flex flex-col items-center gap-1 rounded-2xl px-1 py-2.5 text-[12px] font-bold transition ${kind === k.id ? 'bg-brand text-on-accent shadow-soft' : 'bg-surface-2 text-ink-soft hover:text-ink'}`}
            >
              <AppointmentIcon kind={k.id} className="w-5 h-5" />
              {k.label}
            </button>
          ))}
        </div>
        {consulta ? (
          <Field label="Especialidade" htmlFor="esp">
            <select id="esp" className={inputClass} value={specialty} onChange={e => setSpecialty(e.target.value as SpecialtyId)}>
              {SPECIALTIES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </Field>
        ) : (
          <div className="space-y-2">
            <label htmlFor="nome-agendamento" className="block text-sm font-semibold text-ink-soft">
              {kind === 'vacina' ? 'Qual vacina?' : kind === 'ultrassom' ? 'Qual ultrassom?' : 'Qual exame?'}
            </label>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sugestões da jornada">
              {suggestionsFor(kind).map(i => (
                <Chip
                  key={i.id}
                  active={linked === i.id}
                  onClick={() => {
                    setTitle(i.title);
                    setPlanItem(i.id);
                  }}
                >
                  {i.short}
                </Chip>
              ))}
            </div>
            <input
              id="nome-agendamento"
              className={inputClass}
              placeholder="Toque numa sugestão acima ou escreva o nome"
              value={title}
              maxLength={120}
              onChange={e => {
                setTitle(e.target.value);
                setPlanItem(undefined);
              }}
            />
          </div>
        )}
      </FormPart>

      <FormPart title="Quando">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data" htmlFor="data-consulta">
            <input id="data-consulta" type="date" required className={inputClass} value={date} onChange={e => setDate(e.target.value)} />
          </Field>
          <Field label="Hora" htmlFor="hora-consulta">
            <input id="hora-consulta" type="time" className={inputClass} value={time} onChange={e => setTime(e.target.value)} />
          </Field>
        </div>
        {journey && date && <p className="text-xs font-semibold text-brand-strong">Semana {weekOfDay(journey.dumDate, date)} da gestação</p>}
        {fitsJourney && journey && (
          <JourneyLink
            value={linked}
            auto={planItem === undefined}
            options={linkableItems(journey.items, kind).filter(i => i.id === linked || !journey.done.has(i.id))}
            onChange={setPlanItem}
          />
        )}
      </FormPart>

      <FormPart title="Onde (opcional)">
        <Field label={consulta ? 'Profissional (opcional)' : 'Laboratório ou clínica (opcional)'} htmlFor="prof">
          <input id="prof" className={inputClass} placeholder={consulta ? 'Ex.: Dra. Ana' : 'Ex.: Laboratório Vida'} value={professional} onChange={e => setProfessional(e.target.value)} />
        </Field>
        <Field label="Endereço (opcional)" htmlFor="local" hint="Escolham um dos resultados da busca para abrir o caminho no Maps, Waze ou Uber.">
          <AddressInput id="local" placeholder="Busque pelo nome do lugar ou pela rua" value={location} onChange={setLocation} />
        </Field>
      </FormPart>

      {(askWho || timedReady) && (
        <FormPart title={askWho && timedReady ? 'Quem vai e lembrete' : askWho ? 'Quem vai' : 'Lembrete'}>
          {askWho && (
            <div className="space-y-1.5">
              <WhoPicker label="Quem vai" value={who} onChange={setWho} />
              <p className="text-xs text-ink-mute">Quem for chamado recebe um aviso no celular.</p>
            </div>
          )}
          {timedReady && (
            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Aviso a mais">
                {BEFORE_OPTIONS.map(o => (
                  <button
                    key={o.text}
                    type="button"
                    aria-pressed={before === o.minutes}
                    onClick={() => setBefore(o.minutes)}
                    className={`rounded-full px-3 py-1.5 text-[13px] font-bold transition ${before === o.minutes ? 'bg-brand text-on-accent shadow-soft' : 'bg-surface-2 text-ink-soft hover:text-ink'}`}
                  >
                    {o.text}
                  </button>
                ))}
              </div>
              <p className="text-xs text-ink-mute">Vocês sempre recebem aviso na véspera e na manhã do dia{before ? `, e mais um ${BEFORE_OPTIONS.find(o => o.minutes === before)!.text.toLowerCase()}` : ''}.</p>
            </div>
          )}
        </FormPart>
      )}

      <div className="flex gap-2 justify-end pt-1">
        <Button tone="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
        <Button type="submit" disabled={busy || !date || (!consulta && !title.trim())}>{initial ? 'Salvar alterações' : 'Agendar'}</Button>
      </div>
    </form>
  );
}

/** Uma parte do formulário de agendamento, com um título curto em cima. */
function FormPart({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3 border-t border-line pt-4 first:border-t-0 first:pt-0">
      <legend className="float-left w-full mb-3 text-[11px] font-extrabold uppercase tracking-wide text-ink-mute">{title}</legend>
      <div className="clear-left space-y-3">{children}</div>
    </fieldset>
  );
}

/** "Na jornada": o item que este agendamento cumpre, encaixado sozinho ou escolhido. */
function JourneyLink({ value, auto, options, onChange }: { value: string | null; auto: boolean; options: JourneyItem[]; onChange: (id: string | null) => void }) {
  const current = options.find(i => i.id === value);
  return (
    <div className="space-y-1.5 rounded-2xl border border-brand/25 bg-brand-soft/40 p-3">
      <label htmlFor="item-jornada" className="flex items-center gap-1.5 text-sm font-semibold text-ink-soft">
        <Route className="w-4 h-4 text-brand" aria-hidden /> Na jornada do pré-natal
      </label>
      <select id="item-jornada" className={inputClass} value={value ?? ''} onChange={e => onChange(e.target.value || null)}>
        <option value="">Não faz parte da jornada</option>
        {options.map(i => (
          <option key={i.id} value={i.id}>
            {i.title}
            {i.anytime ? '' : ` · sem. ${i.from === i.to ? i.from : `${i.from}–${i.to}`}`}
          </option>
        ))}
      </select>
      <p className="text-xs text-ink-mute" role="status">
        {current
          ? `${auto ? 'Encaixado pelo nome e pela data. ' : ''}Fica como agendado na jornada e, quando a data passar, como feito.`
          : 'Se for um exame, ultrassom ou vacina da jornada, escolha aqui para acompanhar o planejado e o realizado.'}
      </p>
    </div>
  );
}

/** As dúvidas para levar a esta especialidade: anotar, responder depois da consulta e apagar. */
const QUESTION_IDEAS = ['Que exames vêm a seguir?', 'Posso fazer exercício?', 'O que é normal sentir agora?'];

function QuestionsSection({ questions, specialtyId, busy, onCreateQuestion, onAnswer, onDeleteQuestion }: Props & { specialtyId: SpecialtyId }) {
  const [text, setText] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [answering, setAnswering] = useState<string | null>(null);
  const mine = questions.filter(q => questionSpecialty(q.specialty) === specialtyId);
  const pending = mine.filter(q => !q.doctor_answer);
  const answered = mine.filter(q => q.doctor_answer);

  return (
    // O coração da preparação: em destaque, como a listinha que vai no bolso para a consulta.
    <section aria-labelledby="duvidas-titulo" className="no-print rounded-[28px] bg-gradient-to-br from-azul-soft via-lilas-soft/60 to-rosa-soft/50 p-4 space-y-3">
      <div className="flex items-start gap-3 px-1">
        <span className="w-10 h-10 rounded-2xl bg-surface/80 text-azul-strong flex items-center justify-center shrink-0">
          <MessageCircleQuestion className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <h2 id="duvidas-titulo" className="font-display text-[1.3rem] leading-tight text-ink">
            Dúvidas para levar
          </h2>
          <p className="text-[13px] text-ink-soft">{pending.length ? `${pending.length} para perguntar. Elas vão no resumo, para não esquecer na hora.` : 'Anotem quando surgir: elas vão no resumo, para não esquecer na hora.'}</p>
        </div>
      </div>
      <form
        className="flex items-center gap-2 rounded-full bg-surface pl-4 pr-1.5 py-1.5"
        onSubmit={async e => {
          e.preventDefault();
          if (text.trim() && (await onCreateQuestion(text.trim(), 'Geral', specialtyId))) setText('');
        }}
      >
        <input aria-label="Dúvida" className="flex-1 min-w-0 bg-transparent text-[15px] text-ink placeholder:text-ink-mute outline-none py-1.5" placeholder="Ex.: Posso continuar o pilates?" value={text} onChange={e => setText(e.target.value)} />
        <button type="submit" disabled={busy || !text.trim()} className="shrink-0 rounded-full bg-azul-strong text-on-accent px-4 py-2 text-[13.5px] font-bold disabled:opacity-40">
          Anotar
        </button>
      </form>
      {pending.length === 0 && (
        <div className="flex flex-wrap gap-1.5 px-1" role="group" aria-label="Sugestões para perguntar">
          {QUESTION_IDEAS.map(i => (
            <button key={i} type="button" disabled={busy} onClick={() => onCreateQuestion(i, 'Geral', specialtyId)} className="rounded-full bg-surface/70 px-3 py-1.5 text-[12.5px] font-semibold text-ink-soft">
              + {i}
            </button>
          ))}
        </div>
      )}
      {pending.length > 0 && (
        <ol className="space-y-1.5">
          {pending.map((q, n) => (
            <li key={q.id} className="rounded-2xl bg-surface/90 px-3 py-2.5 space-y-2">
              <div className="flex items-start gap-2.5">
                <span className="w-6 h-6 mt-0.5 rounded-full bg-azul-soft text-azul-strong text-[12px] font-extrabold flex items-center justify-center shrink-0 tabular" aria-hidden>
                  {n + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink leading-snug">{q.questions_to_ask}</p>
                  <p className="text-xs text-ink-mute mt-0.5 flex flex-wrap items-center gap-x-1.5">
                    <span>{formatBR(q.created_at)}</span>
                    <AuthorBadge role={q.created_by} />
                  </p>
                </div>
                <button type="button" onClick={() => setAnswering(answering === q.id ? null : q.id)} aria-expanded={answering === q.id} className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold text-brand-strong hover:bg-brand-soft">
                  Responder
                </button>
                <button onClick={() => onDeleteQuestion(q)} aria-label="Excluir dúvida" className="shrink-0 p-1 rounded-full text-ink-mute hover:text-alert hover:bg-alert-soft">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {answering === q.id && (
                <form
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
                  <Button type="submit" tone="soft" disabled={busy || !answers[q.id]?.trim()} className="!px-4 !py-2 shrink-0">
                    Salvar
                  </Button>
                </form>
              )}
            </li>
          ))}
        </ol>
      )}
      {answered.length > 0 && (
        <details className="px-1">
          <summary className="cursor-pointer text-sm font-semibold text-ink-mute">Respondidas ({answered.length})</summary>
          <ul className="space-y-2 mt-2">
            {answered.map(q => (
              <li key={q.id} className="rounded-2xl bg-ok-soft/60 p-3 space-y-1">
                <div className="flex justify-between gap-3">
                  <p className="font-semibold text-ink text-sm">{q.questions_to_ask}</p>
                  <button onClick={() => onDeleteQuestion(q)} aria-label="Excluir dúvida" className="p-1 rounded-full text-ink-mute hover:text-alert self-start">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-ink flex gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-ok shrink-0 mt-0.5" /> {q.doctor_answer}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function ReportScreen(props: Props & { request: ReportRequest; today: Date }) {
  const { request, today } = props;
  const consultation = props.consultations.find(c => c.id === request.consultationId) ?? null;
  const presetOpts = { consultations: props.consultations.filter(isConsultation), specialtyId: request.specialtyId, today, dumDate: props.profile.dumDate };
  const hasPrevious = presetOpts.consultations.some(c => c.specialty === request.specialtyId && parseTimestamp(c.scheduled_at) < today);
  // Período e partes: nem toda consulta precisa de tudo, nem do mesmo intervalo.
  // O período é sempre "de–até"; os atalhos só preenchem as duas datas.
  const todayIso = toISODate(today);
  const [from, setFrom] = useState(() => toISODate(presetStart(hasPrevious ? 'ultima' : '30d', presetOpts)));
  const [to, setTo] = useState(todayIso);
  const presets = PERIOD_PRESETS.filter(o => o.id !== 'ultima' || hasPrevious).map(o => ({ ...o, from: toISODate(presetStart(o.id, presetOpts)) }));
  const activePreset = to === todayIso ? presets.find(o => o.from === from)?.id : undefined;
  const [parts, setParts] = useState<Set<ReportPart>>(() => new Set(REPORT_PARTS.map(p => p.id)));
  const togglePart = (id: ReportPart) =>
    setParts(cur => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const report = useMemo(
    () =>
      buildReport({
        specialtyId: request.specialtyId,
        period: { from: parseLocalDate(from), to: parseLocalDate(to) },
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
    [request.specialtyId, from, to, today, props.profile, props.symptoms, props.comments, props.metrics, props.questions, consultation],
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
    const text = reportToText(report, fichaToText(ficha), shownParts) + (labor.length && shownParts.has('retafinal') ? `\n\nRETA FINAL\n${labor.map(l => `- ${l}`).join('\n')}` : '');
    try {
      await navigator.clipboard.writeText(text);
      props.onNotify('Resumo copiado. Cole no WhatsApp ou no e-mail do profissional.');
    } catch {
      props.onNotify('Não foi possível copiar automaticamente. Use Imprimir / PDF.');
    }
  };

  // Quanto de cada parte há no período: o que está vazio aparece apagado (não enche o papel à toa).
  const metricsIn = props.metrics.filter(m => m.recorded_at.slice(0, 10) >= from && m.recorded_at.slice(0, 10) <= to);
  const partCount = (id: ReportPart): number | null =>
    id === 'dados' ? null
    : id === 'atencao' ? report.insights.length
    : id === 'sintomas' ? report.symptoms.reduce((n, s) => n + s.count, 0)
    : id === 'peso' ? (report.weight ? metricsIn.filter(m => m.weight_kg !== null).length : 0)
    : id === 'pressao' ? (report.bloodPressure?.readings.length ?? 0)
    : id === 'duvidas' ? report.pendingQuestions.length + report.answeredQuestions.length
    : labor.length;
  const shownParts = new Set([...parts].filter(id => partCount(id) !== 0));

  const when = consultation ? parseTimestamp(consultation.scheduled_at) : null;
  return (
    <div className="space-y-5">
      <div className="no-print space-y-3">
        <button type="button" onClick={() => props.onOpenReport(null)} className="inline-flex items-center gap-1 text-sm font-bold text-ink-soft">
          <ArrowLeft className="w-4 h-4" /> Cuidados
        </button>
        <div className="px-1">
          <p className="text-[12px] font-extrabold uppercase tracking-wide text-verde-strong">{consultation ? 'Preparar a consulta' : 'Relatório dos registros'}</p>
          <h1 className="font-display text-[1.5rem] leading-tight text-ink">{consultation ? report.specialty.label : 'O acompanhamento de vocês'}</h1>
          {when && (
            <p className="text-[14px] text-ink-soft first-letter:uppercase">
              {when.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} às {when.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              {consultation?.professional_name && ` · ${consultation.professional_name}`}
            </p>
          )}
        </div>
      </div>

      {consultation && <QuestionsSection {...props} specialtyId={request.specialtyId} />}

      <section aria-label="O resumo" className="space-y-3">
        <div className="no-print px-1 space-y-2">
          <h2 className="text-[1.15rem] text-ink">{consultation ? 'O resumo' : 'O que levar'}</h2>
          <div className="rounded-[24px] bg-surface/80 p-4 space-y-4">
            <div className="space-y-2.5">
              <p className="text-[12px] font-extrabold uppercase tracking-wide text-ink-mute">Período</p>
              <div className="grid grid-cols-2 gap-2">
                <DateField id="inicio-periodo" label="De" value={from} min={props.profile.dumDate} max={to} onChange={setFrom} />
                <DateField id="fim-periodo" label="Até" value={to} min={from} max={todayIso} onChange={setTo} />
              </div>
              <div role="group" aria-label="Período do relatório" className="-mx-4 px-4 flex gap-1.5 overflow-x-auto no-scrollbar">
                {presets.map(o => (
                  <OptionChip
                    key={o.id}
                    on={activePreset === o.id}
                    onClick={() => {
                      setFrom(o.from);
                      setTo(todayIso);
                    }}
                  >
                    {o.label}
                  </OptionChip>
                ))}
              </div>
              <p className="text-[12.5px] text-ink-mute">
                Semanas {report.weekFrom} a {report.weekTo} · {periodSummary(report, metricsIn)}
              </p>
            </div>
            <div className="space-y-2.5">
              <p className="text-[12px] font-extrabold uppercase tracking-wide text-ink-mute">O que entra</p>
              <ul role="group" aria-label="O que entra no relatório" className="grid grid-cols-2 gap-1.5">
                {REPORT_PARTS.filter(p => p.id !== 'retafinal' || labor.length > 0).map(p => {
                  const n = partCount(p.id);
                  const empty = n === 0;
                  return (
                    <li key={p.id}>
                      <PartToggle on={parts.has(p.id) && !empty} disabled={empty} label={p.label} hint={empty ? 'Nada no período' : n === null ? 'Sempre igual' : `${n} no período`} onClick={() => togglePart(p.id)} />
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button onClick={() => window.print()}>
              <Printer className="w-4 h-4" /> Imprimir / PDF
            </Button>
            <Button tone="soft" onClick={copy}>
              <ClipboardCopy className="w-4 h-4" /> Copiar texto
            </Button>
          </div>
        </div>
        <ReportDocument report={report} ficha={ficha} labor={labor} parts={shownParts} />
      </section>
    </div>
  );
}

const PERIOD_PRESETS: Array<{ id: PeriodPreset; label: string }> = [
  { id: 'ultima', label: 'Desde a última consulta' },
  { id: '30d', label: 'Últimos 30 dias' },
  { id: 'trimestre', label: 'Este trimestre' },
  { id: 'tudo', label: 'Toda a gestação' },
];

/** "3 sintomas · 2 medidas · 1 dúvida": o que o período tem, numa linha. */
function periodSummary(r: ConsultationReport, metrics: HealthMetric[]) {
  const n = (v: number, one: string, many: string) => (v ? `${v} ${v === 1 ? one : many}` : '');
  const parts = [n(r.symptoms.reduce((t, s) => t + s.count, 0), 'sintoma', 'sintomas'), n(metrics.length, 'medida', 'medidas'), n(r.pendingQuestions.length, 'dúvida', 'dúvidas')].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'nenhum registro no período';
}

function DateField({ id, label, value, min, max, onChange }: { id: string; label: string; value: string; min?: string; max?: string; onChange: (v: string) => void }) {
  return (
    <label htmlFor={id} className="block rounded-2xl bg-surface-2/70 px-3 py-2">
      <span className="block text-[11.5px] font-bold text-ink-mute">{label}</span>
      <input id={id} type="date" value={value} min={min} max={max} onChange={e => e.target.value && onChange(e.target.value)} className="w-full bg-transparent text-[15px] font-semibold text-ink outline-none" />
    </label>
  );
}

/** Uma parte do relatório: marcada entra no papel e no texto; sem nada no período, fica apagada. */
function PartToggle({ on, disabled, label, hint, onClick }: { on: boolean; disabled: boolean; label: string; hint: string; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={on} disabled={disabled} onClick={onClick} className={`w-full flex items-center gap-2 rounded-2xl px-2.5 py-2 text-left transition disabled:opacity-45 ${on ? 'bg-verde-soft' : 'bg-surface-2/60'}`}>
      <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${on ? 'bg-verde-strong text-on-accent' : 'border-2 border-line'}`} aria-hidden>
        {on && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
      </span>
      <span className="min-w-0">
        <span className={`block text-[13.5px] leading-tight ${on ? 'font-bold text-ink' : 'font-semibold text-ink-soft'}`}>{label}</span>
        <span className="block text-[11.5px] text-ink-mute truncate">{hint}</span>
      </span>
    </button>
  );
}

function OptionChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={`shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] transition ${on ? 'bg-verde-strong text-on-accent font-bold' : 'bg-surface-2/70 text-ink-soft font-semibold'}`}>
      {children}
    </button>
  );
}

function ReportDocument({ report: r, ficha, labor, parts }: { report: ConsultationReport; ficha: FichaItem[]; labor: string[]; parts: ReadonlySet<ReportPart> }) {
  const kg = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`;
  const signed = (n: number) => `${n >= 0 ? '+' : ''}${kg(n)}`;
  const when = r.consultation ? parseTimestamp(r.consultation.scheduled_at) : null;

  return (
    <article className="print-area rounded-[28px] bg-surface p-6 md:p-8 space-y-7 print:space-y-4 print:border-0 print:p-0 print:text-[12px]">
      <header className="space-y-3 border-b border-line pb-5">
        <p className="text-sm font-semibold text-brand">Tumtum · {r.consultation ? 'resumo para consulta' : 'relatório dos registros'}</p>
        <h2 className="text-2xl font-semibold text-ink">{r.consultation ? r.specialty.label : 'Acompanhamento da gestação'}</h2>
        {when && (
          <p className="text-ink-soft">
            {when.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} às {when.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            {r.consultation?.professional_name && ` · ${r.consultation.professional_name}`}
          </p>
        )}
      </header>

      {/* Dados da gestante: o mesmo cabeçalho de prontuário em todo resumo. */}
      <section className="space-y-3 print:space-y-1.5 rounded-2xl bg-surface-2 p-4 print:p-2.5 break-inside-avoid print:bg-transparent print:border print:border-line">
        {parts.has('dados') && (
          <>
            <h3 className="text-sm font-semibold text-ink-soft">Dados da gestante</h3>
            <FichaGrid items={ficha} compact />
          </>
        )}
        <p className={`text-xs text-ink-mute ${parts.has('dados') ? 'border-t border-line pt-2' : ''}`}>
          Período analisado neste resumo: semanas {r.weekFrom} a {r.weekTo} ({formatBR(toISODate(r.period.from))} a {formatBR(toISODate(r.period.to))})
        </p>
      </section>

      {r.insights.length > 0 && parts.has('atencao') && (
        <ReportSection title="Pontos de atenção">
          <InsightList insights={r.insights} />
        </ReportSection>
      )}

      {!parts.has('sintomas') || (r.specialty.symptomCategories !== 'todas' && r.specialty.symptomCategories.length === 0) ? null : (
        <ReportSection title="Sintomas no período" note={r.hiddenSymptomCount > 0 ? `${r.hiddenSymptomCount} ${r.hiddenSymptomCount === 1 ? 'sintoma de outra área foi omitido' : 'sintomas de outras áreas foram omitidos'} neste resumo.` : undefined}>
          {r.symptoms.length === 0 ? (
            <p className="text-ink-soft">Nenhum sintoma registrado no período para esta especialidade.</p>
          ) : (
            <div>
              {/* Uma linha por sintoma, com as datas de cada vez (e a intensidade entre parênteses): cabe no papel sem tabela larga. */}
              <ul className="divide-y divide-line border-y border-line">
                {r.symptoms.map(s => (
                  <li key={s.key} className="py-2 print:py-1.5 break-inside-avoid">
                    <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                      <span className="font-semibold text-ink">{s.name}</span>
                      <span className="text-xs text-ink-mute">{s.category}</span>
                      <span className="ml-auto text-xs text-ink-soft tabular">
                        {s.count}x · média {s.avgIntensity.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} · máx. {s.maxIntensity}
                        {s.trend && ` · ${TREND_LABEL[s.trend].toLowerCase()}`}
                        {s.timeOfDay.dominant && s.timeOfDay.known >= 2 && ` · mais ${timeOfDayLabel(s.timeOfDay.dominant).toLowerCase()}`}
                      </span>
                    </p>
                    <p className="text-xs text-ink-soft tabular leading-relaxed">
                      <span className="text-ink-mute">Datas: </span>
                      {s.entries.map(e => `${e.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} (${e.intensity})`).join(' · ')}
                    </p>
                    {s.care.length > 0 && <p className="text-xs text-ink-soft">Cuidados: {s.care.slice(-2).map(c => c.comment_text).join('; ')}</p>}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-ink-mute mt-2">Entre parênteses, a intensidade daquele dia: de 1 (muito leve) a 5 (muito forte), registrada pelo casal.</p>
            </div>
          )}
        </ReportSection>
      )}

      {r.weight && parts.has('peso') && (
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

      {r.bloodPressure && parts.has('pressao') && (
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

      {labor.length > 0 && parts.has('retafinal') && (
        <ReportSection title="Reta final">
          <ul className="space-y-1.5 text-ink">{labor.map(l => <li key={l}>{l}</li>)}</ul>
        </ReportSection>
      )}

      {parts.has('duvidas') && (
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
      )}

      {r.answeredQuestions.length > 0 && parts.has('duvidas') && (
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
    // Sem "não quebrar" na seção inteira: uma seção longa pulava para a página seguinte e deixava meia página em branco.
    <section className="space-y-3 print:space-y-1.5">
      <h3 className="text-lg print:text-base font-semibold text-ink break-after-avoid">{title}</h3>
      {children}
      {note && <p className="text-xs text-ink-mute">{note}</p>}
    </section>
  );
}
