import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Bell, Camera, CalendarHeart, Check, CheckCircle2, Heart, Lightbulb, NotebookPen, Pencil, Route, Siren, Sparkles, Syringe } from 'lucide-react';
import { weekInfo } from '../../content/weeks';
import { ALERT_SIGNS } from '../../content/symptomCatalog';
import { FIRST_WEEK, LAST_WEEK, formatBR, type GestationalAge } from '../../lib/dates';
import type { ExamItem, JournalEntry } from '../../hooks/useGestationData';
import { isHighBloodPressure } from '../../lib/health';
import { nextSteps, phaseOf, planFor } from '../../lib/journey';
import { gestationMonth } from '../../lib/ficha';
import { todayCards, type TodayAction, type TodayCard, type TodayTone } from '../../lib/today';
import Guide from '../Guide';
import { PhaseStrip } from '../journey/Journey';
import type { Insight } from '../../lib/symptoms';
import type { Consultation, HealthMetric, PartnerTask, SymptomItem } from '../../types';
import AuthorBadge from '../AuthorBadge';
import BrandMark from '../BrandMark';
import { DumForm } from '../DumForm';
import PushPrompt from '../PushPrompt';
import { Card, LinkButton, Pill, SectionTitle } from '../ui';
import { InsightList } from '../InsightList';
import IntensityDots from '../IntensityDots';

/** Para onde o Início leva (abas e partes delas). */
export type HomeTarget = 'diario' | 'graficos' | 'jornada' | 'tarefas' | 'exames';

interface Props {
  age: GestationalAge;
  dumDate: string;
  selectedWeek: number;
  currentWeek: number;
  onSelectWeek: (week: number) => void;
  onSaveDum: (iso: string) => Promise<boolean>;
  nextConsultation: Consultation | null;
  symptoms: SymptomItem[];
  metrics: HealthMetric[];
  tasks: PartnerTask[];
  insights: Insight[];
  journal: JournalEntry[];
  exams: ExamItem[];
  onToggleTask: (task: PartnerTask) => void;
  onPrepareReport: (consultation: Consultation) => void;
  onOpen: (target: HomeTarget, planItem?: string) => void;
  bloodType: string | null;
  /** IDs da jornada do pré-natal já marcados como feitos. */
  doneSteps: Set<string>;
  checksAvailable: boolean;
  onToggleStep: (itemId: string, done: boolean) => void;
  /** Lembretes de momentos nos próximos 30 dias. */
  reminders: JournalEntry[];
}

const TONE: Record<TodayTone, { card: string; label: string; action: string }> = {
  rosa: { card: 'bg-rosa-soft', label: 'text-rosa-strong', action: 'text-rosa-strong' },
  azul: { card: 'bg-azul-soft', label: 'text-azul-strong', action: 'text-azul-strong' },
  verde: { card: 'bg-verde-soft', label: 'text-verde-strong', action: 'text-verde-strong' },
  coral: { card: 'bg-coral-soft', label: 'text-coral-strong', action: 'text-coral-strong' },
};

function cardIcon(card: TodayCard) {
  if (card.id.startsWith('consulta')) return <CalendarHeart />;
  if (card.id.startsWith('tarefa')) return <CheckCircle2 />;
  if (card.id.startsWith('momento')) return <Heart />;
  if (card.id.startsWith('lembrete')) return <Bell />;
  if (card.action?.do.kind === 'exame') return <Camera />;
  return card.label.startsWith('Vacina') ? <Syringe /> : <Route />;
}

