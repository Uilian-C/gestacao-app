import { useState } from 'react';
import { Activity, ArrowLeft, CalendarPlus, ChevronRight, FileCheck2, Heart, ListTodo, Scale, Sparkles } from 'lucide-react';
import type { Folder } from '../hooks/useGestationData';
import type { Author, HealthMetric, SymptomItem } from '../types';
import { EntryForm, type NewEntry } from './forms/EntryForm';
import { MetricForm, SymptomForm, type NewMetric, type NewSymptom } from './forms/RecordForms';
import { ScheduleForm, type NewConsultation } from './tabs/ConsultationsTab';
import { planExams } from '../lib/journey';
import { ExamForm, type SaveExam } from './tabs/ExamsTab';
import { TaskForm, type NewTask } from './tabs/TasksTab';
import Sheet from './Sheet';
import { guessRecord, symptomOf } from '../lib/recordIntent';
import { inputClass } from './styles';

export type QuickMode = 'sintoma' | 'medicao' | 'momento' | 'consulta' | 'tarefa' | 'exame';

const ICON: Record<QuickMode, typeof Activity> = { sintoma: Activity, momento: Heart, medicao: Scale, consulta: CalendarPlus, tarefa: ListTodo, exame: FileCheck2 };

/** O nome curto de cada tipo (também o começo do nome acessível de cada opção). */
const LABEL: Record<QuickMode, string> = { sintoma: 'Sintoma', medicao: 'Peso e pressão', momento: 'Diário', consulta: 'Agendar', tarefa: 'Tarefa', exame: 'Resultado' };

/** Cada tipo na língua de quem registra: o que é e um exemplo, sem precisar saber onde fica no app. */
const CHOICE: Record<QuickMode, { title: string; hint: string; tone: string }> = {
  momento: { title: 'Um momento', hint: 'Uma foto, um sentimento, uma carta para o bebê', tone: 'bg-rosa-soft text-rosa-strong' },
  sintoma: { title: 'Como estou me sentindo', hint: 'Enjoo, azia, cansaço... vira gráfico para a consulta', tone: 'bg-coral-soft text-coral-strong' },
  medicao: { title: 'Peso ou pressão', hint: 'Os números do dia', tone: 'bg-azul-soft text-azul-strong' },
  consulta: { title: 'Marcar consulta ou exame', hint: 'Vai para a agenda, com lembrete na véspera', tone: 'bg-lilas-soft text-lilas-strong' },
  exame: { title: 'Guardar um resultado', hint: 'Laudo, foto ou vídeo do ultrassom, PDF', tone: 'bg-verde-soft text-verde-strong' },
  tarefa: { title: 'Uma tarefa', hint: 'Algo para fazer, sozinho ou a dois', tone: 'bg-warm-soft text-warm' },
};

const TITLE: Record<QuickMode, string> = {
  sintoma: 'Como você está se sentindo?',
  medicao: 'Peso ou pressão',
  momento: 'Guardar no diário',
  consulta: 'Agendar',
  tarefa: 'Nova tarefa',
  exame: 'Guardar resultado',
};

export interface QuickRecordProps {
  author: Author;
  trimester: 1 | 2 | 3;
  currentWeek: number;
  symptoms: SymptomItem[];
  busy: boolean;
  journalAvailable: boolean;
  photosAvailable: boolean;
  dumDate: string;
  /** Pasta em que o diário abre (a que estava aberta) e um texto para começar. */
  entryFolder?: Folder;
  entryIdea?: string;
  /** A última foto da barriga (o guia da pose). */
  lastBelly?: { src: string; week: number } | null;
  onCreateSymptom: (s: NewSymptom) => Promise<boolean>;
  onCreateMetric: (m: NewMetric) => Promise<boolean>;
  /** Medições, para mostrar a última ao lado do campo. */
  metrics: HealthMetric[];
  onCreateEntry: (e: NewEntry) => Promise<boolean>;
  onCreateConsultation: (c: NewConsultation) => Promise<boolean>;
  selectedWeek: number;
  onCreateTask: (t: NewTask) => Promise<boolean>;
  bloodType: string | null;
  examsAvailable: boolean;
  onSaveExam: SaveExam;
}

/**
 * Registro sem sair da tela, aberto pelo botão "Registrar". Com mais de um tipo
 * possível, começa por uma pergunta só ("O que vocês querem guardar?"): a
 * pessoa escreve do jeito dela e o Tumtum sugere onde guardar, ou toca num dos
 * tipos, cada um explicado em uma linha. Escolhido o tipo, a janela mostra só
 * aquele formulário (com o que já foi escrito), e "Trocar" volta à pergunta.
 * Vindo de um lugar que já diz o tipo (uma pasta, "Ver resultado"), abre direto no formulário.
 */
