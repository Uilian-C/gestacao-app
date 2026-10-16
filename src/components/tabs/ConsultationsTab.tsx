import { useMemo, useState } from 'react';
import { ArrowLeft, CalendarHeart, ClipboardCopy, ExternalLink, FileText, HelpCircle, MapPin, Plus, Printer, ShieldCheck, Trash2 } from 'lucide-react';
import { googleCalendarUrl } from '../../lib/calendar';
import { SPECIALTIES, questionSpecialty, specialtyOf, type SpecialtyId } from '../../data/specialties';
import { daysBetween, formatBR, localDay, parseLocalDate, parseTimestamp, toISODate } from '../../lib/dates';
import { TREND_LABEL, buildReport, defaultReportPeriod, reportToText, type ConsultationReport } from '../../lib/report';
import { timeOfDayLabel } from '../../lib/symptoms';
import { buildFicha, fichaToText, type FichaItem } from '../../lib/ficha';
import { FichaGrid } from '../FichaBar';
import { BMI_LABEL, GAIN_STATUS_LABEL } from '../../lib/weightGain';
import type { Consultation, HealthMetric, PartnerComment, PregnancyProfile, QuestionItem, SymptomItem } from '../../types';
import AuthorBadge from '../AuthorBadge';
import { InsightList } from '../InsightList';
import { inputClass } from '../styles';
import { Button, Card, EmptyState, Field, Pill, SectionTitle } from '../ui';

export interface ReportRequest {
  specialtyId: SpecialtyId;
  consultationId: string | null;
}

export interface NewConsultation {
  scheduledAt: string;
  specialty: SpecialtyId;
  professional: string;
  location: string;
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
  onDeleteConsultation: (c: Consultation) => void;
  onCreateQuestion: (text: string, category: string, specialty: SpecialtyId) => Promise<boolean>;
  onAnswer: (id: string, answer: string) => Promise<boolean>;
  onDeleteQuestion: (q: QuestionItem) => void;
  onNotify: (text: string) => void;
}

const QUESTION_CATEGORIES = ['Alimentação', 'Medicação', 'Exames', 'Parto', 'Geral'];

