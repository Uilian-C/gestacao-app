import { createContext } from 'react';
import type { FamilyMember, Relative } from '../api';
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

/** Os familiares do espaço (migração 023), para mostrar quem comentou ou reagiu. */
export const RelativesContext = createContext<Relative[]>([]);

export interface Speaker {
  person?: FamilyMember | Relative;
  /** Primeiro nome (ou "Mãe", "Pai", "Família" sem a pessoa). */
  name: string;
  /** "mãe", "pai" ou o parentesco ("avó"). */
  label: string;
  role: Author | 'familia';
}

/** Quem comentou ou reagiu: o casal pelo papel; um familiar pela conta. */
export function speakerOf(members: FamilyMember[], relatives: Relative[], s: { mine: boolean; author_role: Author | 'familia'; author_id?: string | null }): Speaker {
  if (s.author_role === 'familia') {
    const r = relatives.find(x => (s.author_id ? x.userId === s.author_id : s.mine && x.me));
    return { person: r, name: r ? firstName(r.name) : 'Família', label: (r?.relation ?? 'família').toLowerCase(), role: 'familia' };
  }
  const m = authorOf(members, s.mine, s.author_role);
  return { person: m, name: m ? firstName(m.name) : s.author_role === 'mae' ? 'Mãe' : 'Pai', label: s.author_role === 'mae' ? 'mãe' : 'pai', role: s.author_role };
}

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
