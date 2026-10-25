import { useContext, useEffect, useRef, useState } from 'react';
import { ChevronRight, Heart, Lock, MessageCircle, Send, Users } from 'lucide-react';
import { photoUrl, type FamilyMember, type Relative, type SpaceRole } from '../../api';
import type { Folder, JournalEntry, Reaction, ThreadComment } from '../../hooks/useGestationData';
import { daysBetween, hhmmOf, parseLocalDate, parseTimestamp, stampText, toISODate } from '../../lib/dates';
import { FOLDER, FOLDERS, TONE, shortDate, weekOn } from '../../lib/folders';
import { mentionsMe } from '../../lib/mentions';
import { FreshEntryContext, PeopleContext, RelativesContext, authorOf, firstName, speakerOf } from '../../lib/people';
import { useMention } from '../../lib/useMention';
import Avatar from '../Avatar';
import { MentionBar, MentionText } from '../Mentions';
import type { OnReact } from '../Social';

// O Mural do diário: tudo o que vocês guardam, do mais novo ao mais antigo, como
// uma rede social só de vocês dois, separado pelas semanas da gestação. Foto
// grande, quem postou e o abraço; a conversa abre ali mesmo, quando tocada.
// As pastas continuam no Fichário, para guardar e procurar.
// Os familiares (migração 023) veem aqui só os posts para a família, e só
// abraçam e comentam.

const PAGE = 12;

interface Props {
  entries: JournalEntry[];
  members: FamilyMember[];
  role: SpaceRole;
  dumDate: string;
  reactions: Reaction[];
  threads: ThreadComment[];
  /** A migração 011 já rodou: abraços e conversa. */
  social: boolean;
  journalAvailable: boolean;
  onReact: OnReact;
  onComment: (entryId: string, body: string) => Promise<boolean>;
  onOpen: (entryId: string) => void;
  /** Sem ele (familiar), não há o campo de escrever. */
  onWrite?: (folder?: Folder) => void;
}

