import { Fragment, useContext } from 'react';
import { AtSign } from 'lucide-react';
import type { FamilyMember } from '../api';
import { MENTION, memberNamed } from '../lib/mentions';
import { PeopleContext, firstName } from '../lib/people';
import Avatar from './Avatar';

// Marcar a outra pessoa com @: as sugestões abaixo do campo e o texto com a
// marcação em destaque.

/**
 * Sugestões de marcação. Ao digitar "@", mostra quem combina; com `always`,
 * mostra também um atalho "Marcar Caio" para quem ainda não foi marcado.
 */
export function MentionBar({ suggestions, unmarked, onPick, always = false }: { suggestions: FamilyMember[]; unmarked: FamilyMember[]; onPick: (m: FamilyMember) => void; always?: boolean }) {
  const list = suggestions.length ? suggestions : always ? unmarked : [];
  if (list.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Marcar">
      {list.map(m => (
        <button
          key={m.userId}
          type="button"
          // Não tira o foco do campo (o teclado do celular não fecha).
          onMouseDown={e => e.preventDefault()}
          onClick={() => onPick(m)}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft text-brand-strong pl-1 pr-3 py-1 text-[13px] font-bold"
        >
          <Avatar member={m} role={m.role} className="w-6 h-6 text-[10px]" />
          {suggestions.length ? firstName(m.name) : (
            <>
              <AtSign className="w-3.5 h-3.5 -mr-1" aria-hidden /> Marcar {firstName(m.name)}
            </>
          )}
        </button>
      ))}
    </div>
  );
}

/** Texto com as marcações de quem é do espaço em destaque. */
export function MentionText({ text }: { text: string }) {
  const members = useContext(PeopleContext);
  return (
    <>
      {text.split(MENTION).map((part, i) => {
        const who = i % 2 === 1 ? memberNamed(members, part) : undefined;
        return who ? (
          <strong key={i} className={`font-extrabold ${who.role === 'pai' ? 'text-pai' : 'text-mae'}`}>
            {part}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        );
      })}
    </>
  );
}
