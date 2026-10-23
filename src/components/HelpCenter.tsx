import { useState } from 'react';
import { ArrowRight, ChevronDown, LifeBuoy, Search, Sparkles } from 'lucide-react';
import Sheet from './Sheet';
import { searchHelp, type HelpTarget } from '../content/help';

// A Central de Ajuda: busca no topo, perguntas por tema e, em cada resposta, um
// atalho para a tela certa. Também reabre o "Primeiros 7 dias".

export default function HelpCenter({ onClose, onGo, onFirstDays }: { onClose: () => void; onGo: (target: HelpTarget) => void; onFirstDays?: () => void }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const topics = searchHelp(query);
  const searching = query.trim().length > 0;
  return (
    <Sheet title="Ajuda" subtitle="Tudo sobre o Tumtum, em poucas linhas" icon={<LifeBuoy />} onClose={onClose}>
      <div className="space-y-5">
        <label className="flex items-center gap-2 rounded-2xl bg-surface-2 px-3.5 py-2.5">
          <Search className="w-4 h-4 text-ink-mute shrink-0" />
          <input type="search" aria-label="Buscar na ajuda" placeholder="O que você quer saber?" value={query} onChange={e => setQuery(e.target.value)} className="flex-1 min-w-0 bg-transparent text-[15px] text-ink placeholder:text-ink-mute outline-none" />
        </label>

        {onFirstDays && !searching && (
          <button type="button" onClick={onFirstDays} className="w-full flex items-center gap-3 rounded-[20px] bg-gradient-to-br from-rosa-soft via-lilas-soft to-azul-soft px-4 py-3 text-left">
            <Sparkles className="w-5 h-5 text-rosa shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block font-bold text-ink">Primeiros 7 dias com o Tumtum</span>
              <span className="block text-[12.5px] text-ink-soft">Uma pequena missão por dia para conhecer tudo</span>
            </span>
            <ArrowRight className="w-4 h-4 text-ink-mute shrink-0" />
          </button>
        )}

        {topics.length === 0 && <p className="text-sm text-ink-soft px-1">Não achamos nada com essas palavras. Que tal tentar de outro jeito, como "consulta", "livro" ou "família"?</p>}

        {topics.map(t => (
          <section key={t.id} aria-label={t.title} className="space-y-1.5">
            <h3 className="px-1 text-[12px] font-extrabold uppercase tracking-wide text-ink-mute">{t.title}</h3>
            <ul className="rounded-[20px] bg-surface-2/60 divide-y divide-line overflow-hidden">
              {t.items.map(item => {
                const key = `${t.id}:${item.q}`;
                const shown = searching || open === key;
                return (
                  <li key={key}>
                    <button type="button" onClick={() => setOpen(o => (o === key ? null : key))} aria-expanded={shown} className="w-full flex items-start gap-2 px-4 py-3 text-left">
                      <span className="flex-1 text-[14.5px] font-semibold text-ink leading-snug">{item.q}</span>
                      <ChevronDown className={`w-4 h-4 mt-0.5 shrink-0 text-ink-mute transition ${shown ? 'rotate-180' : ''}`} aria-hidden />
                    </button>
                    {shown && (
                      <div className="px-4 pb-3.5 -mt-1 space-y-2">
                        <p className="text-[14px] text-ink-soft leading-relaxed">{item.a}</p>
                        {item.go && (
                          <button type="button" onClick={() => onGo(item.go!.target)} className="inline-flex items-center gap-1 text-[13px] font-bold text-brand-strong">
                            {item.go.label} <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </Sheet>
  );
}
