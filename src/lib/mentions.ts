import type { FamilyMember } from '../api';
import { firstName } from './people';

// Marcações com @ (o servidor faz a mesma leitura em api/_lib/mentions.ts):
// "@Caio" marca quem tem esse primeiro nome no espaço, sem ligar para acento.

export const plainName = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export const MENTION = /(@[\p{L}][\p{L}\p{M}'-]*)/u;

/** Primeiros nomes marcados no texto (sem acento, minúsculas). */
export function mentionedNames(text: string): Set<string> {
  return new Set([...text.matchAll(/@([\p{L}][\p{L}\p{M}'-]*)/gu)].map(m => plainName(m[1])));
}

/** A pessoa do espaço que esse "@Nome" marca, se houver. */
export function memberNamed(members: FamilyMember[], token: string): FamilyMember | undefined {
  const name = plainName(token.replace(/^@/, ''));
  return members.find(m => plainName(firstName(m.name)) === name);
}

/** O texto marca quem está logado? */
export function mentionsMe(members: FamilyMember[], text: string) {
  const me = members.find(m => m.me);
  return !!me && mentionedNames(text).has(plainName(firstName(me.name)));
}

/** Se o texto até o cursor termina em "@Ca", devolve o pedaço digitado ("Ca"). */
export function typingMention(textBeforeCaret: string): string | null {
  const m = /(^|\s)@([\p{L}\p{M}]*)$/u.exec(textBeforeCaret);
  return m ? m[2] : null;
}
