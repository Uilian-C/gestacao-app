import { useContext, useState } from 'react';
import { ChevronRight, Heart, Lock, MessageCircle, PenLine, Send } from 'lucide-react';
import { photoUrl, type FamilyMember } from '../../api';
import type { Folder, JournalEntry, Reaction, ThreadComment } from '../../hooks/useGestationData';
import { daysBetween, parseLocalDate, toISODate } from '../../lib/dates';
import { FOLDER, TONE, shortDate, weekOn } from '../../lib/folders';
import { mentionsMe } from '../../lib/mentions';
import { PeopleContext, authorOf, firstName } from '../../lib/people';
import { useMention } from '../../lib/useMention';
import type { Author } from '../../types';
import Avatar from '../Avatar';
import { MentionBar, MentionText } from '../Mentions';
import type { OnReact } from '../Social';

// O Mural do diário: tudo o que vocês guardam, do mais novo ao mais antigo, como
// uma rede social só de vocês dois. Foto grande, quem postou, abraço e conversa
// ali mesmo. As pastas continuam no Fichário, para guardar e procurar.

const PAGE = 12;

interface Props {
  entries: JournalEntry[];
  members: FamilyMember[];
  role: Author;
  dumDate: string;
  reactions: Reaction[];
  threads: ThreadComment[];
  /** A migração 011 já rodou: abraços e conversa. */
  social: boolean;
  journalAvailable: boolean;
  onReact: OnReact;
  onComment: (entryId: string, body: string) => Promise<boolean>;
  onOpen: (entryId: string) => void;
  onWrite: (folder: Folder) => void;
}

/** "hoje", "ontem", "há 3 dias" ou a data. */
function when(iso: string) {
  const days = daysBetween(parseLocalDate(iso), parseLocalDate(toISODate(new Date())));
  if (days === 0) return 'hoje';
  if (days === 1) return 'ontem';
  if (days > 1 && days < 7) return `há ${days} dias`;
  return shortDate(iso);
}

export default function Mural(props: Props) {
  const [shown, setShown] = useState(PAGE);
  const me = props.members.find(m => m.me);
  const list = props.entries.slice(0, shown);

  return (
    <div className="space-y-4">
      <button
        type="button"
        disabled={!props.journalAvailable}
        onClick={() => props.onWrite('momento')}
        className="w-full flex items-center gap-3 rounded-[26px] bg-surface shadow-soft p-3 pr-4 text-left transition hover:brightness-[0.99] disabled:opacity-60"
      >
        <Avatar member={me} role={props.role} className="w-11 h-11 text-base" />
        <span className="flex-1 min-w-0 rounded-full bg-surface-2 px-4 py-2.5 text-[15px] text-ink-mute truncate">O que vocês querem guardar hoje?</span>
        <PenLine className="w-5 h-5 text-brand shrink-0" aria-hidden />
      </button>

      {props.entries.length === 0 ? (
        <div className="rounded-[26px] bg-surface shadow-soft p-6 text-center space-y-1">
          <p className="font-display text-[1.25rem] text-ink">O mural de vocês começa aqui</p>
          <p className="text-sm text-ink-soft">Uma foto da barriga, uma notícia, uma carta para o bebê: tudo aparece aqui, com abraço e conversa.</p>
        </div>
      ) : (
        <ol className="space-y-4" aria-label="Mural">
          {list.map(e => (
            <li key={e.id}>
              <Post {...props} entry={e} me={me} />
            </li>
          ))}
        </ol>
      )}

      {props.entries.length > shown && (
        <button type="button" onClick={() => setShown(n => n + PAGE)} className="w-full rounded-full bg-surface shadow-soft py-3 text-sm font-bold text-ink-soft hover:text-ink">
          Ver mais antigos
        </button>
      )}
    </div>
  );
}

