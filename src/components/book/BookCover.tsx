import { photoUrl } from '../../api';
import type { BookModel } from '../../lib/bookProduct';
import { COVER_TONES, type CoverTone } from '../../lib/bookCover';

// A capa do livro impresso, desenhada ao vivo: o formato do modelo, o tom, a
// foto e o título. É a mesma capa na prévia, na reserva e no cartão do Livro.

const RATIO: Record<BookModel, string> = { livreto: '148 / 210', classico: '1 / 1', caixa: '1 / 1' };

export default function BookCover({ model, title, subtitle, tone, photo, width = 180 }: { model: BookModel; title: string; subtitle?: string | null; tone: CoverTone; photo?: string | null; width?: number }) {
  const t = COVER_TONES[tone];
  // Nas miniaturas (a lista de modelos, o cartão do Livro), só a cor e a foto: o título não caberia.
  const small = width < 100;
  return (
    <div className="relative mx-auto" style={{ width, maxWidth: '100%' }} role="img" aria-label={`Capa: ${title}${subtitle ? `, ${subtitle}` : ''}`}>
      {model === 'caixa' && <div aria-hidden className="absolute -right-2 -bottom-2 inset-0 translate-x-2 translate-y-2 rounded-[12px] opacity-60" style={{ background: t.to }} />}
      <div
        className="relative overflow-hidden rounded-[6px_14px_14px_6px] shadow-[inset_8px_0_0_rgba(0,0,0,0.08),0_12px_26px_rgba(60,30,60,0.22)]"
        style={{ aspectRatio: RATIO[model], background: `linear-gradient(160deg, ${t.from}, ${t.to})` }}
      >
        {photo && (
          <div className="absolute inset-[12%] bottom-[34%] overflow-hidden rounded-[10px] shadow-[0_6px_14px_rgba(0,0,0,0.18)]">
            <img src={photoUrl(photo, true)} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        {!small && (
          <div className="absolute inset-x-0 bottom-0 p-3.5 text-white">
            <p className={`font-display leading-tight text-balance ${width > 200 ? 'text-[1.35rem]' : 'text-[1.05rem]'}`} style={{ textShadow: '0 1px 8px rgba(0,0,0,0.18)' }}>
              {title}
            </p>
            {subtitle && <p className="mt-0.5 text-[10px] font-extrabold uppercase tracking-[0.18em] opacity-90">{subtitle}</p>}
          </div>
        )}
        <span aria-hidden className={`absolute ${small ? 'right-1.5 top-1.5 text-[7px]' : 'right-3 top-3 text-[9px]'} font-extrabold uppercase tracking-[0.2em] text-white/85`}>
          tumtum
        </span>
      </div>
    </div>
  );
}
