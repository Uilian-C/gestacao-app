import { ChevronRight, X } from 'lucide-react';
import type { ReactNode } from 'react';

// "Para hoje": um cartão só, com no máximo três linhas, na ordem do que mais
// importa (alerta de saúde, compromisso de hoje ou amanhã, o que está atrasado,
// os lembretes no celular, a missão dos primeiros dias, a celebração, o nome).
// O resto continua na Agenda; quando não há nada, uma frase de carinho.

export type TodayTone = 'alert' | 'verde' | 'azul' | 'rosa' | 'lilas' | 'brand';

export interface TodayRow {
  id: string;
  tone: TodayTone;
  icon: ReactNode;
  /** A linha pequena de cima: quando e o quê ("Hoje · 14:00 · Consulta"). */
  kicker: string;
  title: string;
  sub?: string;
  onClick: () => void;
  /** Um botão no lugar da seta ("Contar", "Ativar"). */
  action?: string;
  onDismiss?: () => void;
}

const TONES: Record<TodayTone, { tile: string; text: string }> = {
  alert: { tile: 'bg-alert-soft text-alert', text: 'text-alert' },
  verde: { tile: 'bg-verde-soft text-verde-strong', text: 'text-verde-strong' },
  azul: { tile: 'bg-azul-soft text-azul-strong', text: 'text-azul-strong' },
  rosa: { tile: 'bg-rosa-soft text-rosa-strong', text: 'text-rosa-strong' },
  lilas: { tile: 'bg-lilas-soft text-lilas-strong', text: 'text-lilas-strong' },
  brand: { tile: 'bg-brand-soft text-brand-strong', text: 'text-brand-strong' },
};

export const TODAY_LIMIT = 3;

export default function TodayCard({ rows, onAgenda }: { rows: TodayRow[]; onAgenda: () => void }) {
  const shown = rows.slice(0, TODAY_LIMIT);
  const more = rows.length - shown.length;
  return (
    <section aria-labelledby="hoje-titulo" className="rounded-[28px] bg-surface shadow-soft px-3 pt-4 pb-2">
      <div className="flex items-baseline justify-between gap-3 px-2 pb-1">
        <h2 id="hoje-titulo" className="text-[1.2rem] text-ink">
          Para hoje
        </h2>
        <button type="button" onClick={onAgenda} className="inline-flex items-center text-[13px] font-bold text-brand-strong">
          Ver agenda <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
      {shown.length === 0 ? (
        <p className="px-2 pt-1 pb-3 text-[14px] text-ink-soft">Tudo em dia. Aproveitem o dia de vocês 💛</p>
      ) : (
        <ul className="divide-y divide-line/60">
          {shown.map(r => (
            <li key={r.id} className="relative">
              <button type="button" onClick={r.onClick} className={`w-full flex items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition active:scale-[0.99] ${r.onDismiss ? 'pr-9' : ''}`}>
                <span className={`w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center [&_svg]:w-5 [&_svg]:h-5 ${TONES[r.tone].tile}`} aria-hidden>
                  {r.icon}
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block text-[12px] font-extrabold truncate ${TONES[r.tone].text}`}>{r.kicker}</span>
                  <span className="font-bold text-ink leading-snug line-clamp-2">{r.title}</span>
                  {r.sub && <span className="block text-[12.5px] text-ink-soft truncate">{r.sub}</span>}
                </span>
                {r.action ? <span className={`shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-extrabold ${TONES[r.tone].tile}`}>{r.action}</span> : !r.onDismiss && <ChevronRight className="w-4 h-4 shrink-0 text-ink-mute" />}
              </button>
              {r.onDismiss && (
                <button type="button" onClick={r.onDismiss} aria-label="Agora não" className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-ink-mute hover:bg-surface-2">
                  <X className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {more > 0 && (
        <button type="button" onClick={onAgenda} className="w-full px-2 pt-1 pb-2 text-left text-[12.5px] font-bold text-ink-mute">
          e mais {more} {more === 1 ? 'item' : 'itens'} na agenda
        </button>
      )}
    </section>
  );
}
