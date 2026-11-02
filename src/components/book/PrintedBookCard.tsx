import { BookHeart, ChevronRight } from 'lucide-react';
import type { BookOrder } from '../../hooks/useGestationData';
import { BOOK_MODELS, SHOW_PRICES, brl } from '../../lib/bookProduct';
import { isCoverTone } from '../../lib/bookCover';
import BookCover from './BookCover';

// No Livro: o convite para montar o livro impresso (com quantas páginas ele já
// teria) ou, depois de reservar, a reserva com a capa escolhida. E quem da
// família quer presentear.

export default function PrintedBookCard({ pages, order, gifts, onOpen }: { pages: number; order: BookOrder | null; gifts: string[]; onOpen: () => void }) {
  const gift = gifts.length > 0 && (
    <p className="text-[13px] font-bold text-rosa-strong">
      💝 {gifts.join(' e ')} {gifts.length === 1 ? 'quer' : 'querem'} presentear o livro de vocês
    </p>
  );
  if (order) {
    return (
      <section aria-labelledby="impresso-titulo" className="rounded-[24px] bg-gradient-to-br from-rosa-soft to-lilas-soft p-4 space-y-3">
        <button type="button" onClick={onOpen} className="w-full flex items-center gap-4 text-left">
          <span className="w-20 shrink-0">
            <BookCover model={order.model} title={order.coverTitle} tone={isCoverTone(order.coverTone) ? order.coverTone : 'rosa'} photo={order.coverPhoto} width={order.model === 'livreto' ? 60 : 76} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[11px] font-extrabold uppercase tracking-wide text-rosa-strong">Reservado · pré-venda</span>
            <span id="impresso-titulo" className="block font-display text-[1.15rem] leading-snug text-ink">
              {BOOK_MODELS[order.model].name} · {order.pages} páginas
            </span>
            <span className="block text-[13px] text-ink-soft">{SHOW_PRICES ? `${brl(order.priceCents)} no preço de lançamento · ver ou mudar` : 'O preço chega antes de confirmar · ver ou mudar'}</span>
          </span>
          <ChevronRight className="w-4 h-4 shrink-0 text-ink-mute" aria-hidden />
        </button>
        {gift}
      </section>
    );
  }
  return (
    <section aria-labelledby="impresso-titulo" className="rounded-[24px] bg-gradient-to-br from-rosa-soft to-lilas-soft px-5 py-4 space-y-2">
      <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-rosa-strong">
        <BookHeart className="w-3.5 h-3.5" aria-hidden /> Pré-venda
      </p>
      <h3 id="impresso-titulo" className="font-display text-[1.2rem] leading-snug text-ink">
        O livro de vocês, impresso
      </h3>
      <p className="text-[13.5px] leading-snug text-ink-soft">
        Ele já teria <strong className="text-ink tabular">{pages} páginas</strong>. Escolham o modelo, a capa e a dedicatória. Nada é cobrado agora.
      </p>
      {gift}
      <button type="button" onClick={onOpen} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-4 py-2 text-[13.5px] font-extrabold text-rosa-strong shadow-soft transition active:scale-95">
        <BookHeart className="w-4 h-4" aria-hidden /> Montar o livro
      </button>
    </section>
  );
}
