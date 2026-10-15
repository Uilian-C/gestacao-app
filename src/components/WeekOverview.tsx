import { useState } from 'react';
import { Activity, Baby, Calendar, Pencil, Scale } from 'lucide-react';
import { GESTATION_WEEKS, weekInfo } from '../data/weeks';
import { FIRST_WEEK, LAST_WEEK, toISODate, type GestationalAge } from '../lib/dates';

interface Props {
  dumDate: string;
  age: GestationalAge | null;
  selectedWeek: number;
  currentWeek: number;
  onSelectWeek: (week: number) => void;
  onSaveDum: (iso: string) => Promise<boolean>;
}

export default function WeekOverview({ dumDate, age, selectedWeek, currentWeek, onSelectWeek, onSaveDum }: Props) {
  const [editingDum, setEditingDum] = useState(false);
  const info = weekInfo(selectedWeek);
  const progress = Math.min(100, ((selectedWeek - FIRST_WEEK) / (40 - FIRST_WEEK)) * 100);

  return (
    <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 bg-rose-50 text-rose-600 rounded-full">{info.trimester}º trimestre</span>
            {age && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> DPP: <strong>{age.dpp.toLocaleDateString('pt-BR')}</strong>
                {age.daysToDpp >= 0 ? ` (faltam ${age.daysToDpp} dias)` : ` (${-age.daysToDpp} dias após a DPP)`}
              </span>
            )}
            <button onClick={() => setEditingDum(v => !v)} className="text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1 underline underline-offset-2">
              <Pencil className="w-3 h-3" /> Alterar DUM
            </button>
          </div>
          <h2 className="text-xl font-bold text-slate-800">
            Desenvolvimento da semana {selectedWeek}
            {selectedWeek !== currentWeek && (
              <button onClick={() => onSelectWeek(currentWeek)} className="ml-3 align-middle text-xs font-semibold text-rose-600 underline underline-offset-2">
                voltar para a semana atual
              </button>
            )}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="semana-visivel" className="text-xs text-slate-500 font-semibold">Semana visível:</label>
          <select
            id="semana-visivel"
            value={selectedWeek}
            onChange={e => onSelectWeek(Number(e.target.value))}
            className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 font-bold text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
          >
            {GESTATION_WEEKS.map(w => (
              <option key={w.week} value={w.week}>
                Semana {w.week} {w.week === currentWeek ? '(atual)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {editingDum && (
        <DumForm
          initial={dumDate}
          onCancel={() => setEditingDum(false)}
          onSave={async iso => {
            if (await onSaveDum(iso)) setEditingDum(false);
          }}
        />
      )}

      {age?.isPostTerm && (
        <p className="text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-3">
          Vocês passaram das 40 semanas. Combinem com o obstetra a frequência das avaliações a partir de agora.
        </p>
      )}

      <div className="space-y-1.5 pt-1">
        <div className="flex justify-between text-[11px] font-bold text-slate-500 px-1">
          <span>Sem. {FIRST_WEEK}</span>
          <span>13 (fim do 1º tri)</span>
          <span>27 (fim do 2º tri)</span>
          <span>40</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200" role="progressbar" aria-valuemin={FIRST_WEEK} aria-valuemax={LAST_WEEK} aria-valuenow={selectedWeek}>
          <div className="h-full bg-gradient-to-r from-rose-400 via-pink-500 to-indigo-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <Fact icon={<Baby className="w-6 h-6" />} tone="bg-rose-500" bg="bg-rose-50/50 border-rose-100" label="Tamanho comparável a" value={info.fruit} />
        <Fact icon={<Activity className="w-6 h-6" />} tone="bg-blue-500" bg="bg-blue-50/50 border-blue-100" label="Comprimento estimado" value={info.size} />
        <Fact icon={<Scale className="w-6 h-6" />} tone="bg-emerald-500" bg="bg-emerald-50/50 border-emerald-100" label="Peso aproximado" value={info.weight} />
      </div>
    </section>
  );
}

function Fact({ icon, tone, bg, label, value }: { icon: React.ReactNode; tone: string; bg: string; label: string; value: string }) {
  return (
    <div className={`${bg} p-4 rounded-xl border flex items-center gap-3`}>
      <div className={`p-3 ${tone} text-white rounded-lg shadow-sm`}>{icon}</div>
      <div>
        <span className="text-xs text-slate-500 block font-medium">{label}</span>
        <span className="font-bold text-slate-800 text-base">{value}</span>
      </div>
    </div>
  );
}

export function DumForm({ initial, onSave, onCancel }: { initial?: string; onSave: (iso: string) => void; onCancel?: () => void }) {
  const [value, setValue] = useState(initial ?? '');
  const today = toISODate(new Date());
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        if (value) onSave(value);
      }}
      className="flex flex-col sm:flex-row sm:items-end gap-3 bg-slate-50 border rounded-xl p-4"
    >
      <div className="flex-1 space-y-1">
        <label htmlFor="dum" className="text-xs font-semibold text-slate-600 block">Data da última menstruação (DUM)</label>
        <input id="dum" type="date" required max={today} value={value} onChange={e => setValue(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-white" />
        <p className="text-[11px] text-slate-500">Se o obstetra corrigiu a idade gestacional pelo ultrassom, use a DUM corrigida que ele informou.</p>
      </div>
      <div className="flex gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 border bg-white">
            Cancelar
          </button>
        )}
        <button type="submit" className="px-4 py-2 rounded-xl text-sm font-bold bg-rose-500 text-white">
          Salvar DUM
        </button>
      </div>
    </form>
  );
}
