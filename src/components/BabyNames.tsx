import { useContext, useEffect, useState } from 'react';
import { ArrowLeft, Heart, Loader2, MessageCircle, Pencil, Plus, Send, Sparkles, X } from 'lucide-react';
import type { FamilyMember, Relative } from '../api';
import type { BabyTone } from '../content/babyTones';
import type { NameIdea } from '../hooks/useGestationData';
import { BabyNameContext, rankIdeas } from '../lib/baby';
import { parseTimestamp } from '../lib/dates';
import { PeopleContext, RelativesContext, firstName } from '../lib/people';
import Avatar from './Avatar';
import BabyArt from './BabyArt';
import BrandMark from './BrandMark';

// O caderno do nome: um lugar só dele, fora do diário, porque escolher o nome
// é uma etapa (com começo, meio e fim) e não um registro do dia a dia. Enquanto
// o casal pensa, cada um (e a família) anota ideias, o porquê de cada uma,
// curte e conversa. Quando o casal escolhe, o nome é revelado com a batida do
// Tumtum, vira página do livro e o caderno passa a ser "a história do nome".
// Quem já chega com o nome decidido registra direto e vai para a revelação.

export interface NameActions {
  onAdd: (name: string, note?: string) => Promise<boolean>;
  onLike: (id: string, on: boolean) => Promise<boolean> | void;
  onDelete: (id: string) => Promise<boolean> | void;
  onNote: (id: string, note: string | null) => Promise<boolean>;
  onComment: (id: string, body: string) => Promise<boolean>;
  onDeleteComment: (id: string) => Promise<boolean> | void;
  /** Só o casal escolhe. */
  onChoose?: (name: string) => Promise<boolean>;
  /** Depois de escolher: guardar o momento no Mural. */
  onShareChoice?: (name: string) => Promise<boolean>;
}

const cap = (name: string) => name.trim().charAt(0).toUpperCase() + name.trim().slice(1);

/** Quem é quem, pelo id (casal ou família). */
function usePerson() {
  const members = useContext(PeopleContext);
  const relatives = useContext(RelativesContext);
  return (id: string): FamilyMember | Relative | undefined => members.find(m => m.userId === id) ?? relatives.find(r => r.userId === id);
}

