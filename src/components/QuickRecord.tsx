import { useState } from 'react';
import type { ParsedMetric } from '../lib/health';
import type { Folder } from '../hooks/useGestationData';
import type { Author, SymptomItem } from '../types';
import { EntryForm, type NewEntry } from './forms/EntryForm';
import { MetricForm, SymptomForm, type NewSymptom } from './forms/RecordForms';
import { ScheduleForm, type NewConsultation } from './tabs/ConsultationsTab';
import { planExams } from '../lib/journey';
import { ExamForm, type SaveExam } from './tabs/ExamsTab';
import { TaskForm, type NewTask } from './tabs/TasksTab';
import Sheet from './Sheet';
import { Segmented } from './ui';

export type QuickMode = 'sintoma' | 'medicao' | 'momento' | 'consulta' | 'tarefa' | 'exame';

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
  onCreateSymptom: (s: NewSymptom) => Promise<boolean>;
  onCreateMetric: (m: ParsedMetric) => Promise<boolean>;
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
        {modes.length > 1 && <Segmented label="Tipo de registro" size="sm" value={mode} onChange={setMode} options={modes.map(m => ({ value: m, label: LABEL[m] }))} />}
        {mode === 'sintoma' && <SymptomForm trimester={p.trimester} history={p.symptoms} busy={p.busy} currentWeek={p.currentWeek} onCreate={done(p.onCreateSymptom)} />}
        {mode === 'medicao' && <MetricForm author={p.author} busy={p.busy} currentWeek={p.currentWeek} onCreate={done(p.onCreateMetric)} />}
        {mode === 'momento' && <EntryForm busy={p.busy} available={p.journalAvailable} photosAvailable={p.photosAvailable} dumDate={p.dumDate} folder={p.entryFolder} idea={p.entryIdea} onSave={done(p.onCreateEntry)} />}
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
