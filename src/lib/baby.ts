import { createContext } from 'react';

// O nome do bebê (migração 025). Quando o casal escolhe, ele aparece na capa do
// livro, na jornada do bebê e no Início; até lá, o app fala "o bebê".

export const BabyNameContext = createContext<string | null>(null);

/** "Helena" ou "o bebê" ("O bebê" no começo da frase). */
export const babyCall = (name: string | null | undefined, start = false) => (name?.trim() ? name.trim() : start ? 'O bebê' : 'o bebê');
