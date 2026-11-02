import { useState } from 'react';
import { ArrowLeft, BookHeart, Check, Loader2 } from 'lucide-react';
import { photoUrl } from '../../api';
import type { BookOrder } from '../../hooks/useGestationData';
import { BOOK_MODELS, DEFAULT_INCLUDE, SHOW_PRICES, INCLUDE_LABEL, PERIODS, brl, estimatePages, pagesFor, priceFor, type BookInclude, type BookModel, type BookPeriod, type BookStuff } from '../../lib/bookProduct';
import { COVER_TONES, isCoverTone, type CoverTone } from '../../lib/bookCover';
import Sheet from '../Sheet';
import { Button } from '../ui';
import BookCover from './BookCover';

// Montar o livro impresso em 5 passos: o modelo, o que entra, a capa, a
// dedicatória e a prévia. É uma pré-venda: a reserva guarda as escolhas e o
// preço de lançamento; nada é cobrado agora.

export interface BookReservation {
  model: BookModel;
  period: BookPeriod;
  include: BookInclude;
  coverTitle: string;
  coverTone: CoverTone;
  coverPhoto: string | null;
  dedication: string | null;
  pages: number;
}

const STEPS = ['Modelo', 'O que entra', 'Capa', 'Dedicatória', 'Prévia'] as const;

