import { useState } from 'react';
import { BicepsFlexed, HandHeart, Heart, MessageCircle, PartyPopper, Send, Trash2 } from 'lucide-react';
import type { Reaction, ReactionKind, SocialTarget, ThreadComment } from '../hooks/useGestationData';
import AuthorBadge from './AuthorBadge';
import { inputClass } from './styles';

// Curtir e comentar entre o casal: reações (abraço, força, estou aqui, festa) e
// uma conversa curta nos momentos e exames.

const REACTIONS: Record<ReactionKind, { label: string; Icon: typeof Heart }> = {
  abraco: { label: 'Abraço', Icon: Heart },
  forca: { label: 'Força', Icon: BicepsFlexed },
  aqui: { label: 'Estou aqui', Icon: HandHeart },
  festa: { label: 'Festa', Icon: PartyPopper },
};

export type OnReact = (targetType: SocialTarget, targetId: string, kind: ReactionKind, on: boolean) => void;

/** Botões de reação de um registro, com quantas pessoas reagiram e quem. */
export function ReactionBar({ targetType, targetId, reactions, kinds = ['abraco', 'forca', 'aqui'], onReact }: { targetType: SocialTarget; targetId: string; reactions: Reaction[]; kinds?: ReactionKind[]; onReact: OnReact }) {
  const mine = reactions.filter(r => r.target_type === targetType && r.target_id === targetId);
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Reações">
      {kinds.map(kind => {
        const all = mine.filter(r => r.kind === kind);
        const on = all.some(r => r.mine);
        const { label, Icon } = REACTIONS[kind];
        const others = all.filter(r => !r.mine).map(r => (r.author_role === 'mae' ? 'mãe' : 'pai'));
        return (
          <button
            key={kind}
            type="button"
            onClick={() => onReact(targetType, targetId, kind, !on)}
            aria-pressed={on}
            title={others.length ? `Também: ${others.join(', ')}` : undefined}
            className={`inline-flex items-center gap-1.5 min-h-10 rounded-full px-3.5 text-sm font-bold transition active:scale-95 ${on ? 'bg-rosa text-white shadow-soft' : 'bg-rosa-soft text-rosa-strong hover:brightness-[0.97]'}`}
          >
            <Icon className={`w-4 h-4 ${on && kind === 'abraco' ? 'fill-white' : ''}`} />
            {label}
            {all.length > 0 && <span className={`tabular ${on ? 'text-white/90' : ''}`}>· {all.length}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Contagem discreta para as listas: reações e comentários. */
export function SocialCount({ reactions, comments }: { reactions: number; comments: number }) {
  if (!reactions && !comments) return null;
  return (
    <span className="inline-flex items-center gap-2 text-xs font-bold text-rosa-strong">
      {reactions > 0 && (
        <span className="inline-flex items-center gap-1">
          <Heart className="w-3.5 h-3.5 fill-rosa text-rosa" /> {reactions}
        </span>
      )}
      {comments > 0 && (
        <span className="inline-flex items-center gap-1 text-ink-soft">
          <MessageCircle className="w-3.5 h-3.5" /> {comments}
        </span>
      )}
    </span>
  );
}

/** Conversa do casal num momento ou exame. */
export function Thread({ comments, busy, onSend, onDelete }: { comments: ThreadComment[]; busy: boolean; onSend: (body: string) => Promise<boolean>; onDelete: (c: ThreadComment) => void }) {
  const [draft, setDraft] = useState('');
  return (
    <section className="space-y-2" aria-label="Conversa">
      <h3 className="text-sm font-extrabold text-ink-soft flex items-center gap-1.5 font-sans">
        <MessageCircle className="w-4 h-4 text-brand" /> Conversa
      </h3>
      {comments.map(c => (
        <div key={c.id} className={`flex items-start gap-2 rounded-2xl px-3 py-2 text-[15px] ${c.author_role === 'pai' ? 'bg-pai-soft' : 'bg-mae-soft'}`}>
          <span className="flex-1 min-w-0 text-ink break-words">
            {c.body} <AuthorBadge role={c.author_role} />
          </span>
          {c.mine && (
            <button type="button" onClick={() => onDelete(c)} aria-label="Apagar comentário" className="p-1 text-ink-mute hover:text-alert">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
      <form
        onSubmit={async e => {
          e.preventDefault();
          if (draft.trim() && (await onSend(draft.trim()))) setDraft('');
        }}
        className="flex gap-2"
      >
        <input aria-label="Escrever um comentário" className={`${inputClass} !py-2 text-sm`} placeholder="Escrever para a outra pessoa..." value={draft} onChange={e => setDraft(e.target.value)} maxLength={1000} />
        <button type="submit" disabled={busy || !draft.trim()} aria-label="Enviar comentário" className="w-10 h-10 shrink-0 rounded-full bg-brand text-on-accent flex items-center justify-center disabled:opacity-40">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </section>
  );
}