/** O post foi feito no próprio dia do momento: aí a hora ajuda (registro de um dia passado mostra só a data). */
const sameDay = (e: JournalEntry) => !!e.created_at && toISODate(parseTimestamp(e.created_at)) === e.entry_date.slice(0, 10);

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
  const relatives = useContext(RelativesContext);
  const me: FamilyMember | Relative | undefined = props.members.find(m => m.me) ?? relatives.find(r => r.me);
  const list = props.entries.slice(0, shown);
  const { onWrite } = props;

  return (
    // Uma coluna de leitura: no tablet e no computador o post não estica até a borda.
    <div className="space-y-4 max-w-[560px] mx-auto">
      {onWrite && (
        <div className="rounded-[26px] bg-surface/80 p-3 space-y-2.5">
          <button type="button" disabled={!props.journalAvailable} onClick={() => onWrite()} className="w-full flex items-center gap-3 text-left disabled:opacity-60">
            <Avatar member={me} role={props.role} className="w-10 h-10 text-base" />
            <span className="flex-1 min-w-0 rounded-full bg-surface-2 px-4 py-2.5 text-[15px] text-ink-mute truncate">O que vocês querem guardar hoje?</span>
          </button>
          {/* Um toque e o formulário já abre na pasta certa. */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pl-[3.25rem]" role="group" aria-label="Guardar direto numa pasta">
            {FOLDERS.map(f => (
              <button key={f.id} type="button" disabled={!props.journalAvailable} onClick={() => onWrite(f.id)} className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12.5px] font-bold ${TONE[f.tone].soft} ${TONE[f.tone].text} disabled:opacity-60`}>
                <f.Icon className="w-3.5 h-3.5" /> {f.singular}
              </button>
            ))}
          </div>
        </div>
      )}


      {props.entries.length === 0 ? (
        <div className="rounded-[26px] bg-surface/80 p-6 text-center space-y-1">
          {onWrite ? (
            <>
              <p className="font-display text-[1.25rem] text-ink">O mural de vocês começa aqui</p>
              <p className="text-sm text-ink-soft">Uma foto da barriga, uma notícia, uma carta para o bebê: tudo aparece aqui, com abraço e conversa.</p>
            </>
          ) : (
            <>
              <p className="font-display text-[1.25rem] text-ink">Ainda não há posts para a família</p>
              <p className="text-sm text-ink-soft">Quando o casal guardar um momento para a família, ele aparece aqui, e você recebe um aviso.</p>
            </>
          )}
        </div>
      ) : (
        <ol className="space-y-4" aria-label="Mural">
          {list.map((e, i) => {
            const week = weekOn(props.dumDate, e.entry_date);
            const first = i === 0 || weekOn(props.dumDate, list[i - 1].entry_date) !== week;
            return (
              <li key={e.id}>
                {first && <WeekMark week={week} current={weekOn(props.dumDate, toISODate(new Date()))} />}
                <Post {...props} entry={e} me={me} />
              </li>
            );
          })}
        </ol>
      )}

      {props.entries.length > shown && (
        <button type="button" onClick={() => setShown(n => n + PAGE)} className="w-full rounded-full bg-surface/80 py-3 text-sm font-bold text-ink-soft hover:text-ink">
          Ver mais antigos
        </button>
      )}
    </div>
  );
}

/** Um marcador discreto entre as semanas: o Mural vira a linha do tempo da gestação. */
function WeekMark({ week, current }: { week: number; current: number }) {
  return (
    <p className="flex items-center gap-2 px-1 pb-2 text-[12px] font-extrabold uppercase tracking-wide text-ink-mute">
      Semana {week}
      {week === current && <span className="normal-case tracking-normal font-bold text-rosa-strong">· esta semana</span>}
      <span className="flex-1 h-px bg-line/70" aria-hidden />
    </p>
  );
}

function Post({ entry: e, me, members, role, dumDate, reactions, threads, social, onReact, onComment, onOpen }: Props & { entry: JournalEntry; me?: FamilyMember | Relative }) {
  const relatives = useContext(RelativesContext);
  // O post que acabou de ser guardado: aparece em destaque, e a tela vai até ele.
  const fresh = useContext(FreshEntryContext) === e.id;
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (fresh) ref.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  }, [fresh]);
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
  // O campo de comentar só aparece quando pedido: o Mural fica leve.
  const [replying, setReplying] = useState(false);
  const others = [...new Set(hugs.filter(r => !r.mine).map(r => speakerOf(members, relatives, r).label))];
  const fromMe = hugs.some(r => r.mine);
  const hugText = !others.length ? 'Você reagiu' : `${hugs.length === 1 ? 'Abraço' : 'Reações'} de ${others.join(' e ')}${fromMe ? ' e sua' : ''}`;

  return (
    <article
      ref={ref}
      data-fresh={fresh || undefined}
      className={`rounded-[26px] bg-surface/80 overflow-hidden cursor-pointer transition-shadow duration-700 ${fresh ? 'ring-2 ring-brand ring-offset-2 ring-offset-canvas tt-novo' : ''}`}
      aria-label={`${f.singular} de ${name}`}
      // O post inteiro abre os detalhes; abraço, comentário e marcação continuam com o próprio toque.
      onClick={ev => {
        if (!(ev.target as HTMLElement).closest('button, a, input, textarea, form')) open();
      }}
    >
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
            · {when(e.entry_date)}{sameDay(e) && `, ${hhmmOf(e.created_at)}`}
            {e.visibility === 'family' && role !== 'familia' && (
              <span className="inline-flex items-center gap-0.5">
                · <Users className="w-3 h-3" /> família
              </span>
            )}
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
          <button type="button" onClick={() => setReplying(v => !v)} aria-expanded={replying} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold text-ink-soft hover:bg-surface-2">
            <MessageCircle className="w-[22px] h-[22px]" /> Comentar{comments.length > 0 && <span className="tabular text-ink-mute">· {comments.length}</span>}
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
            const by = speakerOf(members, relatives, c);
            return (
              <p key={c.id} className="flex items-start gap-2 text-[14.5px] text-ink">
                <Avatar member={by.person} role={c.author_role} className="w-6 h-6 text-[10px] mt-0.5" />
                <span className="min-w-0 break-words">
                  <strong className="font-extrabold">{by.name}</strong> <MentionText text={c.body} />
                  {c.created_at && <span className="ml-1 text-[11px] text-ink-mute whitespace-nowrap">{stampText(c.created_at)}</span>}
                </span>
              </p>
            );
          })}
        </div>
      )}

      {social && replying ? <Reply entryId={e.id} me={me} role={role} onComment={onComment} /> : <div className="h-3" />}
    </article>
  );
}

/** Uma foto grande; com mais de uma, desliza para o lado. */
/** Proporção (largura/altura) que a foto pode ter no Mural: de 4:5 (em pé) a 1,91:1 (deitada), como nas redes sociais. */
const MIN_RATIO = 4 / 5;
const MAX_RATIO = 1.91;

/**
 * As fotos do post, grandes. O quadro segue a proporção da primeira foto
 * (dentro dos limites acima), igual em celular, tablet e computador; com mais
 * de uma, desliza para o lado. Enquanto carrega, o quadro já tem o tamanho
 * certo, sem a página "pular".
 */
function Photos({ entry: e, week, onOpen }: { entry: JournalEntry; week: number | null; onOpen: () => void }) {
  const [at, setAt] = useState(0);
  const [ratio, setRatio] = useState(MIN_RATIO);
  const [loaded, setLoaded] = useState<Set<string>>(() => new Set());
  const many = e.photos.length > 1;
  return (
    <div className="relative bg-surface-2 overflow-hidden" style={{ aspectRatio: String(ratio) }}>
      <div
        className="absolute inset-0 flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
        onScroll={ev => {
          const el = ev.currentTarget;
          setAt(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
      >
        {e.photos.map((p, i) => (
          <button key={p.id} type="button" onClick={onOpen} aria-label={`Foto ${i + 1} de ${e.photos.length}: abrir`} className="snap-center shrink-0 w-full h-full">
            <img
              src={photoUrl(p.id)}
              alt=""
              loading="lazy"
              decoding="async"
              onLoad={ev => {
                const img = ev.currentTarget;
                if (i === 0 && img.naturalWidth && img.naturalHeight) setRatio(Math.min(MAX_RATIO, Math.max(MIN_RATIO, img.naturalWidth / img.naturalHeight)));
                setLoaded(prev => new Set(prev).add(p.id));
              }}
              className={`w-full h-full object-cover transition-opacity duration-300 ${loaded.has(p.id) ? 'opacity-100' : 'opacity-0'}`}
            />
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
function Reply({ entryId, me, role, onComment }: { entryId: string; me?: FamilyMember | Relative; role: SpaceRole; onComment: Props['onComment'] }) {
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
          aria-label="Escrever um comentário"
          autoFocus
          placeholder="Escreva com carinho… (@ para marcar)"
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
