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

/** A migração 016 já rodou: dá para dizer quem vai a cada agendamento. */
export const AttendeesReady = createContext(false);

/** A migração 017 já rodou: dá para pôr lembrete nas tarefas. */
export const TaskRemindersReady = createContext(false);

/** A migração 018 já rodou: lembretes com hora e aviso a mais nos agendamentos. */
export const TimedRemindersReady = createContext(false);

/** A pessoa do espaço com esse papel (o pai, a mãe). */
export const memberWithRole = (members: FamilyMember[], role: Author) => members.find(m => m.role === role);

/** "Ana", "Caio" ou "Ana e Caio" para mãe, pai ou os dois. */
export function whoName(members: FamilyMember[], who: Author | 'casal'): string {
  const name = (role: Author) => {
    const m = memberWithRole(members, role);
    return m ? firstName(m.name) : role === 'mae' ? 'Mãe' : 'Pai';
  };
  return who === 'casal' ? `${name('mae')} e ${name('pai')}` : name(who);
}
