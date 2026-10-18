import { useContext, useState } from 'react';
import { ChevronLeft, ChevronRight, HeartHandshake, TrendingUp } from 'lucide-react';
import type { Checkin, JournalEntry, Mood } from '../../hooks/useGestationData';
import { formatBR, parseLocalDate, toISODate } from '../../lib/dates';
import { FOLDER } from '../../lib/folders';
import { MOODS, moodCounts, moodLabel, moodOf, moodTrends, needsCare } from '../../lib/moods';
import { PeopleContext, firstName, memberWithRole } from '../../lib/people';
import type { Author } from '../../types';
import Avatar from '../Avatar';
import MoodFace from '../MoodFace';

// Diário → Humor: o calendário do mês com como cada um estava, o resumo por
// pessoa, o que mudou nas últimas semanas e um cuidado quando a ansiedade se
// repete. O humor se marca no Início ("Vocês dois hoje").

/** Uma cor por humor, igual no calendário, na legenda e nas barras. */
const MOOD_COLOR: Record<Mood, { text: string; bg: string }> = {
  otima: { text: 'text-ok', bg: 'bg-ok' },
  bem: { text: 'text-azul', bg: 'bg-azul' },
  cansada: { text: 'text-warn', bg: 'bg-warn' },
  enjoada: { text: 'text-coral', bg: 'bg-coral' },
  ansiosa: { text: 'text-lilas', bg: 'bg-lilas' },
};

const NOUN: Partial<Record<Mood, string>> = { cansada: 'O cansaço', enjoada: 'O enjoo', ansiosa: 'A ansiedade' };
const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const ROLES: Author[] = ['mae', 'pai'];

