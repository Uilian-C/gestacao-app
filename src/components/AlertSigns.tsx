import { Siren } from 'lucide-react';
import { ALERT_SIGNS } from '../content/symptomCatalog';

/** "Quando procurar a maternidade": a lista dos sinais, recolhida (Cuidados → Saúde) ou aberta (folha de alerta do Início). */
export default function AlertSigns({ open = false }: { open?: boolean }) {
  const list = (
    <>
      <p className="text-sm text-ink-soft mt-3">Procurem atendimento sem esperar a próxima consulta se aparecer:</p>
      <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-ink">
        {ALERT_SIGNS.map(s => (
          <li key={s} className="flex gap-2">
            <span className="text-alert">•</span>
            {s}
          </li>
        ))}
      </ul>
    </>
  );
  if (open) {
    return (
      <div>
        <p className="font-semibold text-ink flex items-center gap-2">
          <Siren className="w-5 h-5 text-alert" /> Quando procurar a maternidade
        </p>
        {list}
      </div>
    );
  }
  return (
    <details className="rounded-[28px] bg-surface shadow-soft p-5 md:p-6 group">
      <summary className="cursor-pointer font-semibold text-ink flex items-center gap-2 list-none">
        <Siren className="w-5 h-5 text-alert" /> Quando procurar a maternidade
        <span className="ml-auto text-sm font-bold text-brand-strong group-open:hidden">Ver</span>
      </summary>
      {list}
    </details>
  );
}
