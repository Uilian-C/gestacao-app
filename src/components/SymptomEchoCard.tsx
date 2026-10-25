import { useEffect } from 'react';
import { Activity, ChevronRight, Lightbulb } from 'lucide-react';
import type { SymptomEcho } from '../lib/echo';

// Logo depois de registrar um sintoma: o que costuma ajudar e o padrão da
// semana, num cartão que some sozinho. "Ver em Sintomas" leva aos gráficos.

export default function SymptomEchoCard({ echo, onOpen, onClose }: { echo: SymptomEcho; onOpen: () => void; onClose: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onClose, 9000);
    return () => window.clearTimeout(t);
  }, [onClose]);
  return (
    <div className="no-print fixed inset-x-0 z-[60] flex justify-center px-4 bottom-[calc(env(safe-area-inset-bottom,0px)+140px)] md:bottom-20 pointer-events-none" role="status" aria-live="polite">
      <div className="tt-carimbo pointer-events-auto w-full max-w-[380px] rounded-[24px] bg-surface shadow-lift px-4 py-3.5 space-y-2" aria-label={`${echo.name}: registrado`}>
        <p className="flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wide text-verde-strong">
          <Activity className="w-4 h-4" /> {echo.name} · registrado
        </p>
        {echo.pattern && <p className="font-display text-[1.02rem] leading-snug text-ink">{echo.pattern}</p>}
        {echo.tip && (
          <p className="flex items-start gap-2 text-[13.5px] leading-snug text-ink-soft">
            <Lightbulb className="w-4 h-4 shrink-0 mt-0.5 text-warm" /> <span>{echo.tip}</span>
          </p>
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12.5px] text-ink-mute">Vai no relatório da consulta.</span>
          <button type="button" onClick={onOpen} className="inline-flex items-center text-[13px] font-extrabold text-verde-strong">
            Ver em Sintomas <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
