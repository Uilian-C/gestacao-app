import { useContext, useState } from 'react';
import { Check, Heart, LayoutList, Loader2 } from 'lucide-react';
import type { FamilyMember } from '../api';
import type { Checkin, Hug, Mood } from '../hooks/useGestationData';
import { parseLocalDate, toISODate } from '../lib/dates';
import { PeopleContext, firstName } from '../lib/people';
import type { Author } from '../types';
import Avatar from './Avatar';
import MoodFace from './MoodFace';
import { MOODS, moodLabel, moodOf } from '../lib/moods';

// "Vocês dois hoje": como cada um está (um toque por dia), lado a lado. Depois
// de responder, o cartão confirma e fecha; se a outra pessoa não está bem, vem
// uma ideia de cuidado e o botão de mandar um abraço (chega como aviso).

/** Uma ideia de cuidado quando a outra pessoa não está bem (pelo papel dela). */
const CARE: Partial<Record<Mood, Record<Author, string>>> = {
  enjoada: { mae: 'Que tal cuidar do jantar hoje e deixar biscoito de água e sal por perto?', pai: 'Enjoo de solidariedade existe: um chá e um pouco de descanso ajudam.' },
  cansada: { mae: 'Assuma uma tarefa da casa hoje e deixe ela descansar sem culpa.', pai: 'Ele também precisa de pausa: que tal um tempo juntos, sem telas?' },
  ansiosa: { mae: 'Uma conversa sem pressa ajuda. Pergunte o que está pesando.', pai: 'Conversem sobre o que preocupa: dividir alivia os dois.' },
};

interface Props {
  role: Author;
  checkins: Checkin[];
  hugs: Hug[];
  onCheckin: (mood: Mood | null) => Promise<boolean>;
  onHug: () => Promise<boolean>;
  /** Contar no Mural (registro do dia a dia, para os dois). Sem ele, o cartão não oferece. */
  onShare?: (text: string) => Promise<boolean>;
  /** Abre o mês no Diário → Humor. */
  onMonth?: () => void;
}

