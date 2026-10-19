import { Camera, ChevronRight } from 'lucide-react';
import { photoUrl } from '../../api';
import type { JournalEntry } from '../../hooks/useGestationData';
import { bellyWeeks } from '../../lib/folders';

// Início → Barriguinha da semana: uma foto por semana da gestação. Enquanto a
// foto desta semana não existe, o cartão convida a tirar (com as últimas ao
// lado, para repetir o ângulo); depois, vira uma faixa curta da evolução.

const SHOWN = 5;

export default function BellyCard({ journal, dumDate, currentWeek, onPhoto, onOpenEntry, onAll }: { journal: JournalEntry[]; dumDate: string; currentWeek: number; onPhoto: () => void; onOpenEntry: (id: string) => void; onAll: () => void }) {
  const weeks = bellyWeeks(journal, dumDate)
    .map(w => ({ week: w.week, entry: w.items.find(i => i.photos.length > 0) }))
    .filter((w): w is { week: number; entry: JournalEntry } => !!w.entry);
  const done = weeks.some(w => w.week === currentWeek);
  const strip = weeks.slice(0, done ? SHOWN : SHOWN - 1).reverse();

  return (
    <section aria-label="Barriguinha da semana" className="rounded-[28px] bg-lilas-soft p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[12px] font-extrabold uppercase tracking-wide text-lilas-strong font-sans">Barriguinha · semana {currentWeek}</h2>
        {weeks.length > 0 && (
          <button type="button" onClick={onAll} className="inline-flex items-center gap-0.5 text-xs font-bold text-lilas-strong">
            Ver a evolução <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {strip.length > 0 || !done ? (
        <ol className="flex gap-2 overflow-x-auto no-scrollbar" aria-label="Fotos das últimas semanas">
          {strip.map(({ week, entry }) => {
            const photo = entry.photos[0];
            return (
              <li key={week} className="shrink-0">
                <button type="button" onClick={() => onOpenEntry(entry.id)} aria-label={`Barriguinha na semana ${week}: ver`} className={`relative block w-[62px] aspect-[3/4] overflow-hidden rounded-2xl bg-surface ${week === currentWeek ? 'ring-2 ring-lilas' : ''}`}>
                  <img src={photoUrl(photo.id, photo.thumb)} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                  <span className="absolute inset-x-0 bottom-0 pb-1 pt-3 text-center text-[10px] font-extrabold text-white bg-gradient-to-t from-black/60 to-transparent">sem. {week}</span>
                </button>
              </li>
            );
          })}
          {!done && (
            <li className="shrink-0">
              <button type="button" onClick={onPhoto} aria-label={`Tirar a foto da semana ${currentWeek}`} className="w-[62px] aspect-[3/4] rounded-2xl border-2 border-dashed border-lilas/60 text-lilas-strong flex flex-col items-center justify-center gap-1">
                <Camera className="w-5 h-5" />
                <span className="text-[10px] font-extrabold">sem. {currentWeek}</span>
              </button>
            </li>
          )}
        </ol>
      ) : null}

      {!done && (
        <div className="flex items-center gap-3">
          <p className="flex-1 min-w-0 text-sm text-ink-soft">
            {weeks.length ? 'Falta a foto desta semana. Mesmo lugar e mesmo ângulo deixam a evolução mais bonita.' : 'Uma foto por semana, sempre do mesmo jeito: o app monta a evolução da barriga.'}
          </p>
          <button type="button" onClick={onPhoto} className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-lilas px-4 py-2 text-sm font-bold text-white shadow-soft">
            <Camera className="w-4 h-4" /> Tirar foto
          </button>
        </div>
      )}
    </section>
  );
}