/** Anel da gestação (40 semanas) com o coração batendo no centro e ondas saindo dele. */
function WeekHeart({ week }: { week: number }) {
  const r = 92;
  const c = 2 * Math.PI * r;
  const frac = Math.min(1, week / 40);
  return (
    <div className="relative w-[210px] h-[210px] mx-auto">
      <div className="tt-onda absolute inset-0 rounded-full border-2 border-rosa/60" aria-hidden />
      <div className="tt-onda-2 absolute inset-0 rounded-full border-2 border-azul/50" aria-hidden />
      <svg viewBox="0 0 210 210" className="absolute inset-0 w-full h-full -rotate-90" role="img" aria-label={`Semana ${week} de 40`}>
        <defs>
          <linearGradient id="anel-semana" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#ff7fa0" />
            <stop offset="1" stopColor="#2f84d6" />
          </linearGradient>
        </defs>
        <circle cx="105" cy="105" r={r} fill="none" strokeWidth="12" style={{ stroke: 'var(--c-surface-2)' }} />
        <circle cx="105" cy="105" r={r} fill="none" strokeWidth="12" strokeLinecap="round" stroke="url(#anel-semana)" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} style={{ transition: 'stroke-dashoffset 600ms ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <BrandMark animated className="w-14 h-14" />
        <span className="font-display text-[2.75rem] leading-none text-ink tabular font-semibold">{week}</span>
        <span className="text-[13px] font-semibold text-ink-mute">semanas</span>
      </div>
    </div>
  );
}

/** Semanas para deslizar: a escolhida fica no centro, a atual com contorno. */
function WeekStrip({ selected, current, onSelect }: { selected: number; current: number; onSelect: (w: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>(`[data-semana="${selected}"]`);
    el?.scrollIntoView?.({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [selected]);
  const weeks = Array.from({ length: LAST_WEEK - FIRST_WEEK + 1 }, (_, i) => FIRST_WEEK + i);
  return (
    <div ref={ref} className="-mx-5 px-5 flex gap-2 overflow-x-auto no-scrollbar py-1" role="group" aria-label="Escolher semana">
      {weeks.map(w => {
        const on = w === selected;
        return (
          <button
            key={w}
            type="button"
            data-semana={w}
            onClick={() => onSelect(w)}
            aria-pressed={on}
            aria-label={w === current ? `Semana ${w} (atual)` : `Semana ${w}`}
            className={`shrink-0 w-11 h-11 rounded-full text-[15px] font-extrabold tabular transition ${on ? 'bg-ink text-canvas' : w === current ? 'bg-surface text-ink ring-2 ring-rosa' : 'bg-surface-2 text-ink-soft hover:text-ink'}`}
          >
            {w}
          </button>
        );
      })}
    </div>
  );
}

export default function HomeTab(props: Props) {
  const { age, selectedWeek, currentWeek, onSelectWeek, symptoms, metrics, insights, onOpen } = props;
  const [editingDum, setEditingDum] = useState(false);
  const info = weekInfo(selectedWeek);
  const today = new Date();

  const alerts = insights.filter(i => i.tone === 'alerta');
  const otherInsights = insights.filter(i => i.tone !== 'alerta').slice(0, 3);
  const recentSymptoms = symptoms.slice(0, 3);
  const lastWeight = [...metrics].reverse().find(m => m.weight_kg !== null);
  const lastBp = [...metrics].reverse().find(m => m.systolic_bp !== null && m.diastolic_bp !== null);
  const phase = phaseOf(currentWeek);

  const cards = todayCards({
    today,
    dumDate: props.dumDate,
    reminders: props.reminders,
    nextConsultation: props.nextConsultation,
    steps: nextSteps(planFor(props.bloodType), currentWeek, props.doneSteps, 3),
    tasks: props.tasks,
    currentWeek,
    moments: props.journal,
    savedExams: new Set(props.exams.map(e => e.plan_item).filter((x): x is string => !!x)),
  });

  const act = (a: TodayAction) => {
    if (a.kind === 'resumo') props.onPrepareReport(a.consultation);
    else if (a.kind === 'exame') onOpen('exames', a.planItem);
    else if (a.kind === 'feito') props.onToggleStep(a.planItem, true);
    else if (a.kind === 'concluir') props.onToggleTask(a.task);
    else onOpen('diario');
  };

  return (
    <div className="space-y-6">
      {alerts.length > 0 && (
        <Card tone="alert">
          <SectionTitle icon={<Siren className="w-5 h-5 text-alert" />} title="Atenção" />
          <InsightList insights={alerts} />
        </Card>
      )}

      <section aria-label="Semana da gestação" className="rounded-[32px] bg-surface shadow-soft px-5 pt-6 pb-5">
        <WeekHeart week={selectedWeek} />
        <div className="text-center mt-4 space-y-1">
          <p className="text-[13px] font-extrabold tracking-wide uppercase text-rosa">
            {info.trimester}º trimestre · {gestationMonth(selectedWeek)}º mês{selectedWeek !== currentWeek && ' · outra semana'}
          </p>
          <h2 className="text-[1.5rem] leading-snug text-ink text-balance">Do tamanho de {info.fruit}</h2>
          <p className="text-sm text-ink-soft tabular">
            {info.size} · {info.weight}
          </p>
          <p className="text-[15px] text-ink pt-2 text-balance">{info.milestone}</p>
        </div>

        <div className="mt-5">
          <WeekStrip selected={selectedWeek} current={currentWeek} onSelect={onSelectWeek} />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-ink-soft">
          <span className="tabular">
            {age.daysToDpp >= 0 ? <>Faltam <strong className="text-ink">{age.daysToDpp} dias</strong> · DPP {age.dpp.toLocaleDateString('pt-BR')}</> : <>DPP foi em {age.dpp.toLocaleDateString('pt-BR')}</>}
          </span>
          <span className="flex items-center gap-1">
            {selectedWeek !== currentWeek && <LinkButton onClick={() => onSelectWeek(currentWeek)}>Voltar para hoje</LinkButton>}
            <button onClick={() => setEditingDum(v => !v)} aria-label="Alterar a DUM" className="w-9 h-9 rounded-full hover:bg-surface-2 text-ink-mute flex items-center justify-center">
              <Pencil className="w-4 h-4" />
            </button>
          </span>
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
      </section>

      <PushPrompt />

      <section aria-labelledby="hoje-titulo" className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="hoje-titulo" className="text-[1.3rem] text-ink">Hoje</h2>
          {cards.length > 1 && <span className="text-sm text-ink-mute">{cards.length} coisas para vocês</span>}
        </div>
        {cards.length === 0 ? (
          <div className="rounded-[24px] bg-rosa-soft px-5 py-4 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-rosa-strong shrink-0" />
            <p className="text-ink">Tudo em dia por aqui. Aproveitem a semana.</p>
          </div>
        ) : (
          <ul className="-mx-4 px-4 md:mx-0 md:px-0 flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1">
            {cards.map(card => {
              const tone = TONE[card.tone];
              return (
                <li key={card.id} className={`snap-start shrink-0 w-[78%] max-w-[270px] rounded-[24px] p-4 flex flex-col gap-2 ${tone.card}`}>
                  <p className={`flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wide [&_svg]:w-4 [&_svg]:h-4 ${tone.label}`}>
                    {cardIcon(card)} {card.label}
                  </p>
                  <p className="font-display text-[1.1rem] leading-snug text-ink line-clamp-3">{card.title}</p>
                  {card.detail && <p className="text-sm text-ink-soft">{card.detail}</p>}
                  {card.action && (
                    <button type="button" onClick={() => act(card.action!.do)} disabled={card.action.do.kind === 'feito' && (!props.checksAvailable)} className={`mt-auto self-start inline-flex items-center gap-1.5 text-sm font-extrabold py-1 disabled:opacity-50 ${tone.action}`}>
                      {card.action.do.kind === 'concluir' || card.action.do.kind === 'feito' ? <Check className="w-4 h-4" /> : null}
                      {card.action.label}
                      {card.action.do.kind !== 'concluir' && card.action.do.kind !== 'feito' ? <ArrowRight className="w-4 h-4" /> : null}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid md:grid-cols-2 gap-5">
        <Card>
          <SectionTitle icon={<NotebookPen className="w-5 h-5" />} title="Como ela está" action={<LinkButton onClick={() => onOpen('diario')}>Ver diário</LinkButton>} />
          {recentSymptoms.length === 0 && !lastWeight && !lastBp ? (
            <p className="text-ink-soft">Nada registrado ainda. Toque no + para o primeiro registro: em poucas semanas aparecem os padrões.</p>
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

        <Card>
          <SectionTitle icon={<Route className="w-5 h-5" />} title={`Fase: ${phase.title}`} subtitle={`${phase.label} · ${phase.visits.toLowerCase()}`} action={<LinkButton onClick={() => onOpen('jornada')}>Ver jornada</LinkButton>} />
          <PhaseStrip week={currentWeek} />
          <Guide className="mt-4">{phase.focus}</Guide>
        </Card>

        {otherInsights.length > 0 && (
          <Card>
            <SectionTitle icon={<Lightbulb className="w-5 h-5" />} title="Padrões recentes" action={<LinkButton onClick={() => onOpen('graficos')}>Ver gráficos</LinkButton>} />
            <InsightList insights={otherInsights} compact />
          </Card>
        )}
      </div>

      <details className="rounded-[28px] bg-surface shadow-soft p-5 md:p-6 group">
        <summary className="cursor-pointer font-semibold text-ink flex items-center gap-2 list-none">
          <Siren className="w-5 h-5 text-alert" /> Quando procurar a maternidade
          <span className="ml-auto text-sm font-bold text-brand-strong group-open:hidden">Ver</span>
        </summary>
        <p className="text-sm text-ink-soft mt-3">Procurem atendimento sem esperar a próxima consulta se aparecer:</p>
        <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-ink">
          {ALERT_SIGNS.map(s => <li key={s} className="flex gap-2"><span className="text-alert">•</span>{s}</li>)}
        </ul>
      </details>
    </div>
  );
}
