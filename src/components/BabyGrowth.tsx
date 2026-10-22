import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { GROWTH_SOURCE, MEASURE_TEXT, growthTimeline, lengthText, stageAt, weightText } from '../content/growth';
import { weekInfo } from '../content/weeks';

// "Como o bebê cresce": a gestação da 4ª à 40ª semana numa linha só, com o
// bebê desenhado no tamanho de cada fase, a semana de hoje em destaque, o que
// já passou cheio e o que vem pela frente mais clarinho. Tocar numa fase
// mostra o que acontece nela.

/** O bebê em traço simples, encolhido como na barriga. Até a 10ª semana, um embrião. */
export function FetusArt({ week, className = '' }: { week: number; className?: string }) {
  const style = { fill: 'var(--c-rosa-soft)', stroke: 'var(--c-rosa)' };
  if (week < 10) {
    return (
      <svg viewBox="0 0 100 100" className={className} aria-hidden>
        <circle cx="42" cy="38" r="20" style={style} strokeWidth="3" />
        <path d="M58 48 C74 60 70 84 50 86 C40 87 35 79 42 73" fill="none" style={{ stroke: 'var(--c-rosa)' }} strokeWidth="9" strokeLinecap="round" />
        <path d="M58 48 C74 60 70 84 50 86 C40 87 35 79 42 73" fill="none" style={{ stroke: 'var(--c-rosa-soft)' }} strokeWidth="4" strokeLinecap="round" />
        <circle cx="36" cy="38" r="3" style={{ fill: 'var(--c-rosa)' }} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      {/* Uma silhueta só: cabeça, costas curvadas e o corpinho encolhido */}
      <path d="M48 10 C28 10 15 26 17 43 C19 56 30 63 38 65 C34 74 39 87 54 89 C72 91 87 78 87 60 C87 41 74 31 65 27 C63 17 57 10 48 10 Z" style={style} strokeWidth="3" strokeLinejoin="round" />
      {/* Olho fechado e orelha */}
      <path d="M26 40 q5 4 10 0" fill="none" style={{ stroke: 'var(--c-rosa)' }} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M48 34 a4.5 4.5 0 1 1 0 9" fill="none" style={{ stroke: 'var(--c-rosa)' }} strokeWidth="2.5" strokeLinecap="round" />
      {/* Bracinho perto do rosto e joelho dobrado */}
      <path d="M58 58 C50 56 44 60 42 66" fill="none" style={{ stroke: 'var(--c-rosa)' }} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M56 86 C52 76 60 68 72 71" fill="none" style={{ stroke: 'var(--c-rosa)' }} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/** Tamanho do desenho: cresce com o bebê, sem sumir no começo nem estourar no fim. */
const artSize = (week: number) => Math.round(30 + Math.sqrt(stageAt(week).lengthCm / 51.2) * 58);

export default function BabyGrowth({ currentWeek, hereText = 'vocês estão aqui' }: { currentWeek: number; hereText?: string }) {
  const rows = growthTimeline(currentWeek);
  const [open, setOpen] = useState<number | null>(currentWeek);
  const nowRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    nowRef.current?.scrollIntoView?.({ block: 'center' });
  }, []);

  return (
    <div className="space-y-4">
      <ol className="relative" aria-label="Crescimento do bebê, semana a semana">
        {rows.map(({ stage, week, now }, i) => {
          const passed = week <= currentWeek;
          const info = weekInfo(Math.min(42, week));
          const expanded = open === week;
          const s = stage ?? stageAt(week);
          return (
            <li key={`${week}-${stage ? 'fase' : 'hoje'}`} ref={now ? nowRef : undefined} className="relative flex items-stretch gap-3">
              {/* O desenho, no tamanho da fase */}
              <div className="w-[92px] shrink-0 flex items-center justify-center py-2">
                <span style={{ width: artSize(week) }} className="block">
                  <FetusArt week={week} className={`w-full h-auto transition-opacity ${passed ? '' : 'opacity-40'}`} />
                </span>
              </div>
              {/* A linha que liga as fases: cheia até hoje */}
              <div className="relative w-4 shrink-0 flex justify-center" aria-hidden>
                {i > 0 && <span className={`absolute top-0 h-1/2 w-[3px] ${passed ? 'bg-brand' : 'bg-line'}`} />}
                {i < rows.length - 1 && <span className={`absolute bottom-0 h-1/2 w-[3px] ${rows[i + 1].week <= currentWeek ? 'bg-brand' : 'bg-line'}`} />}
                <span className={`relative self-center rounded-full ${now ? 'w-4 h-4 bg-brand ring-4 ring-brand-soft' : passed ? 'w-3 h-3 bg-brand' : 'w-3 h-3 bg-surface border-2 border-line'}`} />
              </div>
              <div className="flex-1 min-w-0 py-1.5">
                <button
                  type="button"
                  onClick={() => setOpen(o => (o === week ? null : week))}
                  aria-expanded={expanded}
                  className={`w-full text-left rounded-2xl px-3.5 py-2.5 transition ${now ? 'bg-brand-soft' : 'bg-surface-2/70 hover:bg-surface-2'} ${passed || now ? '' : 'opacity-70'}`}
                >
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 pr-6 relative">
                    <span className={`font-display text-[1.15rem] leading-tight whitespace-nowrap ${now ? 'text-brand-strong' : 'text-ink'}`}>{week} semanas</span>
                    {now && <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-extrabold text-on-accent whitespace-nowrap">{hereText}</span>}
                    {expanded ? <ChevronUp className="absolute right-0 top-1 w-4 h-4 text-ink-mute" aria-hidden /> : <ChevronDown className="absolute right-0 top-1 w-4 h-4 text-ink-mute" aria-hidden />}
                  </span>
                  <span className="block text-[13px] text-ink-soft tabular">
                    {stage ? `${lengthText(s)} · ${weightText(s.weightG)}` : `Do tamanho de ${info.fruit} · ${info.size} · ${info.weight}`}
                  </span>
                  {expanded && (
                    <span className="block pt-1.5 text-[14px] text-ink">
                      {info.milestone}
                      {stage && <span className="block pt-1 text-[12px] text-ink-mute">Medido {MEASURE_TEXT[stage.measure]}.</span>}
                    </span>
                  )}
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="text-[12px] text-ink-mute">
        Até a 16ª semana o bebê é medido da cabeça ao bumbum; a partir da 20ª, da cabeça aos pés. {GROWTH_SOURCE} Na dúvida, vale perguntar na consulta.
      </p>
    </div>
  );
}