function Post({ entry: e, me, members, role, dumDate, reactions, threads, social, onReact, onComment, onOpen }: Props & { entry: JournalEntry; me?: FamilyMember }) {
  const f = FOLDER[e.folder];
  const t = TONE[f.tone];
  const who = authorOf(members, e.mine, e.author_role);
  const name = who ? firstName(who.name) : e.author_role === 'mae' ? 'Mãe' : 'Pai';
  const hugs = reactions.filter(r => r.target_type === 'entry' && r.target_id === e.id);
  const hugged = hugs.some(r => r.mine && r.kind === 'abraco');
  const comments = threads.filter(c => c.target_type === 'entry' && c.target_id === e.id);
  const letter = e.folder === 'carta';
  const serif = e.folder === 'momento' || letter;
  const open = () => onOpen(e.id);
  const others = [...new Set(hugs.filter(r => !r.mine).map(r => (r.author_role === 'mae' ? 'mãe' : 'pai')))];
  const fromMe = hugs.some(r => r.mine);
  const hugText = !others.length ? 'Você reagiu' : `${hugs.length === 1 ? 'Abraço' : 'Reações'} de ${others.join(' e ')}${fromMe ? ' e sua' : ''}`;

  return (
    <article className="rounded-[26px] bg-surface shadow-soft overflow-hidden" aria-label={`${f.singular} de ${name}`}>
      <header className="flex items-center gap-3 px-4 pt-3.5 pb-3">
        <Avatar member={who} role={e.author_role} className="w-10 h-10 text-sm" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="font-extrabold text-ink truncate">
            {name} <span className="font-semibold text-ink-mute text-sm">· {e.author_role === 'mae' ? 'mãe' : 'pai'}</span>
            {!e.mine && mentionsMe(members, e.body) && <span className="ml-1.5 align-middle whitespace-nowrap rounded-full bg-brand-soft text-brand-strong px-2 py-0.5 text-[11px] font-extrabold">marcou você</span>}
          </p>
          <p className="text-xs text-ink-mute flex items-center gap-1.5 mt-0.5">
            <span className={`inline-flex items-center gap-1 font-bold ${t.text}`}>
              <f.Icon className="w-3 h-3" /> {f.singular}
            </span>
            · {when(e.entry_date)} · semana {weekOn(dumDate, e.entry_date)}
            {e.visibility === 'private' && (
              <span className="inline-flex items-center gap-0.5">
                · <Lock className="w-3 h-3" /> só você
              </span>
            )}
          </p>
        </div>
        <button type="button" onClick={open} aria-label={`${f.singular} de ${name}: ver detalhes`} className="w-9 h-9 -mr-1 rounded-full text-ink-mute hover:bg-surface-2 flex items-center justify-center shrink-0">
          <ChevronRight className="w-4 h-4" />
        </button>
      </header>

      {e.photos.length > 0 && <Photos entry={e} week={e.folder === 'barriga' ? weekOn(dumDate, e.entry_date) : null} onOpen={open} />}

      {e.body && (
        <button type="button" onClick={open} className={`block w-full text-left px-4 ${e.photos.length ? 'pt-3' : 'pt-0'} ${letter ? 'pb-1' : ''}`}>
          <p className={`text-ink whitespace-pre-line line-clamp-6 ${serif ? 'font-display text-[1.12rem] leading-snug' : 'text-[15.5px]'} ${letter ? `italic rounded-2xl ${t.soft} px-4 py-3` : ''}`}>
            <MentionText text={e.body} />
          </p>
        </button>
      )}

      {social && (
        <div className="px-3 pt-2 pb-1 flex items-center gap-1">
          <button
            type="button"
            onClick={() => onReact('entry', e.id, 'abraco', !hugged)}
            aria-pressed={hugged}
            aria-label={hugged ? 'Tirar o abraço' : 'Mandar um abraço'}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold transition active:scale-90 ${hugged ? 'text-rosa' : 'text-ink-soft hover:bg-surface-2'}`}
          >
            <Heart className={`w-[22px] h-[22px] ${hugged ? 'fill-rosa' : ''}`} /> Abraço
          </button>
          <button type="button" onClick={open} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold text-ink-soft hover:bg-surface-2">
            <MessageCircle className="w-[22px] h-[22px]" /> {comments.length > 0 ? comments.length : 'Comentar'}
          </button>
        </div>
      )}

      {social && hugs.length > 0 && (
        <p className="px-4 text-[13px] text-ink-soft">
          <Heart className="inline w-3.5 h-3.5 fill-rosa text-rosa -mt-0.5" /> {hugText}
        </p>
      )}

      {social && comments.length > 0 && (
        <div className="px-4 pt-2 space-y-1.5">
          {comments.length > 2 && (
            <button type="button" onClick={open} className="text-[13px] font-semibold text-ink-mute">
              Ver os {comments.length} comentários
            </button>
          )}
          {comments.slice(-2).map(c => {
            const by = authorOf(members, c.mine, c.author_role);
            return (
              <p key={c.id} className="flex items-start gap-2 text-[14.5px] text-ink">
                <Avatar member={by} role={c.author_role} className="w-6 h-6 text-[10px] mt-0.5" />
                <span className="min-w-0 break-words">
                  <strong className="font-extrabold">{by ? firstName(by.name) : c.author_role === 'mae' ? 'Mãe' : 'Pai'}</strong> <MentionText text={c.body} />
                </span>
              </p>
            );
          })}
        </div>
      )}

      {social ? <Reply entryId={e.id} me={me} role={role} onComment={onComment} /> : <div className="h-4" />}
    </article>
  );
}

/** Uma foto grande; com mais de uma, desliza para o lado. */
function Photos({ entry: e, week, onOpen }: { entry: JournalEntry; week: number | null; onOpen: () => void }) {
  const [at, setAt] = useState(0);
  const many = e.photos.length > 1;
  return (
    <div className="relative bg-surface-2">
      <div
        className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
        onScroll={ev => {
          const el = ev.currentTarget;
          setAt(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
      >
        {e.photos.map((p, i) => (
          <button key={p.id} type="button" onClick={onOpen} aria-label={`Foto ${i + 1} de ${e.photos.length}: abrir`} className="snap-center shrink-0 w-full">
            <img src={photoUrl(p.id)} alt="" loading="lazy" className="w-full aspect-[4/5] max-h-[32rem] object-cover" />
          </button>
        ))}
      </div>
      {week != null && <span className="absolute left-3 top-3 rounded-full bg-black/55 text-white text-xs font-extrabold px-2.5 py-1">Semana {week}</span>}
      {many && (
        <>
          <span className="absolute right-3 top-3 rounded-full bg-black/55 text-white text-xs font-bold px-2 py-0.5 tabular">
            {at + 1}/{e.photos.length}
          </span>
          <span className="absolute inset-x-0 bottom-2.5 flex justify-center gap-1.5" aria-hidden>
            {e.photos.map((p, i) => (
              <span key={p.id} className={`w-1.5 h-1.5 rounded-full ${i === at ? 'bg-white' : 'bg-white/50'}`} />
            ))}
          </span>
        </>
      )}
    </div>
  );
}

/** Comentar ali mesmo, sem abrir o registro. */
function Reply({ entryId, me, role, onComment }: { entryId: string; me?: FamilyMember; role: Author; onComment: Props['onComment'] }) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const { ref: fieldRef, track, suggestions, unmarked, insert } = useMention<HTMLInputElement>(draft, setDraft, useContext(PeopleContext));
  return (
    <form
      className="px-4 pt-2.5 pb-3.5 space-y-2"
      onSubmit={async ev => {
        ev.preventDefault();
        const body = draft.trim();
        if (!body || sending) return;
        setSending(true);
        if (await onComment(entryId, body)) setDraft('');
        setSending(false);
      }}
    >
      <div className="flex items-center gap-2">
        <Avatar member={me} role={role} className="w-7 h-7 text-[11px]" />
        <input
          ref={fieldRef}
          aria-label="Comentar"
          placeholder="Comentar... (@ para marcar)"
          value={draft}
          onChange={ev => {
            setDraft(ev.target.value);
            track(ev);
          }}
          onSelect={track}
          maxLength={1000}
          className="flex-1 min-w-0 rounded-full bg-surface-2 px-3.5 py-2 text-[15px] text-ink placeholder:text-ink-mute outline-none focus:ring-2 focus:ring-brand/40"
        />
        {draft.trim() && (
          <button type="submit" disabled={sending} aria-label="Enviar comentário" className="w-9 h-9 shrink-0 rounded-full bg-brand text-on-accent flex items-center justify-center disabled:opacity-50">
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>
      <MentionBar suggestions={suggestions} unmarked={unmarked} onPick={insert} />
    </form>
  );
}
