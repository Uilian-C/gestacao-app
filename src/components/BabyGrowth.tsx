import { BabyNameContext } from '../lib/baby';
import { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Palette } from 'lucide-react';
import { photoUrl } from '../api';
import { GROWTH, GROWTH_SOURCE, MEASURE_TEXT, lengthText, stageAt, stageShots, weightText } from '../content/growth';
import { weekInfo } from '../content/weeks';
import type { EntryPhoto } from '../hooks/useGestationData';
import BabyArt from './BabyArt';
import { TONES, TONE_LABEL, type BabyTone } from '../content/babyTones';

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
  /** Tom do bebê desenhado; o neutro ("tumtum") é o padrão. */
  tone?: BabyTone;
  /** Só o casal escolhe o tom; sem isso (família), o seletor não aparece. */
  onToneChange?: (tone: BabyTone) => Promise<boolean> | void;
  /** Abre a escolha do nome do bebê. */
  onNames?: () => void;
  /** O próximo marco (do Início): aparece na linha e o trilho mostra, em lilás, o caminho de hoje até ele. */
  goal?: Goal;
}

export interface Goal {
  week: number;
  title: string;
  text?: string;
  /** "em 5 semanas e 5 dias". */
  when: string;
}

const TERM = 40;

/** Tamanho do desenho em cada fase: cresce com o bebê, sem sumir no começo. */
const artSize = (week: number) => Math.round(44 + Math.sqrt(stageAt(week).lengthCm / 51.2) * 52);

