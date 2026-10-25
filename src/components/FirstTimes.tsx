import { Baby, Camera, Footprints, Heart, HeartPulse, Home, Luggage, Megaphone, PartyPopper, ScanHeart, Shirt, Sparkles, type LucideIcon } from 'lucide-react';
import { firstTimeOf, type FirstTimeId } from '../content/firstTimes';
import type { FirstTimeCard } from '../lib/firstTimes';
import { formatBR } from '../lib/dates';

// O álbum das primeiras vezes: cartões como num livro do bebê. As que já
// aconteceram ficam cheias de cor, com a data; as outras esperam em contorno,
// prontas para receber a lembrança de vocês.

const FIRST_TIME_ICON: Record<FirstTimeId, LucideIcon> = {
  descoberta: Sparkles,
  contar: Megaphone,
  coracao: HeartPulse,
  ultrassom: ScanHeart,
  barriga: Camera,
  chute: Footprints,
  sexo: Baby,
  nome: Heart,
  roupinha: Shirt,
  cantinho: Home,
  cha: PartyPopper,
  mala: Luggage,
};

/** O selo "Primeira vez" no Mural e na página do livro. */
export function FirstTimeBadge({ id }: { id: string | null | undefined }) {
  const ft = firstTimeOf(id);
  if (!ft) return null;
  const Icon = FIRST_TIME_ICON[ft.id];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-rosa-soft to-lilas-soft px-2.5 py-1 text-[11.5px] font-extrabold uppercase tracking-wide text-rosa-strong">
      <Icon className="w-3.5 h-3.5" /> Primeira vez · {ft.title}
    </span>
  );
}

export default function FirstTimes({ cards, onWrite, onOpenEntry }: { cards: FirstTimeCard[]; onWrite: (c: FirstTimeCard) => void; onOpenEntry: (id: string) => void }) {
  const done = cards.filter(c => c.done).length;
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-[14px] text-ink-soft">
          <strong className="text-ink">{done} de {cards.length}</strong> guardadas. Cada uma vira uma página especial do livro.
        </p>
        <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden" role="progressbar" aria-label="Primeiras vezes guardadas" aria-valuenow={done} aria-valuemin={0} aria-valuemax={cards.length}>
          <div className="h-full rounded-full bg-gradient-to-r from-rosa to-lilas transition-[width] duration-700" style={{ width: `${(done / cards.length) * 100}%` }} />
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-2.5" aria-label="As primeiras vezes">
        {cards.map(c => {
          const Icon = FIRST_TIME_ICON[c.ft.id];
          const label = c.entry ? `${c.ft.title}: abrir a lembrança` : c.done ? `${c.ft.title}: contar como foi` : `${c.ft.title}: guardar`;
          return (
            <li key={c.ft.id}>
              <button
                type="button"
                aria-label={label}
                onClick={() => (c.entry ? onOpenEntry(c.entry.id) : onWrite(c))}
                className={`w-full h-full min-h-[118px] rounded-[22px] p-3.5 text-left flex flex-col gap-2 transition active:scale-[0.98] ${c.done ? 'bg-gradient-to-br from-rosa-soft to-lilas-soft' : 'border-2 border-dashed border-line bg-transparent'}`}
              >
                <span className={`w-9 h-9 rounded-full flex items-center justify-center [&_svg]:w-[18px] [&_svg]:h-[18px] ${c.done ? 'bg-surface/80 text-rosa-strong' : 'bg-surface-2 text-ink-mute'}`}>
                  <Icon />
                </span>
                <span className={`font-display text-[15px] leading-tight ${c.done ? 'text-ink' : 'text-ink-soft'}`}>{c.ft.title}</span>
                <span className={`mt-auto text-[12px] ${c.done ? 'text-rosa-strong font-bold' : 'text-ink-mute'}`}>
                  {c.entry ? formatBR(c.entry.entry_date) : c.done ? 'Contar como foi' : 'Guardar ›'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