export default function CheckIn({ role, checkins, hugs, onCheckin, onHug, onShare, onMonth }: Props) {
  const members = useContext(PeopleContext);
  const today = toISODate(new Date());
  const me = members.find(m => m.me);
  const partner = members.find(m => !m.me);
  const mine = checkins.find(c => c.mine && c.day === today);
  const theirs = checkins.find(c => !c.mine && c.day === today);
  const [changing, setChanging] = useState(false);
  const [saving, setSaving] = useState<Mood | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [hugging, setHugging] = useState(false);
  // Depois de responder: perguntar se quer contar no Mural.
  const [offer, setOffer] = useState<Mood | null>(null);
  const [note, setNote] = useState('');
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const picking = !mine || changing;
  const hugSent = hugs.some(h => !h.toMe && h.day === today);
  const hugGot = hugs.some(h => h.toMe && h.day === today);
  const care = theirs && partner ? CARE[theirs.mood]?.[theirs.author_role] : undefined;
  const partnerName = partner ? firstName(partner.name) : null;

  const pick = async (mood: Mood) => {
    setSaving(mood);
    setChanging(false);
    const ok = await onCheckin(mood);
    setSaving(null);
    if (ok) {
      setJustSaved(true);
      window.setTimeout(() => setJustSaved(false), 4000);
      if (onShare && !shared) setOffer(mood);
    }
  };

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const iso = toISODate(d);
    return { iso, letter: parseLocalDate(iso).toLocaleDateString('pt-BR', { weekday: 'narrow' }), mood: checkins.find(c => c.mine && c.day === iso)?.mood };
  });
  const hasWeek = week.filter(w => w.mood).length > 1;

  return (
    <section aria-labelledby="checkin-titulo" className="rounded-[28px] bg-surface shadow-soft p-5 space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="checkin-titulo" className="text-[1.25rem] text-ink">
          {partner ? 'Vocês dois hoje' : 'Como você está hoje?'}
        </h2>
        {onMonth && checkins.length > 0 && (
          <button type="button" onClick={onMonth} className="shrink-0 text-sm font-bold text-brand-strong">
            Ver o mês
          </button>
        )}
      </div>

      <div className={`grid gap-3 ${partner ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <Person member={me} role={role} name="Você" mood={mine?.mood} empty={picking ? 'Toque abaixo' : ''} />
        {partner && <Person member={partner} role={partner.role} name={partnerName!} mood={theirs?.mood} empty="Ainda não contou" />}
      </div>

      {picking ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-ink-soft">{mine ? 'Trocar a resposta de hoje:' : 'Como você está hoje?'}</p>
          <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="Como você está hoje">
            {MOODS.map(m => {
              const on = mine?.mood === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={saving !== null}
                  aria-pressed={on}
                  onClick={() => (on ? setChanging(false) : pick(m.id))}
                  className={`flex flex-col items-center gap-1 rounded-2xl px-0.5 py-2.5 text-[12px] font-bold transition active:scale-95 ${on ? 'bg-rosa text-white shadow-soft' : 'bg-surface-2 text-ink-soft hover:text-ink'} ${saving && saving !== m.id ? 'opacity-60' : ''}`}
                >
                  {saving === m.id ? <Loader2 className="w-7 h-7 animate-spin" /> : <MoodFace path={m.face} />}
                  {role === 'pai' ? m.pai : m.mae}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition-colors ${justSaved ? 'bg-ok-soft' : 'bg-surface-2'}`} role="status">
          <span className="flex items-center gap-2 text-sm text-ink">
            <span className={`w-6 h-6 rounded-full bg-ok text-white flex items-center justify-center shrink-0 ${justSaved ? 'animate-[tt-pop_400ms_ease-out]' : ''}`}>
              <Check className="w-4 h-4" strokeWidth={3} />
            </span>
            <span>
              <strong>Registrado.</strong> {partnerName ? `${partnerName} vai ver.` : 'Fica na sua semana.'}
            </span>
          </span>
          <button type="button" onClick={() => setChanging(true)} className="shrink-0 text-sm font-bold text-brand-strong">
            Trocar
          </button>
        </div>
      )}

      {offer && onShare && !shared && (
        <form
          className="rounded-2xl bg-rosa-soft px-4 py-3 space-y-2.5"
          aria-label="Contar no Mural"
          onSubmit={async e => {
            e.preventDefault();
            setSharing(true);
            const label = moodLabel(offer, role).toLowerCase();
            const ok = await onShare(`Hoje estou ${label}.${note.trim() ? ` ${note.trim()}` : ''}`);
            setSharing(false);
            if (ok) {
              setShared(true);
              setOffer(null);
            }
          }}
        >
          <p className="flex items-center gap-2 text-sm font-bold text-ink">
            <LayoutList className="w-4 h-4 text-rosa-strong" /> Quer contar no Mural{partnerName ? ` para ${partnerName}` : ''}?
          </p>
          <input aria-label="Quer dizer mais alguma coisa?" placeholder="Quer dizer mais alguma coisa? (opcional)" value={note} onChange={e => setNote(e.target.value)} maxLength={500} className="w-full rounded-full bg-surface px-3.5 py-2 text-[15px] text-ink placeholder:text-ink-mute outline-none focus:ring-2 focus:ring-brand/40" />
          <div className="flex items-center gap-2">
            <button type="submit" disabled={sharing} className="inline-flex items-center gap-1.5 rounded-full bg-rosa text-white px-4 py-2 text-sm font-extrabold shadow-soft disabled:opacity-60">
              {sharing && <Loader2 className="w-4 h-4 animate-spin" />} Postar no Mural
            </button>
            <button type="button" onClick={() => setOffer(null)} className="px-3 py-2 text-sm font-bold text-ink-soft">
              Agora não
            </button>
          </div>
        </form>
      )}
      {shared && (
        <p className="flex items-center gap-2 text-sm font-bold text-ok" role="status">
          <Check className="w-4 h-4" /> Postado no Mural.
        </p>
      )}

      {hugGot && partnerName && (
        <p className="flex items-center gap-2 rounded-2xl bg-rosa-soft px-4 py-3 text-sm text-ink">
          <Heart className="w-5 h-5 fill-rosa text-rosa shrink-0" /> {partnerName} mandou um abraço para você hoje.
        </p>
      )}

      {partner && theirs && (
        <div className="rounded-2xl border border-line px-4 py-3 space-y-2.5">
          {care && <p className="text-sm text-ink">{care}</p>}
          {hugSent ? (
            <p className="flex items-center gap-2 text-sm font-bold text-rosa-strong">
              <Heart className="w-4 h-4 fill-current" /> Abraço enviado para {partnerName}
            </p>
          ) : (
            <button
              type="button"
              disabled={hugging}
              onClick={async () => {
                setHugging(true);
                await onHug();
                setHugging(false);
              }}
              className="inline-flex items-center gap-2 rounded-full bg-rosa text-white px-4 py-2 text-sm font-extrabold shadow-soft active:scale-95 disabled:opacity-60"
            >
              {hugging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4 fill-white" />} Mandar um abraço
            </button>
          )}
        </div>
      )}

      {hasWeek && (
        <div className="flex items-center gap-2" aria-label="Seus últimos 7 dias">
          <span className="text-xs font-bold text-ink-mute">Sua semana</span>
          <ol className="flex gap-1.5">
            {week.map(w => {
              const mood = w.mood ? moodOf(w.mood) : null;
              return (
                <li key={w.iso} className="flex flex-col items-center gap-0.5" title={mood ? (role === 'pai' ? mood.pai : mood.mae) : 'sem resposta'}>
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center ${mood ? 'bg-rosa-soft text-rosa-strong' : 'bg-surface-2 text-line'}`}>
                    {mood ? <MoodFace path={mood.face} className="w-5 h-5" /> : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
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

/** Uma pessoa no cartão: foto, nome e como está hoje. */
function Person({ member, role, name, mood, empty }: { member?: FamilyMember; role: Author; name: string; mood?: Mood; empty: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface-2/60 p-3 min-w-0">
      <span className="relative shrink-0">
        <Avatar member={member} role={role} className="w-11 h-11 text-base" />
        {mood && (
          <span className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-surface flex items-center justify-center shadow-soft ${role === 'pai' ? 'text-pai' : 'text-mae'}`}>
            <MoodFace path={moodOf(mood).face} className="w-5 h-5" />
          </span>
        )}
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-bold text-ink-mute truncate">{name}</span>
        <span className={`block leading-tight ${mood ? 'font-extrabold text-ink truncate' : 'text-ink-mute text-[13px] font-semibold'}`}>{mood ? moodLabel(mood, role) : empty}</span>
      </span>
    </div>
  );
}