export default function BabyGrowth({ currentWeek, hereText = 'vocês estão aqui', parents, belly = [], onOpenEntry, tone = 'tumtum', onToneChange, onNames, goal }: Props) {
  const babyName = useContext(BabyNameContext);
  const [open, setOpen] = useState<number | null>(null);
  // Enquanto o casal escolhe o tom, o bebê já aparece nele; só grava ao salvar.
  const [preview, setPreview] = useState<BabyTone | null>(null);
  const shown = preview ?? tone;
  const hereRef = useRef<HTMLLIElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const track = useTrack(listRef, open);
  const goalRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    const here = hereRef.current;
    const target = goalRef.current;
    // Com um marco, a tela mostra os dois juntos: o ponto de hoje e o marco (o meio entre eles no centro).
    const box = here?.closest('.overflow-y-auto');
    if (here && target && box) {
      const top = (el: Element) => el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
      const middle = (top(here) + top(target) + target.getBoundingClientRect().height) / 2;
      box.scrollTop = Math.max(0, middle - box.clientHeight / 2);
    } else {
      here?.scrollIntoView?.({ block: 'center' });
    }
    // Só ao abrir.
  }, []);

  const info = weekInfo(Math.min(42, Math.max(4, currentWeek)));
  const stage = stageAt(currentWeek);
  const progress = Math.min(100, Math.round((currentWeek / TERM) * 100));
  const left = Math.max(0, TERM - currentWeek);
  const shots = stageShots(belly);
  // Onde entra o marcador de hoje, quando a semana fica entre duas fases.
  const hereAt = GROWTH.some(s => s.week === currentWeek) ? -1 : GROWTH.findIndex(s => s.week > currentWeek);
  // O marco na semana de uma fase fica na própria fase; entre duas, ganha uma linha antes da seguinte.
  const goalStage = goal && GROWTH.some(s => s.week === goal.week) ? goal.week : null;
  const goalAt = goal && goalStage === null ? GROWTH.findIndex(s => s.week > goal.week) : -1;
  const goalLine = goal && (
    <span className="block text-[11.5px] font-extrabold uppercase tracking-wide text-lilas-strong">
      Próximo marco · {goal.when}
    </span>
  );
  const goalRow = goal && (
    <li key="marco" ref={goalRef} className="relative flex items-stretch gap-3">
      <span className="w-[96px] shrink-0" />
      <span data-marco className="w-4 shrink-0" aria-hidden />
      <span className="flex-1 min-w-0 py-2">
        <span className="block rounded-[18px] bg-surface border-2 border-dashed border-lilas/35 px-3.5 py-2.5">
          {goalLine}
          <span className="block text-[12px] font-bold text-ink-soft">Semana {goal.week}</span>
          <span className="block font-display text-[1.05rem] leading-snug text-ink">{goal.title}</span>
          {goal.text && <span className="block text-[12.5px] text-ink-soft">{goal.text}</span>}
        </span>
      </span>
    </li>
  );

  return (
    <div className="space-y-5">
      {/* O bebê de hoje */}
      <section aria-label="O bebê hoje" className="rounded-[28px] bg-gradient-to-b from-surface-2 to-surface px-5 pt-4 pb-5 text-center">
        {babyName ? (
          <p className="leading-tight">
            <span className="block font-display text-[1.5rem] text-rosa-strong">{babyName}</span>
            {parents && <span className="block text-[12px] font-bold text-ink-soft">de {parents}</span>}
          </p>
        ) : (
          parents && <p className="text-[12px] font-bold text-rosa-strong">O bebê de {parents}</p>
        )}
        <BabyArt week={currentWeek} beat tone={shown} className="w-44 h-44 mx-auto" />
        <p className="text-[12px] font-extrabold uppercase tracking-wide text-rosa">
          Semana {currentWeek} · {info.trimester}º trimestre
        </p>
        <h3 className="font-display text-[1.45rem] leading-tight text-ink mt-0.5 text-balance">{stage.title}</h3>
        <p className="text-sm text-ink-soft mt-1">
          Do tamanho de {info.fruit}
          <span className="block tabular">
            {info.size} · {info.weight}
          </span>
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
        {onNames && !babyName && (
          <button type="button" onClick={onNames} className="mx-auto mt-2 block text-[13.5px] font-bold text-rosa-strong">
            Qual vai ser o nome? Ver as ideias ›
          </button>
        )}
        {onToneChange && <ToneSetting tone={tone} onPreview={setPreview} onSave={onToneChange} />}
      </section>

      {/* As fases */}
      <ol ref={listRef} className="relative" aria-label="Crescimento do bebê, semana a semana">
        {/* Um trilho só, contínuo: rosa da 4ª semana até hoje, clarinho dali até o colo. */}
        {track && (
          <li aria-hidden className="absolute pointer-events-none" style={{ left: TRACK_X, top: track.top, height: track.height }}>
            <span className="absolute inset-y-0 -left-[1.5px] w-[3px] rounded-full bg-line" />
            <span className="absolute top-0 -left-[1.5px] w-[3px] rounded-full bg-rosa" style={{ height: track.filled }} />
            {/* Do ponto de hoje até o próximo marco: o que ainda vem, pontilhado e clarinho (não se confunde com o caminho já feito). */}
            {track.goal !== null && track.goal > track.filled && (
              <>
                <span data-caminho className="absolute -left-[1.5px] w-[3px] bg-surface" style={{ top: track.filled, height: track.goal - track.filled }}>
                  <span className="absolute inset-0 tt-pontilhado text-lilas/45" />
                </span>
                <span className="absolute -left-[7px] -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-surface border-2 border-lilas/60" style={{ top: track.goal }} />
              </>
            )}
            <span className="absolute -left-2 -translate-y-1/2 w-4 h-4 rounded-full bg-rosa ring-4 ring-rosa-soft" style={{ top: track.filled }} />
          </li>
        )}
        {GROWTH.flatMap((s, i) => {
          const passed = s.week <= currentWeek;
          const isNow = s.week === currentWeek;
          const expanded = open === s.week;
          const shot = shots[i];
          const rows = [];
          const isGoal = goalStage === s.week;
          if (i === hereAt) {
            // A semana de hoje entre duas fases: um marcador, não uma fase a mais.
            rows.push(
              <li key="hoje" ref={hereRef} className="relative flex items-stretch gap-3">
                <span className="w-[96px] shrink-0" />
                <span data-hoje className="w-4 shrink-0" aria-hidden />
                <span className="py-2.5">
                  <span className="inline-block rounded-full bg-rosa px-3 py-1 text-[12px] font-extrabold text-white shadow-soft">
                    Semana {currentWeek} · {hereText}
                  </span>
                </span>
              </li>,
            );
          }
          if (i === goalAt) rows.push(goalRow);
          rows.push(
            <li key={s.week} ref={isNow ? hereRef : isGoal ? goalRef : undefined} className="relative flex items-stretch gap-3">
              <div className="w-[96px] shrink-0 flex items-center justify-center py-1.5">
                <span style={{ width: artSize(s.week) }} className={`block transition ${passed ? '' : 'opacity-45 saturate-50'}`}>
                  {/* Pulsam só o coração do topo e o da fase em que o bebê está; as outras fases ficam quietas. */}
                  <BabyArt week={s.week} beat={s.week === stage.week} tone={shown} className="w-full h-auto" />
                </span>
              </div>
              <span data-fase={s.week} data-hoje={isNow || undefined} data-marco={isGoal || undefined} className="w-4 shrink-0" aria-hidden />
              <div className="flex-1 min-w-0 py-1.5">
                <div className={`flex items-start gap-2 rounded-[20px] transition ${isNow ? 'bg-rosa-soft ring-2 ring-rosa/50' : isGoal ? 'bg-surface outline-2 outline-dashed outline-lilas/45' : passed ? 'bg-surface shadow-soft' : 'bg-surface-2/60'}`}>
                  <button type="button" onClick={() => setOpen(o => (o === s.week ? null : s.week))} aria-expanded={expanded} className="flex-1 min-w-0 text-left px-3.5 py-3">
                    {isGoal && goal && (
                      <span className="block pb-1.5 mb-1.5 border-b border-dashed border-lilas/30">
                        {goalLine}
                        <span className="block text-[13.5px] font-bold text-ink">{goal.title}</span>
                      </span>
                    )}
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

/** Onde fica o trilho na horizontal: depois do desenho (96px) e do espaço (12px), no meio da coluna de 16px. */
const TRACK_X = 96 + 12 + 8;

/**
 * Mede o trilho na lista: começa no meio da primeira fase, termina no meio da
 * última e é preenchido até o meio do marcador de hoje. Refaz a conta quando
 * a lista muda de tamanho (uma fase aberta, a tela girando).
 */
function useTrack(listRef: React.RefObject<HTMLOListElement | null>, dep: unknown) {
  const [track, setTrack] = useState<{ top: number; height: number; filled: number; goal: number | null } | null>(null);
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const base = list.getBoundingClientRect().top;
      const mid = (el: Element | null | undefined) => (el ? el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2 - base : null);
      const phases = list.querySelectorAll('[data-fase]');
      const first = mid(phases[0]);
      const last = mid(phases[phases.length - 1]);
      const here = mid(list.querySelector('[data-hoje]'));
      if (first === null || last === null) return;
      const filled = Math.min(last, Math.max(first, here ?? first)) - first;
      const marco = mid(list.querySelector('[data-marco]'));
      const goal = marco === null ? null : marco - first;
      setTrack(prev => (prev && prev.top === first && prev.height === last - first && prev.filled === filled && prev.goal === goal ? prev : { top: first, height: last - first, filled, goal }));
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(list);
    return () => observer?.disconnect();
  }, [listRef, dep]);
  return track;
}

/**
 * O tom do bebê: o neutro (uma luz, sem cor de pele) ou um dos cinco tons de
 * pele. Fica recolhido num cantinho; ao abrir, o bebê já mostra cada tom, e só
 * grava ao salvar (vale para o espaço todo: a família vê igual).
 */
function ToneSetting({ tone, onPreview, onSave }: { tone: BabyTone; onPreview: (tone: BabyTone | null) => void; onSave: (tone: BabyTone) => Promise<boolean> | void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(tone);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 2500);
    return () => window.clearTimeout(timer);
  }, [saved]);
  const close = () => {
    setEditing(false);
    onPreview(null);
  };

  if (!editing) {
    return (
      <div className="mt-3 flex items-center justify-center gap-2 text-[12.5px]">
        <button
          type="button"
          onClick={() => {
            setDraft(tone);
            setEditing(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-ink-mute hover:text-ink hover:bg-surface-2"
        >
          <Swatch tone={tone} className="w-4 h-4" /> Tom do bebê <Palette className="w-3.5 h-3.5" />
        </button>
        {saved && (
          <span role="status" className="inline-flex items-center gap-1 font-bold text-ok">
            <Check className="w-3.5 h-3.5" /> Salvo
          </span>
        )}
      </div>
    );
  }
  return (
    <div className="mt-4 rounded-2xl bg-surface px-3 py-3 shadow-soft space-y-3">
      <p className="text-[12.5px] text-ink-soft">Escolham o tom do bebê. A família vê o mesmo.</p>
      <div className="flex items-center justify-center gap-2.5" role="radiogroup" aria-label="Tom do bebê">
        {(Object.keys(TONES) as BabyTone[]).map(t => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={draft === t}
            aria-label={TONE_LABEL[t]}
            title={TONE_LABEL[t]}
            onClick={() => {
              setDraft(t);
              onPreview(t);
            }}
            className={`rounded-full transition ${draft === t ? 'ring-2 ring-offset-2 ring-offset-surface ring-ink-soft scale-110' : 'hover:scale-110'}`}
          >
            <Swatch tone={t} className="w-7 h-7" />
          </button>
        ))}
      </div>
      <div className="flex justify-center gap-2">
        <button type="button" onClick={close} className="rounded-full px-4 py-2 text-sm font-semibold text-ink-soft hover:bg-surface-2">
          Cancelar
        </button>
        <button
          type="button"
          onClick={async () => {
            close();
            // "Salvo" só quando o servidor confirmar (no erro, o aviso do app explica).
            if (draft === tone || (await onSave(draft)) !== false) setSaved(true);
          }}
          className="rounded-full bg-brand px-5 py-2 text-sm font-bold text-on-accent shadow-soft"
        >
          Salvar
        </button>
      </div>
    </div>
  );
}

function Swatch({ tone, className }: { tone: BabyTone; className: string }) {
  const c = TONES[tone];
  return <span aria-hidden className={`block rounded-full ${className}`} style={{ background: `radial-gradient(circle at 35% 30%, ${c.light}, ${c.mid} 60%, ${c.deep})` }} />;
}
