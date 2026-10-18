import { useContext, useState } from 'react';
import { ChevronDown, HeartHandshake, TrendingUp } from 'lucide-react';
import type { Checkin, JournalEntry } from '../../hooks/useGestationData';
import { gestationalWeekDays, gestationalWeekOf } from '../../lib/calendar';
import { parseLocalDate, toISODate } from '../../lib/dates';
import { FOLDER } from '../../lib/folders';
import { MOOD_COLOR, MOODS, moodCounts, moodLabel, moodOf, moodTrends, needsCare } from '../../lib/moods';
import { PeopleContext, firstName, memberWithRole } from '../../lib/people';
import type { Author } from '../../types';
import Avatar from '../Avatar';
import MoodFace from '../MoodFace';

// Diário → Humor: como vocês estiveram, semana a semana da gestação (não é um
// calendário; os dias com compromissos e humor juntos ficam na Agenda →
// Calendário). Cada semana tem duas faixas de 7 quadradinhos, uma por pessoa;
// tocar abre os dias. Embaixo, o resumo das últimas 4 semanas, o que mudou e um
// cuidado quando a ansiedade se repete. O humor se marca no Início.

const NOUN: Partial<Record<string, string>> = { cansada: 'O cansaço', enjoada: 'O enjoo', ansiosa: 'A ansiedade' };
const ROLES: Author[] = ['mae', 'pai'];
const PAGE = 8;

const shift = (iso: string, n: number) => {
  const d = parseLocalDate(iso);
  return toISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
};
const short = (iso: string) => parseLocalDate(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');

export default function MoodTab({ checkins, journal, dumDate, onOpenEntry }: { checkins: Checkin[]; journal: JournalEntry[]; dumDate: string; onOpenEntry: (id: string) => void }) {
  const people = useContext(PeopleContext);
  const today = toISODate(new Date());
  const current = gestationalWeekOf(dumDate, parseLocalDate(today));
  const first = checkins.reduce((min, c) => (c.day < min ? c.day : min), today);
  const oldest = Math.max(0, gestationalWeekOf(dumDate, parseLocalDate(first)));
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState<number | null>(current);
  const roles = ROLES.filter(r => memberWithRole(people, r) || checkins.some(c => c.author_role === r));
  const nameOf = (r: Author) => {
    const m = memberWithRole(people, r);
    return m ? firstName(m.name) : r === 'mae' ? 'Mãe' : 'Pai';
  };
  const moodAt = (day: string, r: Author) => checkins.find(c => c.day === day && c.author_role === r)?.mood;
  const weeks = Array.from({ length: Math.max(0, current - oldest + 1) }, (_, i) => current - i).slice(0, shown);
  const since = shift(today, -27);

  if (checkins.length === 0) {
    return (
      <div className="max-w-[560px] mx-auto rounded-[26px] bg-surface shadow-soft p-6 text-center space-y-1">
        <p className="font-display text-[1.25rem] text-ink">Como vocês estão, semana a semana</p>
        <p className="text-sm text-ink-soft">Marquem como estão no Início, no cartão "Vocês dois hoje". Aqui aparece a linha do humor de cada um ao longo da gestação.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[560px] mx-auto space-y-4">
      <section aria-label="Linha do humor" className="rounded-[26px] bg-surface shadow-soft p-4 space-y-3">
        <div>
          <h2 className="text-[1.2rem] text-ink">Linha do humor</h2>
          <p className="text-xs text-ink-mute">Cada quadradinho é um dia da semana da gestação. Toque numa semana para ver os dias.</p>
        </div>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-mute" aria-label="Legenda">
          {MOODS.map(md => (
            <li key={md.id} className="inline-flex items-center gap-1">
              <span className={`w-2.5 h-2.5 rounded-[3px] ${MOOD_COLOR[md.id].bg}`} /> {md.mae === md.pai ? md.mae : `${md.mae}/o`}
            </li>
          ))}
        </ul>

        <ol className="space-y-1.5">
          {weeks.map(w => {
            const days = gestationalWeekDays(dumDate, w).map(toISODate);
            const isOpen = open === w;
            const marked = days.some(d => roles.some(r => moodAt(d, r)));
            return (
              <li key={w} className={`rounded-2xl transition ${isOpen ? 'bg-surface-2/70' : ''}`}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : w)}
                  aria-expanded={isOpen}
                  aria-label={`Semana ${w}${w === current ? ' (esta semana)' : ''}: ${marked ? 'ver os dias' : 'sem respostas'}`}
                  className="w-full flex items-center gap-3 px-2.5 py-2 text-left"
                >
                  <span className="w-[62px] shrink-0 leading-tight">
                    <span className={`block text-sm font-extrabold ${w === current ? 'text-brand-strong' : 'text-ink'}`}>Sem. {w}</span>
                    <span className="block text-[10px] text-ink-mute">{short(days[0])}</span>
                  </span>
                  <span className="flex-1 min-w-0 space-y-1" aria-hidden>
                    {roles.map(r => (
                      <span key={r} className="flex items-center gap-1.5">
                        <Avatar member={memberWithRole(people, r)} role={r} className="w-4 h-4 text-[8px]" />
                        <span className="flex-1 grid grid-cols-7 gap-1">
                          {days.map(d => {
                            const mood = moodAt(d, r);
                            return <span key={d} className={`h-3.5 rounded-[4px] ${mood ? MOOD_COLOR[mood].bg : d > today ? 'bg-transparent border border-dashed border-line' : 'bg-surface-2'}`} />;
                          })}
                        </span>
                      </span>
                    ))}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-ink-mute shrink-0 transition ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && <WeekDays days={days} today={today} roles={roles} nameOf={nameOf} moodAt={moodAt} journal={journal} onOpenEntry={onOpenEntry} />}
              </li>
            );
          })}
        </ol>
        {current - oldest + 1 > shown && (
          <button type="button" onClick={() => setShown(n => n + PAGE)} className="w-full rounded-full bg-surface-2 py-2.5 text-sm font-bold text-ink-soft hover:text-ink">
            Ver semanas anteriores
          </button>
        )}
      </section>

      <section aria-label="Resumo das últimas 4 semanas" className="rounded-[26px] bg-surface shadow-soft p-4 space-y-4">
        <h2 className="text-[1.1rem] text-ink">Últimas 4 semanas</h2>
        {roles.map(r => {
          const counts = moodCounts(checkins, r, since, today);
          const sum = Object.values(counts).reduce((a, b) => a + b, 0);
          return (
            <div key={r} className="space-y-1.5">
              <p className="flex items-center gap-2 text-sm font-bold text-ink">
                <Avatar member={memberWithRole(people, r)} role={r} className="w-6 h-6 text-[10px]" /> {nameOf(r)}
                <span className="font-semibold text-ink-mute">· {sum === 1 ? '1 dia marcado' : `${sum} dias marcados`}</span>
              </p>
              {sum > 0 && (
                <>
                  <div className="flex h-2.5 rounded-full overflow-hidden bg-surface-2" aria-hidden>
                    {MOODS.filter(md => counts[md.id]).map(md => (
                      <span key={md.id} className={MOOD_COLOR[md.id].bg} style={{ width: `${(counts[md.id] / sum) * 100}%` }} />
                    ))}
                  </div>
                  <p className="text-xs text-ink-soft">
                    {MOODS.filter(md => counts[md.id])
                      .map(md => `${moodLabel(md.id, r)}: ${counts[md.id]}`)
                      .join(' · ')}
                  </p>
                </>
              )}
            </div>
          );
        })}
      </section>

      {roles.some(r => moodTrends(checkins, r, today).length > 0) && (
        <section aria-label="O que mudou" className="rounded-[26px] bg-surface shadow-soft p-4 space-y-2">
          <h2 className="flex items-center gap-2 text-[1.1rem] text-ink">
            <TrendingUp className="w-5 h-5 text-brand" /> O que mudou
          </h2>
          {roles.flatMap(r =>
            moodTrends(checkins, r, today).map(t => (
              <p key={`${r}-${t.mood}`} className="text-sm text-ink">
                <strong>{nameOf(r)}:</strong> {NOUN[t.mood]} aumentou nas últimas 2 semanas ({t.now} dias; nas 2 anteriores, {t.prev}).
              </p>
            )),
          )}
        </section>
      )}

      {roles
        .filter(r => needsCare(checkins, r, today))
        .map(r => (
          <section key={r} aria-label="Cuidado" className="rounded-[26px] bg-warm-soft p-4 space-y-1.5">
            <h2 className="flex items-center gap-2 text-[1.05rem] text-ink">
              <HeartHandshake className="w-5 h-5 text-warm" /> Um cuidado com {nameOf(r)}
            </h2>
            <p className="text-sm text-ink">
              A ansiedade apareceu em muitos dias desta semana. Isso é comum na gestação e tem cuidado: vale conversar com a equipe do pré-natal na próxima consulta, ou antes.
            </p>
            <p className="text-xs text-ink-soft">Se vier tristeza intensa ou pensamentos de se machucar, procurem ajuda logo: CVV, ligação gratuita para 188, 24 horas.</p>
          </section>
        ))}
    </div>
  );
}

