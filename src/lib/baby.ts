import { createContext } from 'react';
import type { NameIdea } from '../hooks/useGestationData';

// O nome do bebê (migração 025). Quando o casal escolhe, ele aparece na capa do
// livro, na jornada do bebê e no Início; até lá, o app fala "o bebê".

export const BabyNameContext = createContext<string | null>(null);

/** "Helena" ou "o bebê" ("O bebê" no começo da frase). */
export const babyCall = (name: string | null | undefined, start = false) => (name?.trim() ? name.trim() : start ? 'O bebê' : 'o bebê');

/** As ideias de nome da mais curtida para a menos (e, empatadas, a mais antiga primeiro). */
export const rankIdeas = (ideas: NameIdea[]) => [...ideas].sort((a, b) => b.likes.length - a.likes.length || a.created_at.localeCompare(b.created_at));
