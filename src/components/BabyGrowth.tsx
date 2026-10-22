import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { photoUrl } from '../api';
import { GROWTH, GROWTH_SOURCE, MEASURE_TEXT, lengthText, stageAt, stageShots, weightText } from '../content/growth';
import { weekInfo } from '../content/weeks';
import type { EntryPhoto } from '../hooks/useGestationData';
import BabyArt from './BabyArt';

// "Como o bebê cresce": a gestação de vocês numa linha só. Em cima, o bebê de
// hoje, com o coraçãozinho batendo, e quanto já caminharam até o colo. Embaixo,
// as fases da 4ª à 40ª semana, cada uma com um nome carinhoso, o bebê
// desenhado no tamanho dela e, quando vocês tiverem, a foto da barriga daquela
// fase — o que faz a linha ser só de vocês. O que já passou fica cheio; o que
// vem pela frente, clarinho, como uma promessa.

/** Uma foto da barriga, com a semana em que foi tirada. */
export interface BellyShot {
  week: number;
  entryId: string;
  photo: EntryPhoto;
}

interface Props {
  currentWeek: number;
  /** "vocês estão aqui" (casal) ou "o bebê está aqui" (família). */
  hereText?: string;
  /** "Ana e Caio": quem espera esse bebê. */
  parents?: string;
  belly?: BellyShot[];
  onOpenEntry?: (entryId: string) => void;
}

const TERM = 40;

/** Tamanho do desenho em cada fase: cresce com o bebê, sem sumir no começo. */
const artSize = (week: number) => Math.round(44 + Math.sqrt(stageAt(week).lengthCm / 51.2) * 52);