/** O caderno do nome, em tela cheia (como uma seção própria do app). */
export default function NameSpace({ ideas, tone, week, couple, chosenAt, actions, onClose, onReveal }: { ideas: NameIdea[]; tone: BabyTone; week: number; couple: boolean; chosenAt?: string | null; actions: NameActions; onClose: () => void; onReveal: (name: string) => void }) {
  const chosen = useContext(BabyNameContext);
  const [changing, setChanging] = useState(false);
  const [registering, setRegistering] = useState(false);
  const deciding = !chosen || changing;
  const ranked = rankIdeas(ideas);
  useEffect(() => {
    const close = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  const choose = async (name: string) => {
    if (!actions.onChoose) return false;
    const ok = await actions.onChoose(name);
    if (ok) {
      setChanging(false);
      setRegistering(false);
      onReveal(name);
    }
    return ok;
  };

  return (
    <div role="dialog" aria-label="O nome do bebê" className="fixed inset-0 z-50 overflow-y-auto bg-canvas">
      <header className="sticky top-0 z-10 flex items-center gap-2 bg-canvas/90 backdrop-blur px-3 pt-[calc(env(safe-area-inset-top,0px)+8px)] pb-2">
        <button type="button" onClick={onClose} aria-label="Voltar" className="w-10 h-10 rounded-full flex items-center justify-center text-ink-soft hover:bg-surface-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <p className="flex-1 font-display text-[1.15rem] text-ink">{chosen && !changing ? 'A história do nome' : 'O caderno do nome'}</p>
      </header>

      <div className="mx-auto max-w-[560px] px-4 pb-16 space-y-5">
        {deciding ? (
          <section className="rounded-[28px] bg-gradient-to-b from-rosa-soft via-lilas-soft to-surface px-5 pt-6 pb-5 text-center">
            <BabyArt week={Math.min(40, Math.max(4, week))} beat tone={tone} className="w-28 h-28 mx-auto" />
            <h2 className="font-display text-[1.7rem] leading-tight text-ink mt-1">Qual vai ser o nome?</h2>
            <p className="text-[14px] text-ink-soft mt-1 max-w-[400px] mx-auto">
              {couple ? 'Sem pressa: muitos casais só decidem perto do parto. Anotem as ideias, contem o porquê de cada uma, curtam e conversem. A família pode dar palpite.' : 'Sugira os nomes de que você gosta, conte o porquê e converse com o casal. Quem escolhe são eles.'}
            </p>
            <AddIdea onAdd={actions.onAdd} />
            {couple && actions.onChoose && (
              <div className="mt-3">
                {registering ? (
                  <RegisterName onChoose={choose} onCancel={() => setRegistering(false)} />
                ) : (
                  <button type="button" onClick={() => setRegistering(true)} className="text-[13.5px] font-bold text-rosa-strong">
                    Já decidiram? Registrar o nome escolhido ›
                  </button>
                )}
              </div>
            )}
          </section>
        ) : (
          <section className="rounded-[28px] bg-gradient-to-b from-rosa-soft via-lilas-soft to-surface px-5 pt-6 pb-5 text-center">
            <BrandMark animated className="w-16 h-16 mx-auto" />
            <p className="mt-2 text-[12px] font-extrabold uppercase tracking-[0.2em] text-rosa">O nome escolhido</p>
            <p className="font-display text-[2.6rem] leading-none text-ink mt-1">{chosen}</p>
            {chosenAt && <p className="text-[13.5px] text-ink-soft mt-2">Escolhido em {parseTimestamp(chosenAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => onReveal(chosen!)} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-4 py-2 text-[13.5px] font-bold text-rosa-strong shadow-soft">
                <Sparkles className="w-4 h-4" /> Rever a revelação
              </button>
              {couple && (
                <button type="button" onClick={() => setChanging(true)} className="rounded-full px-4 py-2 text-[13px] font-bold text-ink-soft">
                  Mudaram de ideia?
                </button>
              )}
            </div>
          </section>
        )}

        {ranked.length > 0 && (
          <section className="space-y-2.5">
            <h3 className="px-1 text-[12px] font-extrabold uppercase tracking-wide text-ink-mute">{deciding ? 'As ideias' : 'Os nomes que fizeram parte da escolha'}</h3>
            <ul className="space-y-2.5" aria-label="Ideias de nome">
              {ranked.map((idea, i) => (
                <li key={idea.id}>
                  <IdeaCard idea={idea} top={i === 0 && idea.likes.length > 1 && deciding} chosen={chosen?.toLowerCase() === idea.name.toLowerCase()} couple={couple} deciding={deciding} actions={actions} onChoose={choose} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

/** Anotar uma ideia: o nome e, se quiser, o porquê. */
function AddIdea({ onAdd }: { onAdd: NameActions['onAdd'] }) {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mt-4 space-y-2 text-left"
      onSubmit={async e => {
        e.preventDefault();
        if (!name.trim()) return;
        setBusy(true);
        const ok = await onAdd(cap(name), note.trim() || undefined);
        setBusy(false);
        if (ok) {
          setName('');
          setNote('');
        }
      }}
    >
      <div className="flex gap-2">
        <input aria-label="Sugerir um nome" placeholder="Anotar um nome" value={name} onChange={e => setName(e.target.value)} maxLength={40} className="flex-1 min-w-0 rounded-full bg-surface px-4 py-2.5 text-[15px] text-ink placeholder:text-ink-mute outline-none ring-1 ring-line focus:ring-2 focus:ring-rosa/50" />
        <button type="submit" disabled={busy || !name.trim()} className="shrink-0 inline-flex items-center gap-1 rounded-full bg-rosa text-white px-4 py-2.5 text-[14px] font-extrabold disabled:opacity-50">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Anotar
        </button>
      </div>
      {name.trim() && (
        <input aria-label="Por que esse nome?" placeholder="Por que esse nome? (significado, homenagem…) opcional" value={note} onChange={e => setNote(e.target.value)} maxLength={300} className="w-full rounded-full bg-surface px-4 py-2 text-[14px] text-ink placeholder:text-ink-mute outline-none ring-1 ring-line focus:ring-2 focus:ring-rosa/50" />
      )}
    </form>
  );
}

/** Para quem já chega com o nome decidido: registrar direto (e ir para a revelação). */
function RegisterName({ onChoose, onCancel }: { onChoose: (name: string) => Promise<boolean>; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form
      aria-label="Registrar o nome escolhido"
      className="flex items-center gap-2"
      onSubmit={async e => {
        e.preventDefault();
        if (!name.trim()) return;
        setBusy(true);
        await onChoose(cap(name));
        setBusy(false);
      }}
    >
      <input autoFocus aria-label="O nome escolhido" placeholder="O nome escolhido" value={name} onChange={e => setName(e.target.value)} maxLength={40} className="flex-1 min-w-0 rounded-full bg-surface px-4 py-2.5 text-[15px] text-ink placeholder:text-ink-mute outline-none ring-2 ring-rosa/40" />
      <button type="submit" disabled={busy || !name.trim()} className="shrink-0 rounded-full bg-rosa text-white px-4 py-2.5 text-[14px] font-extrabold disabled:opacity-50">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'É esse!'}
      </button>
      <button type="button" onClick={onCancel} aria-label="Cancelar" className="shrink-0 w-9 h-9 rounded-full text-ink-mute flex items-center justify-center">
        <X className="w-4 h-4" />
      </button>
    </form>
  );
}

/** Uma ideia: o nome, o porquê, quem curtiu, a conversa e (para o casal) escolher. */
function IdeaCard({ idea, top, chosen, couple, deciding, actions, onChoose }: { idea: NameIdea; top: boolean; chosen: boolean; couple: boolean; deciding: boolean; actions: NameActions; onChoose: (name: string) => Promise<boolean> }) {
  const person = usePerson();
  const liked = idea.likes.some(l => l.mine);
  const by = person(idea.author_id);
  const comments = idea.comments ?? [];
  const [talking, setTalking] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(idea.note ?? '');
  const [confirm, setConfirm] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const canEdit = couple || idea.mine;

  return (
    <article aria-label={`Nome: ${idea.name}`} className={`rounded-[22px] px-4 py-3 space-y-2 ${chosen ? 'bg-rosa-soft ring-2 ring-rosa/40' : 'bg-surface shadow-soft'}`}>
      <div className="flex items-center gap-3">
        <span className="flex-1 min-w-0">
          <span className="flex items-baseline gap-2">
            <span className="font-display text-[1.45rem] leading-tight text-ink truncate">{idea.name}</span>
            {top && <span className="shrink-0 text-[10.5px] font-extrabold uppercase text-rosa">favorito</span>}
            {chosen && <span className="shrink-0 text-[10.5px] font-extrabold uppercase text-rosa">o escolhido</span>}
          </span>
          <span className="flex items-center gap-1.5 text-[12px] text-ink-mute">
            anotado por {idea.mine ? 'você' : by ? firstName(by.name) : 'alguém da família'}
            <span className="flex -space-x-1.5">
              {idea.likes.slice(0, 5).map(l => (
                <Avatar key={l.user_id} member={person(l.user_id)} role={l.author_role} className="w-5 h-5 text-[8px] ring-2 ring-surface" />
              ))}
            </span>
          </span>
        </span>
        <button type="button" onClick={() => actions.onLike(idea.id, !liked)} aria-pressed={liked} aria-label={`${liked ? 'Descurtir' : 'Curtir'} ${idea.name}`} className={`shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-bold transition active:scale-95 ${liked ? 'bg-rosa text-white' : 'bg-surface-2 text-ink-soft'}`}>
          <Heart className={`w-4 h-4 ${liked ? 'fill-white' : ''}`} /> {idea.likes.length || ''}
        </button>
        {canEdit && deciding && (
          <button type="button" onClick={() => actions.onDelete(idea.id)} aria-label={`Tirar ${idea.name}`} className="shrink-0 w-8 h-8 rounded-full text-ink-mute hover:bg-surface-2 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* O porquê do nome. */}
      {editing ? (
        <form
          className="flex gap-2"
          onSubmit={async e => {
            e.preventDefault();
            if (await actions.onNote(idea.id, note.trim() || null)) setEditing(false);
          }}
        >
          <input autoFocus aria-label={`Por que ${idea.name}?`} value={note} onChange={e => setNote(e.target.value)} maxLength={300} placeholder="Significado, homenagem, como surgiu…" className="flex-1 min-w-0 rounded-full bg-surface-2 px-3.5 py-2 text-[14px] text-ink outline-none focus:ring-2 focus:ring-rosa/40" />
          <button type="submit" className="shrink-0 rounded-full bg-rosa text-white px-3.5 py-2 text-[13px] font-bold">
            Guardar
          </button>
        </form>
      ) : idea.note ? (
        <p className="text-[14px] italic text-ink-soft leading-snug">
          “{idea.note}”
          {canEdit && (
            <button type="button" onClick={() => setEditing(true)} aria-label="Editar o porquê" className="ml-1.5 inline-flex align-middle text-ink-mute">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </p>
      ) : (
        canEdit &&
        deciding && (
          <button type="button" onClick={() => setEditing(true)} className="text-[12.5px] font-bold text-ink-mute">
            + Por que esse nome?
          </button>
        )
      )}

      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setTalking(v => !v)} aria-expanded={talking} className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-ink-soft">
          <MessageCircle className="w-4 h-4" /> {comments.length ? `Conversa (${comments.length})` : 'Comentar'}
        </button>
        {couple && actions.onChoose && deciding && !confirm && (
          <button type="button" onClick={() => setConfirm(true)} className="ml-auto text-[12.5px] font-bold text-rosa-strong">
            Escolher este nome
          </button>
        )}
      </div>

      {confirm && (
        <div className="flex items-center gap-2 rounded-xl bg-rosa-soft px-3 py-2">
          <span className="flex-1 text-[13.5px] text-ink">É esse? {idea.name} vai para o livro e para o app todo.</span>
          <button
            type="button"
            disabled={choosing}
            onClick={async () => {
              setChoosing(true);
              const ok = await onChoose(idea.name);
              setChoosing(false);
              if (ok) setConfirm(false);
            }}
            className="shrink-0 inline-flex items-center gap-1 rounded-full bg-rosa text-white px-3.5 py-1.5 text-[13px] font-extrabold"
          >
            {choosing && <Loader2 className="w-4 h-4 animate-spin" />} É esse!
          </button>
          <button type="button" onClick={() => setConfirm(false)} className="shrink-0 text-[13px] font-bold text-ink-soft">
            Ainda não
          </button>
        </div>
      )}

      {talking && (
        <div className="space-y-2 border-t border-line pt-2">
          {comments.map(c => {
            const who = person(c.user_id);
            return (
              <div key={c.id} className="flex items-start gap-2">
                <Avatar member={who} role={c.author_role} className="w-6 h-6 text-[9px]" />
                <p className="flex-1 min-w-0 text-[14px] text-ink leading-snug">
                  <b className="font-bold">{c.mine ? 'Você' : who ? firstName(who.name) : 'Família'}</b> {c.body}
                </p>
                {c.mine && (
                  <button type="button" onClick={() => actions.onDeleteComment(c.id)} aria-label="Apagar comentário" className="shrink-0 text-ink-mute">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
          <form
            className="flex gap-2"
            onSubmit={async e => {
              e.preventDefault();
              if (!draft.trim()) return;
              setSending(true);
              const ok = await actions.onComment(idea.id, draft.trim());
              setSending(false);
              if (ok) setDraft('');
            }}
          >
            <input aria-label={`Comentar sobre ${idea.name}`} placeholder={`O que você acha de ${idea.name}?`} value={draft} onChange={e => setDraft(e.target.value)} maxLength={500} className="flex-1 min-w-0 rounded-full bg-surface-2 px-3.5 py-2 text-[14px] text-ink outline-none focus:ring-2 focus:ring-rosa/40" />
            <button type="submit" disabled={sending || !draft.trim()} aria-label="Enviar" className="shrink-0 w-9 h-9 rounded-full bg-rosa text-white flex items-center justify-center disabled:opacity-50">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      )}
    </article>
  );
}

/**
 * A revelação do nome: a tela se acende com a batida do Tumtum (tum-tum), e o
 * nome aparece no ritmo do coração. Depois, o convite para guardar o momento.
 */
export function NameReveal({ name, tone, week, onShare, onDone }: { name: string; tone: BabyTone; week: number; onShare?: (name: string) => Promise<boolean>; onDone: () => void }) {
  const [sharing, setSharing] = useState(false);
  return (
    <div role="dialog" aria-label="Nome escolhido" className="tt-revelacao fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-rosa-soft via-lilas-soft to-surface px-6 text-center">
      {Array.from({ length: 3 }, (_, i) => (
        <span key={i} className="tt-revelacao-eco absolute left-1/2 top-[38%] w-56 h-56 -ml-28 -mt-28 rounded-full border-2 border-rosa/40" style={{ animationDelay: `${i * 0.5}s` }} aria-hidden />
      ))}
      <div className="relative">
        <BrandMark animated className="tt-revelacao-coracao w-40 h-40" />
        <BabyArt week={Math.min(40, Math.max(4, week))} tone={tone} className="tt-revelacao-bebe absolute inset-0 m-auto w-24 h-24" />
      </div>
      <p className="tt-revelacao-texto mt-4 text-[12px] font-extrabold uppercase tracking-[0.25em] text-rosa">Escolhido com amor</p>
      <p className="tt-revelacao-nome font-display text-[3.4rem] leading-none text-ink mt-2">{name}</p>
      <p className="tt-revelacao-texto mt-3 text-[15px] text-ink-soft max-w-[340px]">Agora {name} está na capa do livro, ganhou uma página só dela e aparece em cada cantinho do app.</p>
      <div className="tt-revelacao-texto mt-6 flex flex-col gap-2 w-full max-w-[320px]">
        {onShare && (
          <button
            type="button"
            disabled={sharing}
            onClick={async () => {
              setSharing(true);
              const ok = await onShare(name);
              setSharing(false);
              if (ok) onDone();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-rosa text-white px-5 py-3 font-extrabold shadow-soft disabled:opacity-60"
          >
            {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Contar no Mural
          </button>
        )}
        <button type="button" onClick={onDone} className="rounded-full px-5 py-2.5 text-[14px] font-bold text-ink-soft">
          Continuar
        </button>
      </div>
    </div>
  );
}

/** No Início (e no app da família), enquanto o nome não foi escolhido: a pergunta, os favoritos e o convite. */
export function NameTeaser({ ideas, onOpen }: { ideas: NameIdea[]; onOpen: () => void }) {
  const top = rankIdeas(ideas).slice(0, 3);
  return (
    <button type="button" onClick={onOpen} aria-label="Escolhendo o nome do bebê: abrir" className="w-full text-left rounded-[26px] bg-gradient-to-br from-rosa-soft via-lilas-soft to-surface shadow-soft px-5 py-4 transition active:scale-[0.99]">
      <span className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-wide text-rosa">
        <Sparkles className="w-3.5 h-3.5" /> O caderno do nome
      </span>
      <span className="block font-display text-[1.35rem] leading-tight text-ink mt-0.5">Qual vai ser o nome?</span>
      {top.length > 0 ? (
        <span className="mt-2 flex flex-wrap gap-1.5">
          {top.map(i => (
            <span key={i.id} className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1 text-[14px] font-display text-ink shadow-soft">
              {i.name}
              {i.likes.length > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-sans font-bold text-rosa">
                  <Heart className="w-3 h-3 fill-rosa" /> {i.likes.length}
                </span>
              )}
            </span>
          ))}
          {ideas.length > 3 && <span className="self-center text-[12px] font-bold text-ink-mute">e mais ideias</span>}
        </span>
      ) : (
        <span className="block text-[13.5px] text-ink-soft mt-1">Anotem as ideias de nome, o porquê de cada uma, curtam as favoritas e peçam palpite à família.</span>
      )}
      <span className="mt-2 block text-[13px] font-bold text-rosa-strong">{top.length ? 'Abrir o caderno ›' : 'Anotar o primeiro nome ›'}</span>
    </button>
  );
}
