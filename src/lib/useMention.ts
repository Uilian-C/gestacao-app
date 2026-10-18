import { useRef, useState } from 'react';
import type { FamilyMember } from '../api';
import { mentionedNames, plainName, typingMention } from './mentions';
import { firstName } from './people';

/**
 * Liga um campo de texto às marcações: sugere a pessoa ao digitar "@" e
 * insere "@Nome " onde está o cursor (ou no fim, pelo botão "Marcar").
 */
export function useMention<T extends HTMLInputElement | HTMLTextAreaElement>(value: string, setValue: (v: string) => void, members: FamilyMember[]) {
  const ref = useRef<T>(null);
  const [caret, setCaret] = useState<number | null>(null);
  const partners = members.filter(m => !m.me);
  const typed = caret === null ? null : typingMention(value.slice(0, caret));
  const suggestions = typed === null ? [] : partners.filter(p => plainName(firstName(p.name)).startsWith(plainName(typed)));
  const marked = mentionedNames(value);
  const unmarked = partners.filter(p => !marked.has(plainName(firstName(p.name))));

  const track = (e: { currentTarget: T }) => setCaret(e.currentTarget.selectionStart);

  const insert = (p: FamilyMember) => {
    const tag = `@${firstName(p.name)} `;
    let next: string;
    let pos: number;
    if (typed !== null && caret !== null) {
      const start = caret - typed.length - 1;
      next = value.slice(0, start) + tag + value.slice(caret);
      pos = start + tag.length;
    } else {
      const sep = value && !/\s$/.test(value) ? ' ' : '';
      next = value + sep + tag;
      pos = next.length;
    }
    setValue(next);
    setCaret(pos);
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(pos, pos);
    });
  };

  return { ref, track, suggestions, unmarked, insert };
}
