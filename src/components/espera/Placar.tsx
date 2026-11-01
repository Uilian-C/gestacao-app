import { agoText, OPTION, percents, TEAM_TONE, type Sex, type Teams } from '../../lib/espera';

// O placar do bolão: Time Menina × Time Menino (e, para gêmeos, Time Meninas,
// Time Casal e Time Meninos). O mesmo desenho no Início (compacto), na folha
// "A espera" e na página aberta do bolão: a barra com as porcentagens, os
// times com os nomes (o casal primeiro) e quem entrou por último.


/** A barra dos times, com os números e as porcentagens. */
export function PlacarBar({ options, counts, size = 'md' }: { options: Sex[]; counts: Partial<Record<Sex, number>>; size?: 'sm' | 'md' }) {
  const values = options.map(o => counts[o] ?? 0);
  const total = values.reduce((a, b) => a + b, 0);
  const pct = percents(values);
  const three = options.length === 3;
  return (
    <div className="space-y-1">
      <div className={`grid ${three ? 'grid-cols-3' : 'grid-cols-2'} font-extrabold tabular ${size === 'sm' ? 'text-[12px]' : 'text-[13.5px]'}`}>
        {options.map((o, i) => (
          <span key={o} className={`${TEAM_TONE[o].text} ${i === options.length - 1 ? 'text-right' : three && i === 1 ? 'text-center' : ''}`}>
            {three ? (
              <>
                <span className="block whitespace-nowrap">{OPTION[o].team}</span>
                <span className="block">
                  {values[i]}
                  {total > 0 && <span className="font-bold opacity-70"> · {pct[i]}%</span>}
                </span>
              </>
            ) : (
              <>
                {OPTION[o].team} {values[i]}
                {total > 0 && <span className="font-bold opacity-70"> · {pct[i]}%</span>}
              </>
            )}
          </span>
        ))}
      </div>
      <div className={`flex overflow-hidden rounded-full bg-surface-2 ${size === 'sm' ? 'h-2' : 'h-3.5'}`} role="img" aria-label={`Placar: ${options.map((o, i) => `${OPTION[o].team} ${values[i]}`).join(', ')}`}>
        {options.map((o, i) => (
          <span key={o} className={`block h-full ${TEAM_TONE[o].bar} transition-all duration-700 ${i > 0 ? 'border-l-[3px] border-surface' : ''}`} style={{ width: `${pct[i]}%` }} />
        ))}
      </div>
    </div>
  );
}

/** O placar completo: a barra, os times e o último palpite. */
export default function Placar({ teams, latest, highlight }: { teams: Teams; latest?: { name: string; guess: Sex; at: string } | null; highlight?: string | null }) {
  const options = Object.keys(teams) as Sex[];
  const counts = Object.fromEntries(options.map(o => [o, teams[o]?.length ?? 0])) as Partial<Record<Sex, number>>;
  const total = options.reduce((n, o) => n + (counts[o] ?? 0), 0);
  const three = options.length === 3;
  return (
    <div className="space-y-3">
      <PlacarBar options={options} counts={counts} />
      {total > 0 ? (
        <div className={`grid ${three ? 'grid-cols-3' : 'grid-cols-2'} gap-3`} aria-label="Os times">
          {options.map((s, i) => (
            <ul key={s} aria-label={OPTION[s].team} className={`flex flex-wrap content-start gap-1.5 ${i === options.length - 1 ? 'justify-end' : three && i === 1 ? 'justify-center' : ''}`}>
              {(teams[s] ?? []).slice(0, 14).map((n, j) => (
                <li key={`${n}-${j}`} className={`rounded-full px-2.5 py-0.5 text-[12.5px] font-bold ${TEAM_TONE[s].chip} ${highlight && n === highlight ? 'ring-2 ring-current' : ''}`}>
                  {n}
                </li>
              ))}
              {(teams[s]?.length ?? 0) > 14 && <li className="px-1 text-[12px] font-bold text-ink-mute">+{teams[s]!.length - 14}</li>}
            </ul>
          ))}
        </div>
      ) : (
        <p className="text-center text-[13px] text-ink-mute">Ninguém palpitou ainda. Quem começa?</p>
      )}
      {latest && OPTION[latest.guess] && (
        <p className="text-center text-[12.5px] text-ink-soft">
          <span className="font-bold text-ink">{latest.name}</span> entrou para o <span className={`font-bold ${TEAM_TONE[latest.guess].text}`}>{OPTION[latest.guess].team}</span>
          {agoText(latest.at) && <span className="text-ink-mute"> · {agoText(latest.at)}</span>}
        </p>
      )}
    </div>
  );
}