export default function ConsultationsTab(props: Props) {
  const today = parseLocalDate(toISODate(new Date()));
  if (props.report) {
    return <ReportScreen {...props} request={props.report} today={today} />;
  }

  const upcoming = props.consultations.filter(c => daysBetween(today, localDay(c.scheduled_at)) >= 0);
  const past = props.consultations.filter(c => daysBetween(today, localDay(c.scheduled_at)) < 0).reverse();

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle icon={<CalendarHeart className="w-5 h-5" />} title="Agenda de consultas" subtitle="Cada consulta gera um resumo com o que importa para aquela especialidade." />
        {props.migrationPending ? (
          <p className="text-sm text-warn bg-warn-soft rounded-2xl p-4">
            Para agendar consultas, rodem a migração <code>db/migrations/002_consultas_e_padroes.sql</code> no Neon. Enquanto isso, o resumo avulso abaixo já funciona.
          </p>
        ) : (
          <div className="space-y-4">
            {upcoming.length === 0 && <p className="text-ink-soft">Nenhuma consulta marcada.</p>}
            {upcoming.map(c => (
              <ConsultationRow key={c.id} consultation={c} today={today} questions={props.questions} onPrepare={() => props.onOpenReport({ specialtyId: questionSpecialty(c.specialty), consultationId: c.id })} onDelete={() => props.onDeleteConsultation(c)} />
            ))}
            <ScheduleForm busy={props.busy} onCreate={props.onCreateConsultation} />
            {past.length > 0 && (
              <details>
                <summary className="cursor-pointer text-sm font-semibold text-ink-mute">Consultas anteriores ({past.length})</summary>
                <div className="space-y-3 mt-3">
                  {past.map(c => (
                    <ConsultationRow key={c.id} consultation={c} today={today} questions={props.questions} onPrepare={() => props.onOpenReport({ specialtyId: questionSpecialty(c.specialty), consultationId: c.id })} onDelete={() => props.onDeleteConsultation(c)} />
                  ))}
                </div>
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

function ConsultationRow({ consultation: c, today, questions, onPrepare, onDelete }: { consultation: Consultation; today: Date; questions: QuestionItem[]; onPrepare: () => void; onDelete: () => void }) {
  const spec = specialtyOf(c.specialty);
  const when = parseTimestamp(c.scheduled_at);
  const days = daysBetween(today, localDay(c.scheduled_at));
  const pending = questions.filter(q => !q.doctor_answer && questionSpecialty(q.specialty) === spec.id).length;
  return (
    <div className="rounded-2xl border border-line bg-canvas p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <span className="text-3xl" aria-hidden>{spec.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-bold text-ink">{spec.label}</p>
          {days >= 0 && <Pill tone={days <= 2 ? 'warm' : 'brand'}>{days === 0 ? 'hoje' : days === 1 ? 'amanhã' : `em ${days} dias`}</Pill>}
        </div>
        <p className="text-sm text-ink-soft">
          {when.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })} às {when.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          {c.professional_name && ` · ${c.professional_name}`}
        </p>
        {c.location && <p className="text-xs text-ink-mute flex items-center gap-1"><MapPin className="w-3 h-3" /> {c.location}</p>}
        {days >= 0 && (
          <p className="text-xs text-ink-mute mt-1 flex flex-wrap gap-x-3">
            <span>{pending} {pending === 1 ? 'dúvida anotada' : 'dúvidas anotadas'}</span>
            <a href={googleCalendarUrl(c)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand underline underline-offset-2">
              <ExternalLink className="w-3 h-3" /> Google Agenda
            </a>
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button onClick={onPrepare} tone={days >= 0 ? 'primary' : 'ghost'}>
          <FileText className="w-4 h-4" /> {days >= 0 ? 'Preparar resumo' : 'Ver resumo'}
        </Button>
        <button onClick={onDelete} aria-label={`Excluir consulta de ${spec.label}`} className="p-2 rounded-full text-ink-mute hover:text-alert hover:bg-alert-soft">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function ScheduleForm({ busy, onCreate, initialDate, startOpen = false, onClose }: { busy: boolean; onCreate: (c: NewConsultation) => Promise<boolean>; initialDate?: string; startOpen?: boolean; onClose?: () => void }) {
  const [open, setOpenState] = useState(startOpen);
  const setOpen = (value: boolean) => {
    setOpenState(value);
    if (!value) onClose?.();
  };
  const [date, setDate] = useState(initialDate ?? '');
  const [time, setTime] = useState('09:00');
  const [specialty, setSpecialty] = useState<SpecialtyId>('obstetra');
  const [professional, setProfessional] = useState('');
  const [location, setLocation] = useState('');

  if (!open) {
    return (
      <Button tone="soft" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" /> Agendar consulta
      </Button>
    );
  }

  return (
    <form
      className="rounded-2xl bg-surface-2 p-4 space-y-4"
      onSubmit={async e => {
        e.preventDefault();
        if (!date) return;
        // Horário local com fuso explícito, para o banco guardar o instante certo.
        const local = new Date(`${date}T${time || '09:00'}`);
        if (await onCreate({ scheduledAt: local.toISOString(), specialty, professional: professional.trim(), location: location.trim() })) {
          setOpen(false);
          setDate('');
          setProfessional('');
          setLocation('');
        }
      }}
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Especialidade" htmlFor="esp">
          <select id="esp" className={inputClass} value={specialty} onChange={e => setSpecialty(e.target.value as SpecialtyId)}>
            {SPECIALTIES.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data" htmlFor="data-consulta">
            <input id="data-consulta" type="date" required className={inputClass} value={date} onChange={e => setDate(e.target.value)} />
          </Field>
          <Field label="Hora" htmlFor="hora-consulta">
            <input id="hora-consulta" type="time" className={inputClass} value={time} onChange={e => setTime(e.target.value)} />
          </Field>
        </div>
        <Field label="Profissional (opcional)" htmlFor="prof">
          <input id="prof" className={inputClass} placeholder="Ex.: Dra. Ana" value={professional} onChange={e => setProfessional(e.target.value)} />
        </Field>
        <Field label="Local (opcional)" htmlFor="local">
          <input id="local" className={inputClass} placeholder="Ex.: Clínica Bem Nascer" value={location} onChange={e => setLocation(e.target.value)} />
        </Field>
      </div>
      <div className="flex gap-2 justify-end">
        <Button tone="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
        <Button type="submit" disabled={busy || !date}>Agendar</Button>
      </div>
    </form>
  );
}

function QuickReport({ onOpen }: { onOpen: (id: SpecialtyId) => void }) {
  const [specialty, setSpecialty] = useState<SpecialtyId>('obstetra');
  return (
    <Card tone="brand">
      <SectionTitle icon={<FileText className="w-5 h-5" />} title="Resumo avulso" subtitle="Para uma consulta não agendada ou um pronto-atendimento." />
      <div className="flex flex-col sm:flex-row gap-3">
        <select aria-label="Especialidade do resumo" className={inputClass} value={specialty} onChange={e => setSpecialty(e.target.value as SpecialtyId)}>
          {SPECIALTIES.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>)}
        </select>
        <Button onClick={() => onOpen(specialty)} className="shrink-0">Gerar resumo</Button>
      </div>
      <p className="text-sm text-ink-soft mt-3">{specialtyOf(specialty).focus}</p>
    </Card>
  );
}

function QuestionsSection({ questions, busy, migrationPending, onCreateQuestion, onAnswer, onDeleteQuestion }: Props) {
  const [text, setText] = useState('');
  const [category, setCategory] = useState('Geral');
  const [specialty, setSpecialty] = useState<SpecialtyId>('obstetra');
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const pending = questions.filter(q => !q.doctor_answer);
  const answered = questions.filter(q => q.doctor_answer);
  const groups = SPECIALTIES.map(s => ({ spec: s, items: pending.filter(q => questionSpecialty(q.specialty) === s.id) })).filter(g => g.items.length);

  return (
    <Card>
      <SectionTitle icon={<HelpCircle className="w-5 h-5" />} title="Dúvidas para as consultas" subtitle="Anotem quando surgir. Elas entram no resumo da especialidade certa." />
      <form
        className="space-y-3"
        onSubmit={async e => {
          e.preventDefault();
          if (text.trim() && (await onCreateQuestion(text.trim(), category, specialty))) setText('');
        }}
      >
        <input aria-label="Dúvida" className={inputClass} placeholder="Ex.: Posso continuar o pilates?" value={text} onChange={e => setText(e.target.value)} />
        <div className="grid sm:grid-cols-3 gap-3">
          {!migrationPending && (
            <select aria-label="Para quem" className={inputClass} value={specialty} onChange={e => setSpecialty(e.target.value as SpecialtyId)}>
              {SPECIALTIES.map(s => <option key={s.id} value={s.id}>Para: {s.label}</option>)}
            </select>
          )}
          <select aria-label="Assunto" className={inputClass} value={category} onChange={e => setCategory(e.target.value)}>
            {QUESTION_CATEGORIES.map(c => <option key={c} value={c}>Assunto: {c}</option>)}
          </select>
          <Button type="submit" disabled={busy || !text.trim()}>Anotar dúvida</Button>
        </div>
      </form>

      <div className="mt-6 space-y-5">
        {groups.length === 0 && <EmptyState emoji="💭" title="Nenhuma dúvida pendente">Quando surgir uma pergunta no dia a dia, anotem aqui para não esquecer na consulta.</EmptyState>}
        {groups.map(g => (
          <div key={g.spec.id} className="space-y-2">
            <h3 className="text-sm font-bold text-ink-soft">{g.spec.emoji} {g.spec.label} ({g.items.length})</h3>
            {g.items.map(q => (
              <div key={q.id} className="rounded-2xl border border-line bg-canvas p-4 space-y-3">
                <div className="flex justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="font-semibold text-ink">{q.questions_to_ask}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-ink-mute">
                      <Pill>{q.category}</Pill>
                      <AuthorBadge role={q.created_by} />
                      <span>{formatBR(q.created_at)}</span>
                    </div>
                  </div>
                  <button onClick={() => onDeleteQuestion(q)} aria-label="Excluir dúvida" className="p-1.5 rounded-full text-ink-mute hover:text-alert hover:bg-alert-soft self-start">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <form
                  className="flex gap-2"
                  onSubmit={async e => {
                    e.preventDefault();
                    const a = answers[q.id]?.trim();
                    if (a && (await onAnswer(q.id, a))) setAnswers(s => ({ ...s, [q.id]: '' }));
                  }}
                >
                  <input aria-label={`Resposta para "${q.questions_to_ask}"`} className={`${inputClass} !py-2 text-sm`} placeholder="O que o profissional respondeu..." value={answers[q.id] ?? ''} onChange={e => setAnswers(s => ({ ...s, [q.id]: e.target.value }))} />
                  <Button type="submit" tone="soft" disabled={busy || !answers[q.id]?.trim()} className="!px-4 !py-2 shrink-0">Salvar</Button>
                </form>
              </div>
            ))}
          </div>
        ))}
        {answered.length > 0 && (
          <details>
            <summary className="cursor-pointer text-sm font-semibold text-ink-mute">Respondidas ({answered.length})</summary>
            <div className="space-y-3 mt-3">
              {answered.map(q => (
                <div key={q.id} className="rounded-2xl border border-line bg-canvas p-4 space-y-2">
                  <div className="flex justify-between gap-3">
                    <p className="font-semibold text-ink">{q.questions_to_ask}</p>
                    <button onClick={() => onDeleteQuestion(q)} aria-label="Excluir dúvida" className="p-1.5 rounded-full text-ink-mute hover:text-alert self-start">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="rounded-xl bg-ok-soft p-3 text-sm">
                    <span className="font-bold text-ok flex items-center gap-1 text-xs uppercase tracking-wide"><ShieldCheck className="w-3.5 h-3.5" /> {specialtyOf(questionSpecialty(q.specialty)).label}</span>
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
  const [from, setFrom] = useState(() => toISODate(defaultReportPeriod(props.consultations, request.specialtyId, today).from));

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

  const copy = async () => {
    const text = reportToText(report, fichaToText(ficha));
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
      <ReportDocument report={report} ficha={ficha} />
    </div>
  );
}

function ReportDocument({ report: r, ficha }: { report: ConsultationReport; ficha: FichaItem[] }) {
  const kg = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`;
  const signed = (n: number) => `${n >= 0 ? '+' : ''}${kg(n)}`;
  const when = r.consultation ? parseTimestamp(r.consultation.scheduled_at) : null;

  return (
    <article className="print-area rounded-3xl border border-line bg-surface p-6 md:p-8 space-y-7 print:border-0 print:p-0">
      <header className="space-y-3 border-b border-line pb-5">
        <p className="text-sm font-bold text-brand uppercase tracking-wide">Nossa Gestação · resumo para consulta</p>
        <h2 className="text-2xl font-extrabold text-ink">{r.specialty.emoji} {r.specialty.label}</h2>
        {when && (
          <p className="text-ink-soft">
            {when.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} às {when.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            {r.consultation?.professional_name && ` · ${r.consultation.professional_name}`}
          </p>
        )}
      </header>

      {/* Ficha da gestante: o mesmo cabeçalho de prontuário em todo resumo. */}
      <section className="space-y-3 rounded-2xl bg-surface-2 p-4 break-inside-avoid print:bg-transparent print:border print:border-line">
        <h3 className="text-sm font-bold text-ink-soft uppercase tracking-wide">Ficha da gestante</h3>
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
                        <span className="font-bold text-ink">{s.name}</span>
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
        Registros feitos pelo casal no app Nossa Gestação. Não substituem a avaliação profissional.
      </footer>
    </article>
  );
}

function ReportSection({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 break-inside-avoid">
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      {children}
      {note && <p className="text-xs text-ink-mute">{note}</p>}
    </section>
  );
}
