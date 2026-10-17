import type { Checkin, Mood } from '../hooks/useGestationData';
import { parseLocalDate, toISODate } from '../lib/dates';
import type { Author } from '../types';

// "Como você está hoje?": um toque por dia. A outra pessoa vê a resposta, e a
// fileira da semana mostra como foram os últimos dias.

const MOODS: Array<{ id: Mood; mae: string; pai: string; face: string }> = [
  { id: 'otima', mae: 'Ótima', pai: 'Ótimo', face: 'M8 14c1.2 1.6 2.4 2.2 4 2.2s2.8-.6 4-2.2M9 9.5h.01M15 9.5h.01' },
  { id: 'bem', mae: 'Bem', pai: 'Bem', face: 'M9 15h6M9 9.5h.01M15 9.5h.01' },
  { id: 'cansada', mae: 'Cansada', pai: 'Cansado', face: 'M9 15.5h6M8 10h2.5M13.5 10H16' },
  { id: 'enjoada', mae: 'Enjoada', pai: 'Enjoado', face: 'M8.5 16c1-1.2 2.2-1.6 3.5-1.6s2.5.4 3.5 1.6M9 9.5h.01M15 9.5h.01' },
  { id: 'ansiosa', mae: 'Ansiosa', pai: 'Ansioso', face: 'M9 15.5c.8-.6 1.8-.9 3-.9s2.2.3 3 .9M8 8.5l2 1M16 8.5l-2 1' },
];

const moodLabel = (mood: Mood, role: Author) => MOODS.find(m => m.id === mood)![role === 'pai' ? 'pai' : 'mae'];

function Face({ path, className = 'w-7 h-7' }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d={path} />
    </svg>
  );
}

export default function CheckIn({ role, partnerName, checkins, busy, onCheckin }: { role: Author; partnerName: string | null; checkins: Checkin[]; busy: boolean; onCheckin: (mood: Mood | null) => void }) {
  const today = toISODate(new Date());
  const mine = checkins.find(c => c.mine && c.day === today);
  const theirs = checkins.find(c => !c.mine && c.day === today);
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const iso = toISODate(d);
    return { iso, letter: parseLocalDate(iso).toLocaleDateString('pt-BR', { weekday: 'narrow' }), mood: checkins.find(c => c.mine && c.day === iso)?.mood };
  });
  const hasWeek = week.some(w => w.mood);

  return (
    <section aria-labelledby="checkin-titulo" className="rounded-[28px] bg-surface shadow-soft p-5 space-y-3">
      <h2 id="checkin-titulo" className="text-[1.25rem] text-ink">Como você está hoje?</h2>
      <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="Como você está hoje">
        {MOODS.map(m => {
          const on = mine?.mood === m.id;
          const label = role === 'pai' ? m.pai : m.mae;
          return (
            <button
              key={m.id}
              type="button"
              disabled={busy}
              aria-pressed={on}
              onClick={() => onCheckin(on ? null : m.id)}
              className={`flex flex-col items-center gap-1 rounded-2xl px-0.5 py-2.5 text-[12px] font-bold transition active:scale-95 ${on ? 'bg-rosa text-white shadow-soft' : 'bg-surface-2 text-ink-soft hover:text-ink'}`}
            >
              <Face path={m.face} />
              {label}
            </button>
          );
        })}
      </div>
      {partnerName && (
        <p className="text-sm text-ink-soft">
          {theirs ? (
            <>
              <strong className="text-ink">{partnerName}</strong> hoje: {moodLabel(theirs.mood, theirs.author_role).toLowerCase()}.
            </>
          ) : (
            <>{partnerName} ainda não contou como está hoje.</>
          )}
        </p>
      )}
      {hasWeek && (
        <div className="flex items-center gap-2 pt-1" aria-label="Seus últimos 7 dias">
          <span className="text-xs font-bold text-ink-mute">Sua semana</span>
          <ol className="flex gap-1.5">
            {week.map(w => {
              const mood = w.mood ? MOODS.find(m => m.id === w.mood)! : null;
              return (
                <li key={w.iso} className="flex flex-col items-center gap-0.5" title={mood ? (role === 'pai' ? mood.pai : mood.mae) : 'sem resposta'}>
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center ${mood ? 'bg-rosa-soft text-rosa-strong' : 'bg-surface-2 text-line'}`}>
                    {mood ? <Face path={mood.face} className="w-5 h-5" /> : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                  </span>
                  <span className="text-[10px] font-bold uppercase text-ink-mute">{w.letter}</span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
