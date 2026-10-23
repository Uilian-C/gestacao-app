import { useState } from 'react';
import { Check, ChevronDown, Sparkles, X } from 'lucide-react';
import { MISSIONS, firstDays, type MissionId } from '../../lib/firstDays';

// "Primeiros 7 dias com o Tumtum": a missão de hoje em destaque, os sete
// pontinhos do caminho e a lista inteira para quem quiser adiantar. Cada missão
// se marca sozinha quando a ação acontece; ao terminar, uma comemoração.

export default function FirstDays({ done, start, todayIso, onAction, onHide }: { done: Set<MissionId>; start: string; todayIso: string; onAction: (id: MissionId) => void; onHide: () => void }) {
  const [all, setAll] = useState(false);
  const s = firstDays(done, start, todayIso);
  const count = MISSIONS.filter(m => done.has(m.id)).length;
  return (
    <section aria-label="Primeiros 7 dias com o Tumtum" className="rounded-[26px] bg-gradient-to-br from-rosa-soft via-lilas-soft to-azul-soft shadow-soft px-4 pt-3.5 pb-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-rosa shrink-0" />
        <p className="flex-1 text-[12px] font-extrabold uppercase tracking-wide text-rosa">Primeiros 7 dias</p>
        <span className="text-[12px] font-bold text-ink-soft tabular">{count} de 7</span>
        <button type="button" onClick={onHide} aria-label={s.complete ? 'Fechar' : 'Agora não'} className="w-7 h-7 -mr-1 rounded-full flex items-center justify-center text-ink-mute hover:bg-surface/60">
          <X className="w-4 h-4" />
        </button>
      </div>
      <ol className="grid grid-cols-7 gap-1" aria-label="O caminho">
        {MISSIONS.map(m => (
          <li key={m.id} aria-label={`Dia ${m.day}: ${m.title}${done.has(m.id) ? ', feito' : ''}`} className={`h-1.5 rounded-full transition-colors ${done.has(m.id) ? 'bg-rosa' : m.day === s.today ? 'bg-rosa/35' : 'bg-surface/80'}`} />
        ))}
      </ol>

      {s.complete ? (
        <div className="text-center py-1">
          <p className="font-display text-[1.3rem] text-ink">Vocês já conhecem o Tumtum 💛</p>
          <p className="text-[13px] text-ink-soft mt-0.5">Agora é viver cada semana. A gente cuida do resto.</p>
        </div>
      ) : (
        s.next && (
          <div className="rounded-2xl bg-surface/85 px-3.5 py-3">
            <p className="text-[11.5px] font-extrabold text-ink-mute">{s.next.day === s.today ? `Dia ${s.today} · a missão de hoje` : `Dia ${s.next.day} · para fazer quando quiser`}</p>
            <p className="font-display text-[1.15rem] leading-snug text-ink">{s.next.title}</p>
            <p className="text-[12.5px] text-ink-soft">{s.next.why}</p>
            <button type="button" onClick={() => onAction(s.next!.id)} className="mt-2 rounded-full bg-rosa text-white px-4 py-1.5 text-[13px] font-extrabold">
              {s.next.action}
            </button>
          </div>
        )
      )}

      {!s.complete && (
        <>
          <button type="button" onClick={() => setAll(v => !v)} aria-expanded={all} className="inline-flex items-center gap-1 text-[12.5px] font-bold text-ink-soft">
            Ver os 7 dias <ChevronDown className={`w-3.5 h-3.5 transition ${all ? 'rotate-180' : ''}`} />
          </button>
          {all && (
            <ul className="space-y-1.5" aria-label="Os 7 dias">
              {MISSIONS.map(m => {
                const ok = done.has(m.id);
                return (
                  <li key={m.id}>
                    <button type="button" disabled={ok} onClick={() => onAction(m.id)} className="w-full flex items-center gap-2.5 rounded-xl bg-surface/70 px-3 py-2 text-left disabled:opacity-70">
                      <span className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[11px] font-extrabold ${ok ? 'bg-rosa text-white' : 'bg-surface text-ink-soft'}`}>{ok ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : m.day}</span>
                      <span className={`flex-1 text-[13.5px] ${ok ? 'text-ink-mute line-through' : 'text-ink font-semibold'}`}>{m.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