export default function BabyGrowth({ currentWeek, hereText = 'vocês estão aqui', parents, belly = [], onOpenEntry }: Props) {
  const [open, setOpen] = useState<number | null>(null);
  const hereRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    hereRef.current?.scrollIntoView?.({ block: 'center' });
  }, []);

  const info = weekInfo(Math.min(42, Math.max(4, currentWeek)));
  const stage = stageAt(currentWeek);
  const progress = Math.min(100, Math.round((currentWeek / TERM) * 100));
  const left = Math.max(0, TERM - currentWeek);
  const shots = stageShots(belly);
  // Onde entra o marcador de hoje, quando a semana fica entre duas fases.
  const hereAt = GROWTH.some(s => s.week === currentWeek) ? -1 : GROWTH.findIndex(s => s.week > currentWeek);

  return (
    <div className="space-y-5">
      {/* O bebê de hoje */}
      <section aria-label="O bebê hoje" className="rounded-[28px] bg-gradient-to-b from-rosa-soft to-surface px-5 pt-4 pb-5 text-center">
        {parents && <p className="text-[12px] font-bold text-rosa-strong">O bebê de {parents}</p>}
        <BabyArt week={currentWeek} beat className="w-44 h-44 mx-auto" />
        <p className="text-[12px] font-extrabold uppercase tracking-wide text-rosa">
          Semana {currentWeek} · {info.trimester}º trimestre
        </p>
        <h3 className="font-display text-[1.45rem] leading-tight text-ink mt-0.5 text-balance">{stage.title}</h3>
        <p className="text-sm text-ink-soft mt-1">
          Do tamanho de {info.fruit} · {info.size} · {info.weight}
        </p>
        <div className="mt-4 space-y-1.5 text-left">
          <div className="h-2.5 rounded-full bg-surface-2 overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Caminho até o colo">
            <div className="h-full rounded-full bg-rosa" style={{ width: `${progress}%` }} />
          </div>
          <p className="flex justify-between gap-2 text-[12px] text-ink-soft tabular">
            <span>{progress}% do caminho</span>
            <span>{left > 0 ? `faltam ${left} ${left === 1 ? 'semana' : 'semanas'} para o colo` : 'a qualquer momento no colo'}</span>
          </p>
        </div>
      </section>

      {/* As fases */}
      <ol className="relative" aria-label="Crescimento do bebê, semana a semana">
        {GROWTH.flatMap((s, i) => {
          const passed = s.week <= currentWeek;
          const isNow = s.week === currentWeek;
          const expanded = open === s.week;
          const shot = shots[i];
          const rows = [];
          if (i === hereAt) {
            // A semana de hoje entre duas fases: um marcador, não uma fase a mais.
            rows.push(
              <li key="hoje" ref={hereRef} className="relative flex items-stretch gap-3">
                <span className="w-[96px] shrink-0" />
                <Rail top bottom filledTop filledBottom={false} dot="now" />
                <span className="py-2.5">
                  <span className="inline-block rounded-full bg-rosa px-3 py-1 text-[12px] font-extrabold text-white shadow-soft">
                    Semana {currentWeek} · {hereText}
                  </span>
                </span>
              </li>,
            );
          }
          rows.push(
            <li key={s.week} ref={isNow ? hereRef : undefined} className="relative flex items-stretch gap-3">
              <div className="w-[96px] shrink-0 flex items-center justify-center py-1.5">
                <span style={{ width: artSize(s.week) }} className={`block transition ${passed ? '' : 'opacity-45 saturate-50'}`}>
                  <BabyArt week={s.week} beat={isNow} className="w-full h-auto" />
                </span>
              </div>
              <Rail top={i > 0} bottom={i < GROWTH.length - 1} filledTop={passed} filledBottom={(GROWTH[i + 1]?.week ?? 99) <= currentWeek} dot={isNow ? 'now' : passed ? 'passed' : 'next'} />
              <div className="flex-1 min-w-0 py-1.5">
                <div className={`flex items-start gap-2 rounded-[20px] transition ${isNow ? 'bg-rosa-soft ring-2 ring-rosa/50' : passed ? 'bg-surface shadow-soft' : 'bg-surface-2/60'}`}>
                  <button type="button" onClick={() => setOpen(o => (o === s.week ? null : s.week))} aria-expanded={expanded} className="flex-1 min-w-0 text-left px-3.5 py-3">
                    <span className={`block text-[11.5px] font-extrabold uppercase tracking-wide ${passed ? 'text-rosa' : 'text-ink-mute'}`}>
                      {s.week} semanas{isNow && ` · ${hereText}`}
                    </span>
                    <span className={`flex items-start gap-1 font-display text-[1.08rem] leading-snug ${passed ? 'text-ink' : 'text-ink-soft'}`}>
                      <span className="flex-1">{s.title}</span>
                      {expanded ? <ChevronUp className="w-4 h-4 mt-1 text-ink-mute shrink-0" aria-hidden /> : <ChevronDown className="w-4 h-4 mt-1 text-ink-mute shrink-0" aria-hidden />}
                    </span>
                    <span className="block text-[12.5px] text-ink-soft tabular mt-0.5">
                      {lengthText(s)} · {weightText(s.weightG)}
                    </span>
                    {expanded && (
                      <span className="block pt-2 text-[14px] text-ink">
                        {weekInfo(s.week).milestone}
                        <span className="block pt-1 text-[12px] text-ink-mute">Medido {MEASURE_TEXT[s.measure]}.</span>
                      </span>
                    )}
                  </button>
                  {shot && (
                    <button type="button" onClick={() => onOpenEntry?.(shot.entryId)} aria-label={`A barriga de vocês na semana ${shot.week}: ver`} className="relative shrink-0 mt-3 mr-3">
                      <img src={photoUrl(shot.photo.id, shot.photo.thumb)} alt="" loading="lazy" className="w-12 h-12 rounded-full object-cover ring-2 ring-surface shadow-soft" />
                      <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-lilas px-1.5 text-[9.5px] font-extrabold text-white whitespace-nowrap">sem. {shot.week}</span>
                    </button>
                  )}
                </div>
              </div>
            </li>,
          );
          return rows;
        })}
      </ol>

      <p className="text-[12px] text-ink-mute">
        Tamanho e peso são médias: até a 16ª semana o bebê é medido da cabeça ao bumbum; a partir da 20ª, da cabeça aos pés. {GROWTH_SOURCE} Na dúvida, perguntem na consulta.
      </p>
    </div>
  );
}

/** O trilho que liga as fases: rosa até hoje, clarinho dali em diante. */
function Rail({ top, bottom, filledTop, filledBottom, dot }: { top: boolean; bottom: boolean; filledTop: boolean; filledBottom: boolean; dot: 'now' | 'passed' | 'next' }) {
  return (
    <div className="relative w-4 shrink-0 flex justify-center" aria-hidden>
      {top && <span className={`absolute top-0 h-1/2 w-[3px] ${filledTop ? 'bg-rosa' : 'bg-line'}`} />}
      {bottom && <span className={`absolute bottom-0 h-1/2 w-[3px] ${filledBottom ? 'bg-rosa' : 'bg-line'}`} />}
      <span className={`relative self-center rounded-full ${dot === 'now' ? 'w-4 h-4 bg-rosa ring-4 ring-rosa-soft' : dot === 'passed' ? 'w-3 h-3 bg-rosa' : 'w-3 h-3 bg-surface border-2 border-line'}`} />
    </div>
  );
}
