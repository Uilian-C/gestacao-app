import { useState } from 'react';
import { CalendarHeart, CheckCircle2, ChevronLeft, ChevronRight, Lightbulb, NotebookPen, Pencil, Route, Siren } from 'lucide-react';
import { weekInfo } from '../../content/weeks';
import { specialtyOf, questionSpecialty } from '../../data/specialties';
import { ALERT_SIGNS } from '../../content/symptomCatalog';
import { FIRST_WEEK, LAST_WEEK, daysBetween, formatBR, isOverdue, localDay, parseTimestamp, type GestationalAge } from '../../lib/dates';
import { isHighBloodPressure } from '../../lib/health';
import { nextSteps, phaseOf, planFor } from '../../lib/journey';
import { gestationMonth } from '../../lib/ficha';
import Guide from '../Guide';
import { PhaseStrip, StepList } from '../journey/Journey';
import type { Insight } from '../../lib/symptoms';
import type { Consultation, HealthMetric, PartnerTask, QuestionItem, SymptomItem, Tab } from '../../types';
import AuthorBadge from '../AuthorBadge';
import { DumForm } from '../DumForm';
import { Button, Card, Pill, SectionTitle } from '../ui';
import { InsightList } from '../InsightList';
import IntensityDots from '../IntensityDots';
import LocationLinks from '../LocationLinks';
import SpecialtyIcon from '../SpecialtyIcon';

interface Props {
  age: GestationalAge;
  dumDate: string;
  selectedWeek: number;
  currentWeek: number;
  onSelectWeek: (week: number) => void;
  onSaveDum: (iso: string) => Promise<boolean>;
  nextConsultation: Consultation | null;
  questions: QuestionItem[];
  symptoms: SymptomItem[];
  metrics: HealthMetric[];
  tasks: PartnerTask[];
  insights: Insight[];
  onToggleTask: (task: PartnerTask) => void;
  onNavigate: (tab: Tab) => void;
  onPrepareReport: (consultation: Consultation) => void;
  onOpenTasks: () => void;
  bloodType: string | null;
  /** IDs da jornada do pré-natal já marcados como feitos. */
  doneSteps: Set<string>;
  checksAvailable: boolean;
  busy: boolean;
  onToggleStep: (itemId: string, done: boolean) => void;
  onOpenJourney: () => void;
}