export default function BookBuilder({ stuff, photos, babyName, order, gifts, onReserve, onCancel, onClose }: { stuff: BookStuff; photos: Array<{ id: string; thumb: boolean }>; babyName: string | null; order: BookOrder | null; gifts: string[]; onReserve: (r: BookReservation) => Promise<boolean>; onCancel: () => Promise<boolean>; onClose: () => void }) {
  const [step, setStep] = useState(order ? 4 : 0);
  const [model, setModel] = useState<BookModel>(order?.model ?? 'classico');
  const [period, setPeriod] = useState<BookPeriod>(order?.period ?? 'tudo');
  const [include, setInclude] = useState<BookInclude>({ ...DEFAULT_INCLUDE, ...(order?.include ?? {}) });
  const [title, setTitle] = useState(order?.coverTitle ?? (babyName ? `O livro de ${babyName}` : 'A espera de vocês'));
  const [tone, setTone] = useState<CoverTone>(isCoverTone(order?.coverTone) ? order.coverTone : 'rosa');
  const [photo, setPhoto] = useState<string | null>(order?.coverPhoto ?? photos[0]?.id ?? null);
  const [dedication, setDedication] = useState(order?.dedication ?? '');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const raw = estimatePages(stuff, period, include);
  const pages = pagesFor(model, raw);
  const price = priceFor(model, raw);
  const m = BOOK_MODELS[model];
  const cut = raw > m.pages[1];
  const subtitle = babyName && !title.includes(babyName) ? babyName : 'Nossa gestação';

  const reserve = async () => {
    setSaving(true);
    const ok = await onReserve({ model, period, include, coverTitle: title.trim() || 'O livro de vocês', coverTone: tone, coverPhoto: photo, dedication: dedication.trim() || null, pages: raw });
    setSaving(false);
    if (ok) setDone(true);
  };

  if (done) {
    return (
      <Sheet title="O livro impresso" subtitle="Pré-venda: nada é cobrado agora" icon={<BookHeart />} onClose={onClose}>
        <div className="space-y-4 text-center" role="status" aria-label="Livro reservado">
          <BookCover model={model} title={title} subtitle={subtitle} tone={tone} photo={photo} width={200} />
          <p className="font-display text-[1.6rem] text-ink">Reservado! 📖</p>
          <p className="text-[14px] text-ink-soft">
            {m.name} · {pages} páginas{SHOW_PRICES ? ` · ${brl(priceFor(model, raw))} no preço de lançamento` : ''}. Quando a gráfica abrir, vocês recebem {SHOW_PRICES ? 'um aviso para confirmar' : 'o preço e um aviso para confirmar'}, e o livro sai com tudo o que guardarem até lá.
          </p>
          <Button onClick={onClose} className="w-full">
            Continuar
          </Button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title="O livro impresso" subtitle="Pré-venda: nada é cobrado agora" icon={<BookHeart />} onClose={onClose}>
      <div className="space-y-5">
        <ol className="flex gap-1.5" aria-label="Passos">
          {STEPS.map((s, i) => (
            <li key={s} className="flex-1">
              <button type="button" onClick={() => setStep(i)} aria-current={i === step ? 'step' : undefined} className="w-full text-left">
                <span className={`block h-1.5 rounded-full ${i <= step ? 'bg-rosa' : 'bg-surface-2'}`} />
                <span className={`mt-1 block text-[10.5px] font-extrabold truncate ${i === step ? 'text-rosa-strong' : 'text-ink-mute'}`}>{s}</span>
              </button>
            </li>
          ))}
        </ol>

        {step === 0 && (
          <section aria-label="Modelo" className="space-y-2.5">
            {(Object.keys(BOOK_MODELS) as BookModel[]).map(id => {
              const b = BOOK_MODELS[id];
              const on = id === model;
              return (
                <button key={id} type="button" aria-pressed={on} onClick={() => setModel(id)} className={`w-full flex items-center gap-4 rounded-[22px] p-3.5 text-left transition ${on ? 'bg-rosa-soft ring-2 ring-rosa' : 'bg-surface-2'}`}>
                  <span className="w-20 shrink-0">
                    <BookCover model={id} title={title} tone={tone} photo={photo} width={id === 'livreto' ? 62 : 78} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="font-display text-[1.15rem] text-ink">{b.name}</span>
                      {SHOW_PRICES && <span className="text-[13px] font-extrabold text-rosa-strong tabular">{id === 'livreto' ? brl(b.base) : `a partir de ${brl(b.base)}`}</span>}
                    </span>
                    <span className="block text-[12.5px] text-ink-soft">
                      {b.cover} · {b.size} · {b.pages[0]} a {b.pages[1]} páginas
                    </span>
                    <span className="mt-1 block text-[12.5px] text-ink-soft">{b.perks.join(' · ')}</span>
                  </span>
                </button>
              );
            })}
          </section>
        )}

        {step === 1 && (
          <section aria-label="O que entra" className="space-y-4">
            <div role="group" aria-label="Período" className="flex flex-wrap gap-2">
              {(Object.keys(PERIODS) as BookPeriod[]).map(p => (
                <button key={p} type="button" aria-pressed={p === period} onClick={() => setPeriod(p)} className={`rounded-full px-3.5 py-1.5 text-[13px] font-bold ${p === period ? 'bg-rosa text-white' : 'bg-surface-2 text-ink-soft'}`}>
                  {PERIODS[p].label}
                </button>
              ))}
            </div>
            <ul className="rounded-[22px] bg-surface-2 divide-y divide-line/60">
              {(Object.keys(INCLUDE_LABEL) as Array<keyof BookInclude>).map(k => (
                <li key={k}>
                  <label className="flex items-center gap-3 px-4 py-3 text-[14px] text-ink">
                    <input type="checkbox" checked={include[k]} onChange={e => setInclude(v => ({ ...v, [k]: e.target.checked }))} className="w-4 h-4 accent-[var(--color-rosa)]" />
                    {INCLUDE_LABEL[k]}
                  </label>
                </li>
              ))}
            </ul>
            <p className="text-[12.5px] text-ink-mute">Cada semana com lembranças vira uma página (e as semanas com foto ganham uma a mais).</p>
          </section>
        )}

        {step === 2 && (
          <section aria-label="Capa" className="space-y-4">
            <BookCover model={model} title={title} subtitle={subtitle} tone={tone} photo={photo} width={model === 'livreto' ? 150 : 200} />
            <label className="block space-y-1">
              <span className="text-[13px] font-bold text-ink-soft">Título da capa</span>
              <input value={title} maxLength={60} onChange={e => setTitle(e.target.value)} className="w-full rounded-2xl bg-surface-2 px-4 py-2.5 text-[15px] text-ink outline-none focus:ring-2 focus:ring-rosa" />
            </label>
            <div role="group" aria-label="Tom da capa" className="flex gap-2.5">
              {(Object.keys(COVER_TONES) as CoverTone[]).map(t => (
                <button key={t} type="button" aria-pressed={t === tone} aria-label={COVER_TONES[t].label} onClick={() => setTone(t)} className={`w-10 h-10 rounded-full ${t === tone ? 'ring-2 ring-offset-2 ring-offset-surface ring-ink' : ''}`} style={{ background: `linear-gradient(160deg, ${COVER_TONES[t].from}, ${COVER_TONES[t].to})` }} />
              ))}
            </div>
            {photos.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[13px] font-bold text-ink-soft">A foto da capa</p>
                <div role="group" aria-label="Foto da capa" className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  <button type="button" aria-pressed={!photo} onClick={() => setPhoto(null)} className={`w-16 h-16 shrink-0 rounded-2xl bg-surface-2 text-[11px] font-bold text-ink-mute ${!photo ? 'ring-2 ring-rosa' : ''}`}>
                    Sem foto
                  </button>
                  {photos.map(p => (
                    <button key={p.id} type="button" aria-pressed={p.id === photo} aria-label="Usar esta foto na capa" onClick={() => setPhoto(p.id)} className={`w-16 h-16 shrink-0 overflow-hidden rounded-2xl ${p.id === photo ? 'ring-2 ring-rosa' : ''}`}>
                      <img src={photoUrl(p.id, p.thumb)} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {step === 3 && (
          <section aria-label="Dedicatória" className="space-y-2">
            <label className="block space-y-1">
              <span className="text-[13px] font-bold text-ink-soft">Uma dedicatória na primeira página (opcional)</span>
              <textarea value={dedication} maxLength={400} rows={5} onChange={e => setDedication(e.target.value)} placeholder="Para você, que ainda nem chegou e já mudou tudo…" className="w-full rounded-2xl bg-surface-2 px-4 py-3 font-display text-[1.05rem] leading-snug text-ink outline-none focus:ring-2 focus:ring-rosa" />
            </label>
            <p className="text-right text-[11.5px] text-ink-mute tabular">{dedication.length}/400</p>
          </section>
        )}

        {step === 4 && (
          <section aria-label="Prévia" className="space-y-4">
            <BookCover model={model} title={title} subtitle={subtitle} tone={tone} photo={photo} width={model === 'livreto' ? 150 : 200} />
            <dl className="rounded-[22px] bg-surface-2 px-4 py-3 text-[14px] space-y-1.5">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft">Modelo</dt>
                <dd className="font-bold text-ink text-right">
                  {m.name} · {m.cover}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft">Páginas</dt>
                <dd className="font-bold text-ink tabular">{pages}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft">Período</dt>
                <dd className="font-bold text-ink">{PERIODS[period].label}</dd>
              </div>
              {SHOW_PRICES && (
                <div className="flex justify-between gap-3 pt-1.5 border-t border-line/60">
                  <dt className="text-ink-soft">Preço de lançamento</dt>
                  <dd className="font-display text-[1.25rem] text-rosa-strong tabular">{brl(price)}</dd>
                </div>
              )}
            </dl>
            {cut && <p className="text-[12.5px] text-ink-soft">O livreto escolhe os melhores momentos: {m.pages[1]} páginas das {raw} que vocês já têm.</p>}
            {raw < m.pages[0] && <p className="text-[12.5px] text-ink-soft">Por enquanto o livro tem {raw} páginas; ele vai crescendo com o que vocês guardarem até a gráfica abrir.</p>}
            {gifts.length > 0 && <p className="text-[13px] font-bold text-rosa-strong">💝 {gifts.join(' e ')} {gifts.length === 1 ? 'quer' : 'querem'} presentear o livro de vocês.</p>}
            <p className="text-[12.5px] text-ink-mute">{SHOW_PRICES ? 'Nada é cobrado agora. Quando a gráfica abrir, vocês recebem um aviso para confirmar, com o preço de lançamento garantido.' : 'Nada é cobrado agora. A reserva garante o lugar de vocês: quando a gráfica abrir, vocês recebem o preço e um aviso para confirmar, sem compromisso.'}</p>
          </section>
        )}

        <div className="flex gap-2">
          {step > 0 && (
            <Button tone="soft" onClick={() => setStep(s => s - 1)}>
              <ArrowLeft /> Voltar
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(s => s + 1)} className="flex-1">
              Continuar · {pages} páginas
            </Button>
          ) : (
            <Button onClick={() => void reserve()} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="animate-spin" /> : <Check />} {order ? 'Atualizar a reserva' : SHOW_PRICES ? 'Reservar meu livro' : 'Reservar sem compromisso'}
            </Button>
          )}
        </div>
        {order && step === STEPS.length - 1 && (
          <button
            type="button"
            disabled={canceling}
            onClick={async () => {
              setCanceling(true);
              if (await onCancel()) onClose();
              setCanceling(false);
            }}
            className="block mx-auto text-[12.5px] font-bold text-ink-mute"
          >
            Cancelar a reserva
          </button>
        )}
      </div>
    </Sheet>
  );
}
