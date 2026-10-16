import { useState } from 'react';
import { CalendarHeart, CheckCircle2, ChevronLeft, ChevronRight, Lightbulb, NotebookPen, Pencil, Siren } from 'lucide-react';
import { weekInfo } from '../../data/weeks';
import { specialtyOf, questionSpecialty } from '../../data/specialties';
import { ALERT_SIGNS } from '../../data/symptomCatalog';
import { FIRST_WEEK, LAST_WEEK, daysBetween, formatBR, isOverdue, localDay, parseTimestamp, type GestationalAge } from '../../lib/dates';
import { isHighBloodPressure } from '../../lib/health';
import type { Insight } from '../../lib/symptoms';
import type { Consultation, HealthMetric, PartnerTask, QuestionItem, SymptomItem, Tab } from '../../types';
import AuthorBadge from '../AuthorBadge';
import { DumForm } from '../DumForm';
import { Button, Card, Pill, SectionTitle } from '../ui';
import { InsightList } from '../InsightList';
import IntensityDots from '../IntensityDots';

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
}

export default function HomeTab(props: Props) {
  const { age, selectedWeek, currentWeek, onSelectWeek, nextConsultation, questions, symptoms, metrics, tasks, insights, onToggleTask, onNavigate, onPrepareReport, onOpenTasks } = props;
  const [editingDum, setEditingDum] = useState(false);
  const info = weekInfo(selectedWeek);
  const progress = Math.min(100, (selectedWeek / 40) * 100);
  const today = new Date();

  const alerts = insights.filter(i => i.tone === 'alerta');
  const otherInsights = insights.filter(i => i.tone !== 'alerta').slice(0, 3);

  const recentSymptoms = symptoms.slice(0, 3);
  const lastWeight = [...metrics].reverse().find(m => m.weight_kg !== null);
  const lastBp = [...metrics].reverse().find(m => m.systolic_bp !== null && m.diastolic_bp !== null);

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
        <div className="flex flex-col sm:flex-row gap-5 sm:items-center">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-surface flex items-center justify-center text-5xl sm:text-6xl shrink-0 shadow-sm" aria-hidden>
            {info.emoji}
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="warm">{info.trimester}º trimestre</Pill>
              {selectedWeek !== currentWeek && <Pill>vendo outra semana</Pill>}
            </div>
            <h2 className="text-2xl font-extrabold text-ink text-balance">
              Semana {selectedWeek}: o bebê está do tamanho de {info.fruit}
            </h2>
            <p className="text-ink-soft">{info.milestone}</p>
            <p className="text-sm text-ink-mute tabular">
              Cerca de {info.size} e {info.weight}
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <div className="h-2.5 rounded-full bg-surface overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={40} aria-valuenow={selectedWeek} aria-label="Progresso da gestação">
            <div className="h-full rounded-full bg-warm transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex flex-wrap justify-between gap-2 text-sm text-ink-soft">
            <span className="tabular">
              {age.daysToDpp >= 0 ? <>Faltam <strong className="text-ink">{age.daysToDpp} dias</strong> para a DPP ({age.dpp.toLocaleDateString('pt-BR')})</> : <>DPP foi em {age.dpp.toLocaleDateString('pt-BR')}</>}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => onSelectWeek(Math.max(FIRST_WEEK, selectedWeek - 1))} disabled={selectedWeek <= FIRST_WEEK} aria-label="Semana anterior" className="p-1.5 rounded-full hover:bg-surface disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {selectedWeek !== currentWeek ? (
                <button onClick={() => onSelectWeek(currentWeek)} className="text-sm font-bold text-warm underline underline-offset-2 px-1">voltar para hoje</button>
              ) : (
                <span className="text-sm px-1">explorar semanas</span>
              )}
              <button onClick={() => onSelectWeek(Math.min(LAST_WEEK, selectedWeek + 1))} disabled={selectedWeek >= LAST_WEEK} aria-label="Próxima semana" className="p-1.5 rounded-full hover:bg-surface disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <button onClick={() => setEditingDum(v => !v)} className="text-xs text-ink-mute hover:text-ink inline-flex items-center gap-1 underline underline-offset-2">
            <Pencil className="w-3 h-3" /> Alterar a DUM
          </button>
          {editingDum && (
            <DumForm
              initial={props.dumDate}
              onCancel={() => setEditingDum(false)}
              onSave={async iso => {
                if (await props.onSaveDum(iso)) setEditingDum(false);
              }}
            />
          )}
          {age.isPostTerm && <p className="text-sm text-warn bg-warn-soft rounded-2xl px-4 py-3">Vocês passaram das 40 semanas. Combinem com o obstetra a frequência das avaliações a partir de agora.</p>}
        </div>
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

        <Card>
          <SectionTitle
            icon={<Lightbulb className="w-5 h-5" />}
            title="Padrões das últimas semanas"
            action={<Button tone="soft" className="!px-3 !py-1.5" onClick={() => onNavigate('painel')}>Ver painel</Button>}
          />
          {otherInsights.length ? <InsightList insights={otherInsights} compact /> : <p className="text-ink-soft">Ainda não há padrões. Eles aparecem conforme vocês registram os sintomas.</p>}
        </Card>

        <Card>
          <SectionTitle
            icon={<CheckCircle2 className="w-5 h-5" />}
            title="Para esta semana"
            action={<Button tone="soft" className="!px-3 !py-1.5" onClick={onOpenTasks}>Ver tarefas</Button>}
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
          ) : (
            <p className="text-ink-soft">Nada pendente nesta semana. 🌿</p>
          )}
        </Card>
      </div>

      <details className="rounded-3xl border border-line bg-surface p-5 group">
        <summary className="cursor-pointer font-bold text-ink flex items-center gap-2 list-none">
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
        <span className="text-3xl" aria-hidden>{spec.emoji}</span>
        <div>
          <p className="font-bold text-ink">{spec.label}</p>
          <p className="text-ink-soft text-sm">
            {when.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} às {when.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
          {consultation.professional_name && <p className="text-sm text-ink-mute">{consultation.professional_name}</p>}
        </div>
        <Pill tone={days <= 2 ? 'warm' : 'brand'}>{days === 0 ? 'hoje' : days === 1 ? 'amanhã' : `em ${days} dias`}</Pill>
      </div>
      <p className="text-sm text-ink-soft">{pending > 0 ? `${pending} ${pending === 1 ? 'dúvida anotada' : 'dúvidas anotadas'} para levar.` : 'Nenhuma dúvida anotada para esta consulta ainda.'}</p>
      <Button onClick={onPrepare}>Preparar resumo da consulta</Button>
    </div>
  );
}
