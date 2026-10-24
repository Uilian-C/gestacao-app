import { useContext, useState } from 'react';
import { Check, Heart, LayoutList, Loader2 } from 'lucide-react';
import type { FamilyMember } from '../api';
import type { Checkin, Hug, JournalEntry, Mood } from '../hooks/useGestationData';
import { toISODate } from '../lib/dates';
import { PeopleContext, authorOf, firstName } from '../lib/people';
import { photoUrl } from '../api';
import { FOLDER, TONE, shortDate } from '../lib/folders';
import type { Author } from '../types';
import Avatar from './Avatar';
import MoodFace from './MoodFace';
import { MOOD_COLOR, MOODS, moodLabel, moodOf } from '../lib/moods';

// "Como vocês estão hoje?": como cada um está (um toque por dia), lado a lado. Depois
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
  /** Abre a linha do humor no Diário → Humor. */
  onMonth?: () => void;
  /** Os últimos posts do Mural (dos dois), com o que é novidade. */
  posts?: Array<{ entry: JournalEntry; isNew: boolean; mentionsMe: boolean }>;
  onOpenEntry?: (id: string) => void;
  onMural?: () => void;
}

export default function CheckIn({ role, checkins, hugs, onCheckin, onHug, onShare, onMonth, posts = [], onOpenEntry, onMural }: Props) {
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
      window.setTimeout(() => setJustSaved(false), 3500);
      if (onShare && !shared) setOffer(mood);
    }
  };

  // Os últimos 7 dias dos dois, em duas fileiras finas (o histórico completo fica no Diário → Humor).
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return toISODate(d);
  });
  const moodAt = (day: string, mineSide: boolean) => checkins.find(c => c.day === day && c.mine === mineSide)?.mood;
  const hasWeek = checkins.some(c => week.includes(c.day));

  return (
    <section aria-labelledby="checkin-titulo" className="rounded-[28px] bg-gradient-to-br from-rosa-soft/80 via-lilas-soft/50 to-azul-soft/40 p-3.5 space-y-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <h2 id="checkin-titulo" className="text-[1.05rem] text-ink">
          {partner ? 'Como vocês estão hoje?' : 'Como você está hoje?'}
        </h2>
        {/* Os últimos 7 dias, em bolinhas, levam ao histórico no Diário → Humor. */}
        {hasWeek && (
          <button type="button" onClick={onMonth} disabled={!onMonth} aria-label="Últimos 7 dias dos dois: ver o histórico" className="shrink-0 flex items-center gap-1.5 text-[12px] font-bold text-brand-strong">
            <span className="flex gap-[3px]" aria-hidden>
              {week.map(d => {
                const mood = moodAt(d, true) ?? moodAt(d, false);
                return <span key={d} className={`w-1.5 h-1.5 rounded-full ${mood ? MOOD_COLOR[mood].bg : 'bg-line'}`} />;
              })}
            </span>
            7 dias ›
          </button>
        )}
      </div>

      <div className={`grid gap-2 ${partner ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <Person member={me} role={role} name="Você" mood={mine?.mood} empty={picking ? 'Como está?' : ''} onChange={!picking ? () => setChanging(true) : undefined} />
        {partner && <Person member={partner} role={partner.role} name={partnerName!} mood={theirs?.mood} empty="Ainda não contou" />}
      </div>

      {picking && (
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
                className={`flex flex-col items-center gap-1 rounded-[18px] px-0.5 py-2 text-[11.5px] font-bold transition active:scale-95 ${on ? 'bg-rosa text-white shadow-soft' : 'bg-surface/80 text-ink-soft hover:text-ink'} ${saving && saving !== m.id ? 'opacity-60' : ''}`}
              >
                {saving === m.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <MoodFace path={m.face} className="w-5 h-5" />}
                {role === 'pai' ? m.pai : m.mae}
              </button>
            );
          })}
        </div>
      )}

      {/* Confirmação rápida: some sozinha (o humor já aparece no seu lado do cartão). */}
      {justSaved && (
        <p className="flex items-center gap-1.5 text-[13px] font-bold text-ok px-1" role="status">
          <Check className="w-4 h-4 animate-[tt-pop_400ms_ease-out]" strokeWidth={3} /> Registrado{partnerName ? `. ${partnerName} vai ver.` : '.'}
        </p>
      )}

      {offer && onShare && !shared && (
        <form
          className="rounded-2xl bg-rosa-soft px-3.5 py-3 space-y-2"
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
            <button type="submit" disabled={sharing} className="inline-flex items-center gap-1.5 rounded-full bg-rosa text-white px-4 py-1.5 text-sm font-extrabold shadow-soft disabled:opacity-60">
              {sharing && <Loader2 className="w-4 h-4 animate-spin" />} Postar no Mural
            </button>
            <button type="button" onClick={() => setOffer(null)} className="px-3 py-1.5 text-sm font-bold text-ink-soft">
              Agora não
            </button>
          </div>
        </form>
      )}
      {shared && (
        <p className="flex items-center gap-1.5 text-[13px] font-bold text-ok px-1" role="status">
          <Check className="w-4 h-4" /> Postado no Mural.
        </p>
      )}

      {/* Abraço: recebido, enviado ou o botão (com a ideia de cuidado, se a outra pessoa não está bem). */}
      {(hugGot || (partner && theirs)) && (
        <div className="space-y-1.5 px-1">
          {care && !hugSent && <p className="text-[13px] text-ink-soft">{care}</p>}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {hugGot && partnerName && (
              <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-rosa-strong">
                <Heart className="w-4 h-4 fill-rosa text-rosa" /> {partnerName} mandou um abraço para você hoje.
              </span>
            )}
            {partner && theirs && (hugSent ? (
              <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-rosa-strong">
                <Heart className="w-4 h-4 fill-current" /> Abraço enviado para {partnerName}
              </span>
            ) : (
              <button
                type="button"
                disabled={hugging}
                onClick={async () => {
                  setHugging(true);
                  await onHug();
                  setHugging(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-rosa text-white px-3.5 py-1.5 text-[13px] font-extrabold shadow-soft active:scale-95 disabled:opacity-60"
              >
                {hugging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4 fill-white" />} Mandar um abraço
              </button>
            ))}
          </div>
        </div>
      )}

      {posts.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-line">
          <div className="flex items-baseline justify-between gap-3 px-1 pt-2">
            <h3 className="text-[13px] font-extrabold uppercase tracking-wide text-ink-mute font-sans">No Mural</h3>
            {onMural && (
              <button type="button" onClick={onMural} className="text-[13px] font-bold text-brand-strong">
                Ver o mural
              </button>
            )}
          </div>
          {posts.map(({ entry: e, isNew, mentionsMe }) => (
            <PostRow key={e.id} entry={e} isNew={isNew} mentionsMe={mentionsMe} onOpen={() => onOpenEntry?.(e.id)} />
          ))}
        </div>
      )}
    </section>
  );
}

/** Um post do Mural, numa linha: foto (ou ícone da pasta), quem, o texto e o que é novo. */
function PostRow({ entry: e, isNew, mentionsMe, onOpen }: { entry: JournalEntry; isNew: boolean; mentionsMe: boolean; onOpen: () => void }) {
  const members = useContext(PeopleContext);
  const who = authorOf(members, e.mine, e.author_role);
  const f = FOLDER[e.folder];
  const photo = e.photos[0];
  return (
    <button type="button" onClick={onOpen} aria-label={`${f.singular} de ${who ? firstName(who.name) : e.author_role === 'mae' ? 'mãe' : 'pai'}: abrir`} className="w-full flex items-center gap-3 rounded-2xl px-1 py-1.5 text-left hover:bg-surface-2/60 transition">
      {photo ? (
        <img src={photoUrl(photo.id, photo.thumb)} alt="" loading="lazy" className="w-11 h-11 rounded-xl object-cover bg-surface-2 shrink-0" />
      ) : (
        <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${TONE[f.tone].soft} ${TONE[f.tone].text}`}>
          <f.Icon className="w-5 h-5" />
        </span>
      )}
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-1.5 text-xs text-ink-mute">
          <Avatar member={who} role={e.author_role} className="w-4 h-4 text-[8px]" />
          <span className="font-bold text-ink-soft truncate">{who ? firstName(who.name) : e.author_role === 'mae' ? 'Mãe' : 'Pai'}</span>· {shortDate(e.entry_date)}
          {mentionsMe ? <span className="rounded-full bg-brand text-on-accent px-1.5 text-[10px] font-extrabold">marcou você</span> : isNew && <span className="rounded-full bg-brand-soft text-brand-strong px-1.5 text-[10px] font-extrabold">novo</span>}
        </span>
        <span className="block text-[14px] text-ink truncate">{e.body || (e.photos.length ? `${e.photos.length === 1 ? '1 foto' : `${e.photos.length} fotos`}` : f.singular)}</span>
      </span>
    </button>
  );
}

/** Uma pessoa no cartão: foto, nome e como está hoje. */
function Person({ member, role, name, mood, empty, onChange }: { member?: FamilyMember; role: Author; name: string; mood?: Mood; empty: string; onChange?: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-surface/70 p-1 pr-3 min-w-0">
      <span className="relative shrink-0">
        <Avatar member={member} role={role} className="w-9 h-9 text-sm" />
        {mood && (
          <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-surface flex items-center justify-center shadow-soft ${role === 'pai' ? 'text-pai' : 'text-mae'}`}>
            <MoodFace path={moodOf(mood).face} className="w-4 h-4" />
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-bold text-ink-mute truncate leading-tight">{name}</span>
        <span className="flex items-baseline gap-1.5 min-w-0">
          <span className={`leading-tight truncate ${mood ? 'text-[14px] font-extrabold text-ink' : 'text-ink-mute text-[12.5px] font-semibold'}`}>{mood ? moodLabel(mood, role) : empty}</span>
          {onChange && (
            <button type="button" onClick={onChange} className="shrink-0 text-[11.5px] font-bold text-brand-strong">
              Trocar
            </button>
          )}
        </span>
      </span>
    </div>
  );
}
