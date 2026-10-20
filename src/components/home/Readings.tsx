import { useState } from 'react';
import { BookOpen, ChevronRight, Clock, Sparkles } from 'lucide-react';
import type { ContentItem } from '../../api';
import { textBlocks } from '../../lib/content';
import Sheet from '../Sheet';

// Início: a mensagem do dia e as leituras da semana (conteúdo publicado pela
// administração do Tumtum).

const AUDIENCE: Record<ContentItem['audience'], string | null> = { casal: null, mae: 'para a mãe', pai: 'para o pai' };

export function DailyMessage({ item }: { item: ContentItem }) {
  return (
    <section aria-label="Mensagem do dia" className="rounded-[24px] bg-surface shadow-soft px-5 py-4 space-y-1.5">
      <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-brand-strong">
        <Sparkles className="w-3.5 h-3.5" /> Mensagem do dia
      </p>
      <p className="font-display text-[1.15rem] leading-snug text-ink text-balance">“{item.body}”</p>
    </section>
  );
}

export function Readings({ items, week }: { items: ContentItem[]; week: number }) {
  const [open, setOpen] = useState<ContentItem | null>(null);
  return (
    <section aria-label="Leituras da semana" className="rounded-[24px] bg-surface shadow-soft p-4 space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-extrabold text-ink font-sans">
        <BookOpen className="w-4 h-4 text-verde" /> Leituras da semana {week}
      </h2>
      <ul className="divide-y divide-line">
        {items.slice(0, 4).map(r => (
          <li key={r.id}>
            <button type="button" onClick={() => setOpen(r)} className="w-full flex items-center gap-3 py-2.5 text-left">
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-bold text-ink leading-snug">{r.title}</span>
                <span className="flex items-center gap-2 text-xs text-ink-mute">
                  {r.minutes && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {r.minutes} min
                    </span>
                  )}
                  {AUDIENCE[r.audience] && <span className="font-semibold text-brand-strong">{AUDIENCE[r.audience]}</span>}
                </span>
              </span>
              <ChevronRight className="w-4 h-4 text-ink-mute shrink-0" />
            </button>
          </li>
        ))}
      </ul>
      {open && <ReadingSheet item={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

export function ReadingSheet({ item, onClose }: { item: ContentItem; onClose: () => void }) {
  return (
    <Sheet icon={<BookOpen />} title={item.title ?? 'Leitura'} subtitle={[item.minutes && `${item.minutes} min de leitura`, AUDIENCE[item.audience]].filter(Boolean).join(' · ') || undefined} onClose={onClose}>
      <ReadingBody item={item} />
    </Sheet>
  );
}

/** O texto de uma leitura: parágrafos, listas e a fonte. */
export function ReadingBody({ item }: { item: ContentItem }) {
  return (
    <article className="space-y-3 text-[15.5px] leading-relaxed text-ink">
      {textBlocks(item.body).map((b, i) =>
        b.kind === 'p' ? (
          <p key={i}>{b.text}</p>
        ) : (
          <ul key={i} className="space-y-1.5 pl-1">
            {b.items.map(t => (
              <li key={t} className="flex gap-2">
                <span className="text-brand">•</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        ),
      )}
      {item.source && <p className="pt-2 text-xs text-ink-mute">Fonte: {item.source} Cada gestação é única: em caso de dúvida, falem com a equipe do pré-natal.</p>}
    </article>
  );
}
