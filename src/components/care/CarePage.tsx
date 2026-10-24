import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

/** Uma página que abre de Cuidados: o caminho de volta, o título e o conteúdo. */
export default function CarePage({ title, subtitle, onBack, children }: { title: string; subtitle?: string; onBack: () => void; children: ReactNode }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm font-bold text-ink-soft">
          <ArrowLeft className="w-4 h-4" /> Cuidados
        </button>
        <div className="px-1">
          <h1 className="font-display text-[1.5rem] leading-tight text-ink">{title}</h1>
          {subtitle && <p className="text-[14px] text-ink-soft">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}