const monthOf = (iso: string) => iso.slice(0, 7);
function shiftMonth(month: string, n: number) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function MoodTab({ checkins, journal, onOpenEntry }: { checkins: Checkin[]; journal: JournalEntry[]; onOpenEntry: (id: string) => void }) {
  const people = useContext(PeopleContext);
  const today = toISODate(new Date());
  const [month, setMonth] = useState(monthOf(today));
  const [picked, setPicked] = useState(today);
  const first = checkins.reduce((min, c) => (c.day < min ? c.day : min), today);
  const roles = ROLES.filter(r => memberWithRole(people, r) || checkins.some(c => c.author_role === r));
  const nameOf = (r: Author) => {
    const m = memberWithRole(people, r);
    return m ? firstName(m.name) : r === 'mae' ? 'Mãe' : 'Pai';
  };
  const moodAt = (day: string, r: Author) => checkins.find(c => c.day === day && c.author_role === r)?.mood;

  // A grade do mês: espaços até o dia da semana do dia 1, depois os dias.
  const [y, m] = month.split('-').map(Number);
  const lead = new Date(y, m - 1, 1).getDay();
  const total = new Date(y, m, 0).getDate();
  const days = Array.from({ length: total }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
  const monthName = parseLocalDate(`${month}-01`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  if (checkins.length === 0) {
    return (
      <div className="max-w-[560px] mx-auto rounded-[26px] bg-surface shadow-soft p-6 text-center space-y-1">
        <p className="font-display text-[1.25rem] text-ink">O humor de vocês, dia a dia</p>
        <p className="text-sm text-ink-soft">Marquem como estão no Início, no cartão "Vocês dois hoje". Aqui vira o calendário do mês, com o resumo de cada um.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[560px] mx-auto space-y-4">
      <section aria-label="Calendário do humor" className="rounded-[26px] bg-surface shadow-soft p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} disabled={month <= monthOf(first)} aria-label="Mês anterior" className="w-10 h-10 rounded-full hover:bg-surface-2 text-ink-soft flex items-center justify-center disabled:opacity-30">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-[1.2rem] text-ink first-letter:uppercase">{monthName}</h2>
          <button type="button" onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= monthOf(today)} aria-label="Próximo mês" className="w-10 h-10 rounded-full hover:bg-surface-2 text-ink-soft flex items-center justify-center disabled:opacity-30">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        {roles.length > 1 && (
          <p className="flex items-center justify-center gap-3 text-xs text-ink-mute">
            {roles.map((r, i) => (
              <span key={r} className="inline-flex items-center gap-1.5">
                <Avatar member={memberWithRole(people, r)} role={r} className="w-5 h-5 text-[9px]" /> {nameOf(r)} {i === 0 ? 'à esquerda' : 'à direita'}
              </span>
            ))}
          </p>
        )}
        <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-label={`Humor em ${monthName}`}>
          {WEEKDAYS.map((w, i) => (
            <span key={i} className="text-[11px] font-extrabold text-ink-mute py-1" aria-hidden>
              {w}
            </span>
          ))}
          {Array.from({ length: lead }, (_, i) => (
            <span key={`vazio-${i}`} aria-hidden />
          ))}
          {days.map(day => {
            const future = day > today;
            const on = day === picked;
            const label = `${formatBR(day)}: ${roles.map(r => `${nameOf(r)} ${moodAt(day, r) ? moodLabel(moodAt(day, r)!, r).toLowerCase() : 'sem resposta'}`).join(', ')}`;
            return (
              <button
                key={day}
                type="button"
                role="gridcell"
                disabled={future}
                aria-selected={on}
                aria-label={label}
                onClick={() => setPicked(day)}
                className={`rounded-xl min-h-[58px] px-0.5 pt-1 pb-1.5 flex flex-col items-center gap-1 transition ${on ? 'bg-brand-soft ring-2 ring-brand' : day === today ? 'ring-1 ring-brand/40' : 'hover:bg-surface-2'} disabled:opacity-35`}
              >
                <span className={`text-[12px] tabular ${on ? 'font-extrabold text-brand-strong' : 'font-semibold text-ink-soft'}`}>{Number(day.slice(8))}</span>
                <span className="flex gap-0.5">
                  {roles.map(r => {
                    const mood = moodAt(day, r);
                    return mood ? <MoodFace key={r} path={moodOf(mood).face} className={`w-[18px] h-[18px] ${MOOD_COLOR[mood].text}`} /> : <span key={r} className="w-[18px] h-[18px] flex items-center justify-center"><span className="w-1 h-1 rounded-full bg-line" /></span>;
                  })}
                </span>
              </button>
            );
          })}
        </div>
        <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1 pt-1 text-[11px] text-ink-mute" aria-label="Legenda">
          {MOODS.map(md => (
            <li key={md.id} className="inline-flex items-center gap-1">
              <MoodFace path={md.face} className={`w-3.5 h-3.5 ${MOOD_COLOR[md.id].text}`} /> {md.mae === md.pai ? md.mae : `${md.mae}/o`}
            </li>
          ))}
        </ul>
      </section>

      <DayDetail day={picked} roles={roles} nameOf={nameOf} moodAt={moodAt} entries={journal.filter(e => e.entry_date.slice(0, 10) === picked)} onOpenEntry={onOpenEntry} />

      <section aria-label="Resumo do mês" className="rounded-[26px] bg-surface shadow-soft p-4 space-y-4">
        <h2 className="text-[1.1rem] text-ink">Resumo do mês</h2>
        {roles.map(r => {
          const counts = moodCounts(checkins, r, month);
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

      {roles.filter(r => needsCare(checkins, r, today)).map(r => (
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

/** O dia escolhido no calendário: como cada um estava e o que guardaram no diário. */
function DayDetail({ day, roles, nameOf, moodAt, entries, onOpenEntry }: {
  day: string;
  roles: Author[];
  nameOf: (r: Author) => string;
  moodAt: (day: string, r: Author) => Mood | undefined;
  entries: JournalEntry[];
  onOpenEntry: (id: string) => void;
}) {
  const people = useContext(PeopleContext);
  const date = parseLocalDate(day).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <section aria-label="Dia escolhido" className="rounded-[26px] bg-surface shadow-soft p-4 space-y-3">
      <h2 className="text-[1.05rem] text-ink first-letter:uppercase">{date}</h2>
      <ul className="grid grid-cols-2 gap-2">
        {roles.map(r => {
          const mood = moodAt(day, r);
          return (
            <li key={r} className="flex items-center gap-2.5 rounded-2xl bg-surface-2/60 p-2.5 min-w-0">
              <Avatar member={memberWithRole(people, r)} role={r} className="w-9 h-9 text-xs" />
              <span className="min-w-0">
                <span className="block text-xs font-bold text-ink-mute truncate">{nameOf(r)}</span>
                <span className={`flex items-center gap-1 font-extrabold ${mood ? 'text-ink' : 'text-ink-mute text-[13px] font-semibold'}`}>
                  {mood && <MoodFace path={moodOf(mood).face} className={`w-4 h-4 ${MOOD_COLOR[mood].text}`} />}
                  {mood ? moodLabel(mood, r) : 'Não marcou'}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      {entries.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-bold text-ink-mute">No diário nesse dia</p>
          {entries.map(e => (
            <button key={e.id} type="button" onClick={() => onOpenEntry(e.id)} className="w-full text-left rounded-2xl bg-surface-2/60 px-3 py-2 text-sm text-ink line-clamp-2">
              <strong className="text-ink-soft">{FOLDER[e.folder].singular}:</strong> {e.body || 'foto'}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