export default function QuickRecord({ modes, initial, direct = false, onClose, ...p }: QuickRecordProps & { modes: QuickMode[]; initial: QuickMode; direct?: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<QuickMode | null>(direct || modes.length === 1 ? initial : null);
  const [text, setText] = useState('');
  const guesses = guessRecord(text, modes);
  const typed = text.trim();

  const done = <T,>(fn: (v: T) => Promise<boolean>) => async (v: T) => {
    const ok = await fn(v);
    if (ok) onClose();
    return ok;
  };

  if (!mode) {
    const pai = p.author === 'pai';
    const title = (m: QuickMode) => (m === 'sintoma' && pai ? 'Como ela está se sentindo' : CHOICE[m].title);
    const best = guesses[0];
    const symptom = best === 'sintoma' ? symptomOf(typed) : null;
    const compact = !!best;
    return (
      <Sheet icon={<Sparkles />} title="O que vocês querem guardar?" subtitle="Escreva do seu jeito, ou escolha abaixo." onClose={onClose}>
        <div className="space-y-4">
          <textarea
            aria-label="Conte com suas palavras"
            rows={2}
            className={`${inputClass} resize-none`}
            placeholder={pai ? 'Ex.: ela ficou enjoada de manhã, marcamos o ultrassom...' : 'Ex.: estou enjoada, ouvimos o coração, marquei a consulta...'}
            value={text}
            onChange={e => setText(e.target.value)}
          />
          {best && (
            <div aria-live="polite">
              <button
                type="button"
                onClick={() => setMode(best)}
                aria-label={`Guardar como ${LABEL[best]}`}
                className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left shadow-soft transition active:scale-[0.99] ${CHOICE[best].tone}`}
              >
                <Choice mode={best} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[12px] font-extrabold uppercase tracking-wide opacity-80">Guardar como</span>
                  <span className="block font-display text-[1.1rem] leading-snug text-ink">
                    {title(best)}
                    {symptom && ` · ${symptom}`}
                  </span>
                </span>
                <ChevronRight className="w-5 h-5 shrink-0" />
              </button>
            </div>
          )}
          {/* Com uma sugestão na tela, os tipos viram pílulas: a escolha continua à mão, sem pesar. */}
          {compact && <p className="-mb-2 px-1 text-[12.5px] text-ink-mute">Ou guarde como:</p>}
          <div role="group" aria-label="Tipo de registro" className={compact ? 'flex flex-wrap gap-1.5 pt-1' : 'space-y-1.5'}>
            {modes.map(m => {
              const Icon = ICON[m];
              return compact ? (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  aria-label={`${LABEL[m]}: ${title(m).toLowerCase()}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-[13px] font-bold text-ink-soft hover:text-ink"
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden /> {title(m)}
                </button>
              ) : (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  aria-label={`${LABEL[m]}: ${title(m).toLowerCase()}`}
                  className="w-full flex items-center gap-3 rounded-2xl bg-surface-2/70 px-3 py-2.5 text-left transition hover:bg-surface-2 active:scale-[0.99]"
                >
                  <Choice mode={m} />
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-ink leading-snug">{title(m)}</span>
                    <span className="block text-[12.5px] text-ink-soft leading-snug">{CHOICE[m].hint}</span>
                  </span>
                  <ChevronRight className="w-4 h-4 shrink-0 text-ink-mute" />
                </button>
              );
            })}
          </div>
        </div>
      </Sheet>
    );
  }

  const Icon = ICON[mode];
  // O que foi escrito na pergunta segue para o formulário (no momento, no sintoma e na tarefa).
  const carried = typed || undefined;
  return (
    <Sheet
      icon={<Icon />}
      title={mode === 'sintoma' && p.author === 'pai' ? 'Como ela está se sentindo?' : TITLE[mode]}
      subtitle={
        modes.length > 1 ? (
          <button type="button" onClick={() => setMode(null)} className="inline-flex items-center gap-1 text-[13px] font-bold text-brand-strong">
            <ArrowLeft className="w-3.5 h-3.5" /> Trocar o tipo
          </button>
        ) : undefined
      }
      onClose={onClose}
    >
      <div className="space-y-4">
        {mode === 'sintoma' && <SymptomForm author={p.author} dumDate={p.dumDate} trimester={p.trimester} history={p.symptoms} busy={p.busy} startName={carried} onCreate={done(p.onCreateSymptom)} />}
        {mode === 'medicao' && (
          <MetricForm
            busy={p.busy}
            dumDate={p.dumDate}
            onCreate={done(p.onCreateMetric)}
            last={{ weight: [...p.metrics].reverse().find(m => m.weight_kg !== null) ?? null, pressure: [...p.metrics].reverse().find(m => m.systolic_bp !== null) ?? null }}
          />
        )}
        {mode === 'momento' && <EntryForm busy={p.busy} available={p.journalAvailable} photosAvailable={p.photosAvailable} dumDate={p.dumDate} folder={p.entryFolder} idea={carried ?? p.entryIdea} lastBelly={p.lastBelly} onSave={done(p.onCreateEntry)} />}
        {mode === 'consulta' && <ScheduleForm busy={p.busy} startOpen onCreate={done(p.onCreateConsultation)} onClose={onClose} />}
        {mode === 'tarefa' && <TaskForm selectedWeek={p.selectedWeek} busy={p.busy} startTitle={carried} onCreate={done(p.onCreateTask)} onCancel={onClose} />}
        {mode === 'exame' &&
          (p.examsAvailable ? (
            <ExamForm bare plan={planExams(p.bloodType)} preset={null} busy={p.busy} onSave={p.onSaveExam} onDone={onClose} />
          ) : (
            <p className="text-sm text-warn bg-warn-soft rounded-2xl p-4">Para guardar exames, rode a migração 010 no Neon.</p>
          ))}
      </div>
    </Sheet>
  );
}

/** O ícone de cada tipo, num quadradinho com a cor dele. */
function Choice({ mode }: { mode: QuickMode }) {
  const Icon = ICON[mode];
  return (
    <span className={`w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center ${CHOICE[mode].tone}`} aria-hidden>
      <Icon className="w-5 h-5" />
    </span>
  );
}
