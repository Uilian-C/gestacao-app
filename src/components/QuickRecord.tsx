import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { ParsedMetric } from '../lib/health';
import type { Author, SymptomItem } from '../types';
import { MetricForm, MomentForm, SymptomForm, type NewEntry, type NewSymptom } from './forms/RecordForms';
import { ScheduleForm, type NewConsultation } from './tabs/ConsultationsTab';
import { Segmented } from './ui';

export type QuickMode = 'sintoma' | 'medicao' | 'momento' | 'consulta';

const LABEL: Record<QuickMode, string> = { sintoma: 'Sintoma', medicao: 'Peso e pressão', momento: 'Momento', consulta: 'Consulta' };
const TITLE: Record<QuickMode, string> = { sintoma: 'Registrar sintoma', medicao: 'Registrar peso ou pressão', momento: 'Guardar momento', consulta: 'Agendar consulta' };

export interface QuickRecordProps {
  author: Author;
  trimester: 1 | 2 | 3;
  currentWeek: number;
  symptoms: SymptomItem[];
  busy: boolean;
  journalAvailable: boolean;
  onCreateSymptom: (s: NewSymptom) => Promise<boolean>;
  onCreateMetric: (m: ParsedMetric) => Promise<boolean>;
  onCreateEntry: (e: NewEntry) => Promise<boolean>;
  onCreateConsultation: (c: NewConsultation) => Promise<boolean>;
}

/**
 * Registro sem sair da tela: os mesmos formulários do Diário numa janela que
 * sobe por cima do Painel. Ao salvar, fecha e o painel já mostra o dado novo.
 */
export default function QuickRecord({ modes, initial, onClose, ...p }: QuickRecordProps & { modes: QuickMode[]; initial: QuickMode; onClose: () => void }) {
  const [mode, setMode] = useState<QuickMode>(initial);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const done = <T,>(fn: (v: T) => Promise<boolean>) => async (v: T) => {
    const ok = await fn(v);
    if (ok) onClose();
    return ok;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="quick-title">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-surface rounded-t-[28px] sm:rounded-[28px] shadow-lift p-5 sm:p-7 space-y-4 pb-[calc(env(safe-area-inset-bottom)+20px)]">
        <div className="flex items-center justify-between gap-3">
          <h2 id="quick-title" className="text-[1.25rem]">{TITLE[mode]}</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Fechar" className="w-9 h-9 rounded-full bg-surface-2 text-ink-soft flex items-center justify-center hover:text-ink">
            <X className="w-4 h-4" />
          </button>
        </div>
        {modes.length > 1 && <Segmented label="Tipo de registro" size="sm" value={mode} onChange={setMode} options={modes.map(m => ({ value: m, label: LABEL[m] }))} />}
        {mode === 'sintoma' && <SymptomForm trimester={p.trimester} history={p.symptoms} busy={p.busy} currentWeek={p.currentWeek} onCreate={done(p.onCreateSymptom)} />}
        {mode === 'medicao' && <MetricForm author={p.author} busy={p.busy} currentWeek={p.currentWeek} onCreate={done(p.onCreateMetric)} />}
        {mode === 'momento' && <MomentForm busy={p.busy} available={p.journalAvailable} onCreate={done(p.onCreateEntry)} />}
        {mode === 'consulta' && <ScheduleForm busy={p.busy} startOpen onCreate={done(p.onCreateConsultation)} onClose={onClose} />}
      </div>
    </div>
  );
}
