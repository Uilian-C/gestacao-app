import { agoText, shares, type Sex, type Teams } from '../../lib/espera';

// O placar do bolão: Time Menina × Time Menino. O mesmo desenho no Início
// (compacto), na folha "A espera" e na página aberta do bolão: a barra com as
// porcentagens, os dois times com os nomes (o casal primeiro) e quem entrou
// por último.

const TEAM: Record<Sex, { label: string; text: string; chip: string; bar: string }> = {
  menina: { label: 'Time Menina', text: 'text-rosa-strong', chip: 'bg-rosa-soft text-rosa-strong', bar: 'bg-rosa' },
  menino: { label: 'Time Menino', text: 'text-azul-strong', chip: 'bg-azul-soft text-azul-strong', bar: 'bg-azul' },
};

/** A barra dos dois times, com as porcentagens nas pontas. */
export function PlacarBar({ menina, menino, size = 'md' }: { menina: number; menino: number; size?: 'sm' | 'md' }) {
  const p = shares(menina, menino);
  return (
    <div className="space-y-1">
      <div className={`flex items-baseline justify-between font-extrabold tabular ${size === 'sm' ? 'text-[12px]' : 'text-[13.5px]'}`}>
        <span className="text-rosa-strong">
          Time Menina {menina}
          {p.total > 0 && <span className="font-bold opacity-70"> · {p.menina}%</span>}
        </span>
        <span className="text-azul-strong">
          {p.total > 0 && <span className="font-bold opacity-70">{p.menino}% · </span>}
          {menino} Time Menino
        </span>
      </div>
      <div className={`flex overflow-hidden rounded-full bg-surface-2 ${size === 'sm' ? 'h-2' : 'h-3.5'}`} role="img" aria-label={`Placar: Time Menina ${menina}, Time Menino ${menino}`}>
        <span className="block h-full bg-rosa transition-all duration-700" style={{ width: `${p.menina}%` }} />
        <span className="block w-[3px] h-full bg-surface" aria-hidden />
        <span className="block h-full flex-1 bg-azul transition-all duration-700" />
      </div>
    </div>
  );
}

/** O placar completo: a barra, os dois times e o último palpite. */
export default function Placar({ teams, latest, highlight }: { teams: Teams; latest?: { name: string; guess: Sex; at: string } | null; highlight?: string | null }) {
  const p = shares(teams.menina.length, teams.menino.length);
  return (
    <div className="space-y-3">
      <PlacarBar menina={teams.menina.length} menino={teams.menino.length} />
      {p.total > 0 ? (
        <div className="grid grid-cols-2 gap-3" aria-label="Os times">
          {(['menina', 'menino'] as const).map(s => (
            <ul key={s} aria-label={TEAM[s].label} className={`flex flex-wrap content-start gap-1.5 ${s === 'menino' ? 'justify-end' : ''}`}>
              {teams[s].slice(0, 14).map((n, i) => (
                <li key={`${n}-${i}`} className={`rounded-full px-2.5 py-0.5 text-[12.5px] font-bold ${TEAM[s].chip} ${highlight && n === highlight ? 'ring-2 ring-current' : ''}`}>
                  {n}
                </li>
              ))}
              {teams[s].length > 14 && <li className="px-1 text-[12px] font-bold text-ink-mute">+{teams[s].length - 14}</li>}
            </ul>
          ))}
        </div>
      ) : (
        <p className="text-center text-[13px] text-ink-mute">Ninguém palpitou ainda. Quem começa?</p>
      )}
      {latest && (
        <p className="text-center text-[12.5px] text-ink-soft">
          <span className="font-bold text-ink">{latest.name}</span> entrou para o <span className={`font-bold ${TEAM[latest.guess].text}`}>{TEAM[latest.guess].label}</span>
          {agoText(latest.at) && <span className="text-ink-mute"> · {agoText(latest.at)}</span>}
        </p>
      )}
    </div>
  );
}
