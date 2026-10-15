import type { GestationalAge } from '../../lib/dates';

export default function SummaryTab({ age }: { age: GestationalAge | null }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-6">
      <div className="border-b pb-4 flex justify-between items-start">
        <h3 className="text-xl font-bold">Resumo para a consulta</h3>
        <button onClick={() => window.print()} className="bg-slate-800 text-white text-xs px-3 py-2 rounded-lg font-bold">
          Imprimir / salvar PDF
        </button>
      </div>
      {age && (
        <div className="grid grid-cols-3 gap-4 text-sm bg-slate-50 p-4 rounded-xl border">
          <div>
            <span className="text-slate-500 block text-xs">Idade gestacional</span>
            <strong>{age.weeks} sem + {age.days}d</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-xs">Trimestre</span>
            <strong>{age.trimester}º</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-xs">DPP</span>
            <strong>{age.dpp.toLocaleDateString('pt-BR')}</strong>
          </div>
        </div>
      )}
      <p className="text-xs text-slate-500">O relatório completo, com sintomas, medições e dúvidas pendentes, chega na próxima etapa.</p>
    </div>
  );
}
