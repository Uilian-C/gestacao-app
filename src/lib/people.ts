import { createContext } from 'react';
import type { FamilyMember } from '../api';
import type { Author } from '../types';

// Quem escreveu: os registros trazem só o papel (mãe/pai) e se foi quem está
// logado. Com isso dá para achar a pessoa do espaço (nome e foto de perfil).

export function authorOf(members: FamilyMember[], mine: boolean, role: Author): FamilyMember | undefined {
  if (mine) return members.find(m => m.me);
  const others = members.filter(m => !m.me);
  return others.find(m => m.role === role) ?? (others.length === 1 ? others[0] : undefined);
}

/** "Uilian Oliveira" → "Uilian". */
export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? '';

/** As pessoas do espaço, para quem mostra autoria (conversas, mural) sem passar de tela em tela. */
export const PeopleContext = createContext<FamilyMember[]>([]);