/** Os dias de uma semana aberta: o humor de cada um e o que foi para o diário. */
function WeekDays({ days, today, roles, nameOf, moodAt, journal, onOpenEntry }: {
  days: string[];
  today: string;
  roles: Author[];
  nameOf: (r: Author) => string;
  moodAt: (day: string, r: Author) => ReturnType<typeof moodOf>['id'] | undefined;
  journal: JournalEntry[];
  onOpenEntry: (id: string) => void;
}) {
  return (
    <ol className="px-2.5 pb-2.5 space-y-1.5" aria-label="Dias da semana">
      {days
        .filter(d => d <= today)
        .reverse()
        .map(d => {
          const entries = journal.filter(e => e.entry_date.slice(0, 10) === d);
          const any = roles.some(r => moodAt(d, r));
          return (
            <li key={d} className="rounded-xl bg-surface px-3 py-2 space-y-1">
              <p className="text-xs font-bold text-ink-mute first-letter:uppercase">{parseLocalDate(d).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
              {any ? (
                <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-ink">
                  {roles.map(r => {
                    const mood = moodAt(d, r);
                    return (
                      <span key={r} className="inline-flex items-center gap-1">
                        {mood && <MoodFace path={moodOf(mood).face} className={`w-4 h-4 ${MOOD_COLOR[mood].text}`} />}
                        {nameOf(r)}: {mood ? moodLabel(mood, r) : 'não marcou'}
                      </span>
                    );
                  })}
                </p>
              ) : (
                <p className="text-sm text-ink-mute">Ninguém marcou.</p>
              )}
              {entries.map(e => (
                <button key={e.id} type="button" onClick={() => onOpenEntry(e.id)} className="block w-full text-left text-[13px] text-ink-soft line-clamp-1">
                  <strong>{FOLDER[e.folder].singular}:</strong> {e.body || 'foto'}
                </button>
              ))}
            </li>
          );
        })}
    </ol>
  );
}
