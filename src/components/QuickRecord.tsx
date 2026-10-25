import { useState } from 'react';
import { Activity, CalendarPlus, FileCheck2, ListTodo, NotebookPen, Scale } from 'lucide-react';
import type { Folder } from '../hooks/useGestationData';
import type { Author, HealthMetric, SymptomItem } from '../types';
import { EntryForm, type NewEntry } from './forms/EntryForm';
import { MetricForm, SymptomForm, type NewMetric, type NewSymptom } from './forms/RecordForms';
import { ScheduleForm, type NewConsultation } from './tabs/ConsultationsTab';
import { planExams } from '../lib/journey';
import { ExamForm, type SaveExam } from './tabs/ExamsTab';
import { TaskForm, type NewTask } from './tabs/TasksTab';
import Sheet from './Sheet';
import { Segmented } from './ui';

export type QuickMode = 'sintoma' | 'medicao' | 'momento' | 'consulta' | 'tarefa' | 'exame';

const ICON: Record<QuickMode, typeof Activity> = { sintoma: Activity, momento: NotebookPen, medicao: Scale, consulta: CalendarPlus, tarefa: ListTodo, exame: FileCheck2 };

const LABEL: Record<QuickMode, string> = { sintoma: 'Sintoma', medicao: 'Peso e pressão', momento: 'Diário', consulta: 'Agendar', tarefa: 'Tarefa', exame: 'Resultado' };
const TITLE: Record<QuickMode, string> = {
  sintoma: 'Registrar sintoma',
  medicao: 'Registrar peso ou pressão',
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
 * Registro sem sair da tela: os mesmos formulários de cada aba numa janela que
 * sobe por cima, aberta pelo botão "+". Ao salvar, fecha e a tela já mostra o dado novo.
 */
export default function QuickRecord({ modes, initial, onClose, ...p }: QuickRecordProps & { modes: QuickMode[]; initial: QuickMode; onClose: () => void }) {
  const [mode, setMode] = useState<QuickMode>(initial);

  const done = <T,>(fn: (v: T) => Promise<boolean>) => async (v: T) => {
    const ok = await fn(v);
    if (ok) onClose();
    return ok;
  };

  return (
    <Sheet title={TITLE[mode]} onClose={onClose}>
      <div className="space-y-4">
        {modes.length > 3 ? (
          // Muitos tipos (Início): uma grade de ícones, sem quebrar linha no meio.
          <div role="group" aria-label="Tipo de registro" className="grid grid-cols-3 gap-2">
            {modes.map(m => {
              const Icon = ICON[m];
              return (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => setMode(m)}
                  className={`flex flex-col items-center gap-1 rounded-2xl px-1 py-2.5 text-[12px] font-bold transition ${mode === m ? 'bg-brand text-on-accent shadow-soft' : 'bg-surface-2 text-ink-soft hover:text-ink'}`}
                >
                  <Icon className="w-5 h-5" aria-hidden />
                  {LABEL[m]}
                </button>
              );
            })}
          </div>
        ) : (
          modes.length > 1 && <Segmented label="Tipo de registro" size="sm" value={mode} onChange={setMode} options={modes.map(m => ({ value: m, label: LABEL[m] }))} />
        )}
        {mode === 'sintoma' && <SymptomForm author={p.author} dumDate={p.dumDate} trimester={p.trimester} history={p.symptoms} busy={p.busy} onCreate={done(p.onCreateSymptom)} />}
        {mode === 'medicao' && (
          <MetricForm
            busy={p.busy}
            dumDate={p.dumDate}
            onCreate={done(p.onCreateMetric)}
            last={{ weight: [...p.metrics].reverse().find(m => m.weight_kg !== null) ?? null, pressure: [...p.metrics].reverse().find(m => m.systolic_bp !== null) ?? null }}
          />
        )}
        {mode === 'momento' && <EntryForm busy={p.busy} available={p.journalAvailable} photosAvailable={p.photosAvailable} dumDate={p.dumDate} folder={p.entryFolder} idea={p.entryIdea} lastBelly={p.lastBelly} onSave={done(p.onCreateEntry)} />}
        {mode === 'consulta' && <ScheduleForm busy={p.busy} startOpen onCreate={done(p.onCreateConsultation)} onClose={onClose} />}
        {mode === 'tarefa' && <TaskForm selectedWeek={p.selectedWeek} busy={p.busy} onCreate={done(p.onCreateTask)} onCancel={onClose} />}
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