/** Anel de progresso da gestação (40 semanas), com a semana no centro. */
function WeekRing({ week }: { week: number }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const frac = Math.min(1, week / 40);
  return (
    <div className="relative w-24 h-24 shrink-0" role="img" aria-label={`Semana ${week} de 40`}>
      <svg viewBox="0 0 108 108" className="w-full h-full -rotate-90">
        <circle cx="54" cy="54" r={r} fill="none" strokeWidth="6" style={{ stroke: 'var(--c-surface)' }} />
        <circle cx="54" cy="54" r={r} fill="none" strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} style={{ stroke: 'var(--c-warm)', transition: 'stroke-dashoffset 600ms ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[2rem] leading-none text-ink tabular">{week}</span>
        <span className="text-[11px] text-ink-mute mt-1">semanas</span>
      </div>
    </div>
  );
}

export default function HomeTab(props: Props) {
  const { age, selectedWeek, currentWeek, onSelectWeek, nextConsultation, questions, symptoms, metrics, tasks, insights, onToggleTask, onNavigate, onPrepareReport, onOpenTasks } = props;
  const [editingDum, setEditingDum] = useState(false);
  const info = weekInfo(selectedWeek);
  const today = new Date();

  const alerts = insights.filter(i => i.tone === 'alerta');
  const otherInsights = insights.filter(i => i.tone !== 'alerta').slice(0, 3);

  const recentSymptoms = symptoms.slice(0, 3);
  const lastWeight = [...metrics].reverse().find(m => m.weight_kg !== null);
  const lastBp = [...metrics].reverse().find(m => m.systolic_bp !== null && m.diastolic_bp !== null);

  const phase = phaseOf(currentWeek);
  const steps = nextSteps(planFor(props.bloodType), currentWeek, props.doneSteps, 3);

  const weekTasks = tasks
    .filter(t => !t.is_completed && (t.week_number === currentWeek || isOverdue(t.due_date)))
    .slice(0, 4);

  return (
    <div className="space-y-5">
      {alerts.length > 0 && (
        <Card tone="alert">
          <SectionTitle icon={<Siren className="w-5 h-5 text-alert" />} title="Atenção" />
          <InsightList insights={alerts} />
        </Card>
      )}

      <Card tone="warm" className="overflow-hidden">
        <div className="flex gap-4 items-center">
          <WeekRing week={selectedWeek} />
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm text-warm font-medium">
              {info.trimester}º trimestre · {gestationMonth(selectedWeek)}º mês{selectedWeek !== currentWeek && ' · outra semana'}
            </p>
            <h2 className="text-[1.35rem] leading-snug text-ink text-balance">Do tamanho de {info.fruit}</h2>
            <p className="text-xs text-ink-mute tabular">
              {info.size} · {info.weight}
            </p>
          </div>
        </div>
        <p className="text-ink-soft text-[15px] mt-4">{info.milestone}</p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-ink-soft">
          <span className="tabular">
            {age.daysToDpp >= 0 ? <>Faltam <strong className="text-ink">{age.daysToDpp} dias</strong> · DPP {age.dpp.toLocaleDateString('pt-BR')}</> : <>DPP foi em {age.dpp.toLocaleDateString('pt-BR')}</>}
          </span>
          <div className="flex items-center">
            <button onClick={() => onSelectWeek(Math.max(FIRST_WEEK, selectedWeek - 1))} disabled={selectedWeek <= FIRST_WEEK} aria-label="Semana anterior" className="p-1.5 rounded-full hover:bg-surface disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {selectedWeek !== currentWeek ? (
              <button onClick={() => onSelectWeek(currentWeek)} className="text-xs font-semibold text-warm underline underline-offset-2 px-1">hoje</button>
            ) : (
              <span className="text-xs px-1 text-ink-mute">semanas</span>
            )}
            <button onClick={() => onSelectWeek(Math.min(LAST_WEEK, selectedWeek + 1))} disabled={selectedWeek >= LAST_WEEK} aria-label="Próxima semana" className="p-1.5 rounded-full hover:bg-surface disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={() => setEditingDum(v => !v)} aria-label="Alterar a DUM" className="p-1.5 rounded-full hover:bg-surface text-ink-mute">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {editingDum && (
          <div className="mt-3">
            <DumForm
              initial={props.dumDate}
              onCancel={() => setEditingDum(false)}
              onSave={async iso => {
                if (await props.onSaveDum(iso)) setEditingDum(false);
              }}
            />
          </div>
        )}
        {age.isPostTerm && <p className="mt-3 text-sm text-warn bg-warn-soft rounded-2xl px-4 py-3">Vocês passaram das 40 semanas. Combinem com o obstetra a frequência das avaliações a partir de agora.</p>}
      </Card>

      <Card>
        <SectionTitle
          icon={<Route className="w-5 h-5" />}
          title={`Fase: ${phase.title}`}
          subtitle={`${phase.label} · ${phase.visits.toLowerCase()}`}
          action={<Button tone="soft" className="!px-3 !py-1.5" onClick={props.onOpenJourney}>Jornada</Button>}
        />
        <PhaseStrip week={currentWeek} />
        <Guide className="mt-4">{phase.focus}</Guide>
        <h3 className="text-sm font-semibold text-ink mt-5 mb-3">Próximos passos</h3>
        {steps.length ? (
          <StepList steps={steps} dumDate={props.dumDate} busy={props.busy || !props.checksAvailable} onToggle={(item, done) => props.onToggleStep(item.id, done)} />
        ) : (
          <p className="text-sm text-ink-soft">Tudo em dia por aqui. 🎉</p>
        )}
      </Card>

      <div className="grid md:grid-cols-2 gap-5">
        <Card>
          <SectionTitle icon={<CalendarHeart className="w-5 h-5" />} title="Próxima consulta" />
          {nextConsultation ? (
            <NextConsultation consultation={nextConsultation} questions={questions} today={today} onPrepare={() => onPrepareReport(nextConsultation)} />
          ) : (
            <div className="space-y-3">
              <p className="text-ink-soft">Nenhuma consulta agendada. Agende para o app montar o resumo do período.</p>
              <Button tone="soft" onClick={() => onNavigate('consultas')}>Agendar consulta</Button>
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle
            icon={<NotebookPen className="w-5 h-5" />}
            title="Como ela está"
            action={<Button tone="soft" className="!px-3 !py-1.5" onClick={() => onNavigate('diario')}>Registrar</Button>}
          />
          {recentSymptoms.length === 0 && !lastWeight && !lastBp ? (
            <p className="text-ink-soft">Nada registrado ainda. Um registro rápido por dia já mostra padrões em poucas semanas.</p>
          ) : (
            <ul className="space-y-2.5">
              {recentSymptoms.map(s => (
                <li key={s.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0">
                    <span className="font-semibold text-ink">{s.symptom_name}</span>
                    <span className="text-sm text-ink-mute"> · {formatBR(s.log_date)}</span>
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    <IntensityDots value={s.intensity} />
                    <AuthorBadge role={s.created_by} />
                  </span>
                </li>
              ))}
              {(lastWeight || lastBp) && (
                <li className="flex flex-wrap gap-2 pt-1">
                  {lastWeight && <Pill>Peso {lastWeight.weight_kg!.toLocaleString('pt-BR')} kg · {formatBR(lastWeight.recorded_at)}</Pill>}
                  {lastBp && (
                    <Pill tone={isHighBloodPressure(lastBp.systolic_bp, lastBp.diastolic_bp) ? 'alert' : 'neutral'}>
                      Pressão {lastBp.systolic_bp}/{lastBp.diastolic_bp} · {formatBR(lastBp.recorded_at)}
                    </Pill>
                  )}
                </li>
              )}
            </ul>
          )}
        </Card>

        {otherInsights.length > 0 && (
          <Card>
            <SectionTitle
              icon={<Lightbulb className="w-5 h-5" />}
              title="Padrões recentes"
              action={<Button tone="soft" className="!px-3 !py-1.5" onClick={() => onNavigate('painel')}>Painel</Button>}
            />
            <InsightList insights={otherInsights} compact />
          </Card>
        )}

        {weekTasks.length > 0 && (
        <Card>
          <SectionTitle
            icon={<CheckCircle2 className="w-5 h-5" />}
            title="Tarefas da semana"
            action={<Button tone="soft" className="!px-3 !py-1.5" onClick={onOpenTasks}>Todas</Button>}
          />
          {weekTasks.length ? (
            <ul className="space-y-2">
              {weekTasks.map(t => (
                <li key={t.id} className="flex items-center gap-3">
                  <button onClick={() => onToggleTask(t)} aria-label={`Concluir "${t.task_title}"`} className="w-5 h-5 rounded-full border-2 border-ink-mute hover:border-brand shrink-0" />
                  <span className="flex-1 min-w-0 text-ink">{t.task_title}</span>
                  {isOverdue(t.due_date) ? <Pill tone="alert">atrasada</Pill> : <AuthorBadge role={t.assigned_to} />}
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
        )}
      </div>

      <details className="rounded-[28px] bg-surface shadow-soft p-5 md:p-6 group">
        <summary className="cursor-pointer font-semibold text-ink flex items-center gap-2 list-none">
          <Siren className="w-5 h-5 text-alert" /> Quando procurar a maternidade
          <span className="ml-auto text-sm font-semibold text-ink-mute group-open:hidden">ver</span>
        </summary>
        <p className="text-sm text-ink-soft mt-3">Procurem atendimento sem esperar a próxima consulta se aparecer:</p>
        <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-ink">
          {ALERT_SIGNS.map(s => <li key={s} className="flex gap-2"><span className="text-alert">•</span>{s}</li>)}
        </ul>
      </details>
    </div>
  );
}

function NextConsultation({ consultation, questions, today, onPrepare }: { consultation: Consultation; questions: QuestionItem[]; today: Date; onPrepare: () => void }) {
  const spec = specialtyOf(consultation.specialty);
  const when = parseTimestamp(consultation.scheduled_at);
  const days = daysBetween(today, localDay(consultation.scheduled_at));
  const pending = questions.filter(q => !q.doctor_answer && questionSpecialty(q.specialty) === spec.id).length;
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <SpecialtyIcon id={spec.id} />
        <div>
          <p className="font-semibold text-ink">{spec.label}</p>
          <p className="text-ink-soft text-sm">
            {when.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} às {when.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
          {consultation.professional_name && <p className="text-sm text-ink-mute">{consultation.professional_name}</p>}
        </div>
        <Pill tone={days <= 2 ? 'warm' : 'brand'}>{days === 0 ? 'hoje' : days === 1 ? 'amanhã' : `em ${days} dias`}</Pill>
      </div>
      {consultation.location && <LocationLinks address={consultation.location} />}
      <p className="text-sm text-ink-soft">{pending > 0 ? `${pending} ${pending === 1 ? 'dúvida anotada' : 'dúvidas anotadas'} para levar.` : 'Nenhuma dúvida anotada para esta consulta ainda.'}</p>
      <Button onClick={onPrepare}>Preparar resumo da consulta</Button>
    </div>
  );
}
