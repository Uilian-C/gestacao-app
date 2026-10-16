import type { ReactNode } from 'react';
import { BookOpen } from 'lucide-react';

/**
 * Bloco de conteúdo informativo (guia), visualmente diferente dos registros do
 * casal: fundo neutro, ícone de livro, etiqueta "Guia" e a fonte no rodapé.
 */
export default function Guide({ title, source, children, className = '' }: { title?: string; source?: string; children: ReactNode; className?: string }) {
  return (
    <aside className={`rounded-2xl bg-surface-2/70 px-4 py-3 ${className}`}>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-mute mb-1">
        <BookOpen className="w-3.5 h-3.5" /> Guia{title && <span className="font-normal">· {title}</span>}
      </p>
      <div className="text-sm text-ink-soft space-y-1.5">{children}</div>
      {source && <p className="text-[11px] text-ink-mute mt-2">Fonte: {source}</p>}
    </aside>
  );
}
