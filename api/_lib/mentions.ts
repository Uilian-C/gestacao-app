// Marcações com @ no diário e nas conversas: "@Caio, olha isso!". Quem foi
// marcado recebe um aviso próprio ("Ana marcou você"). Vale o primeiro nome de
// quem é do espaço, sem ligar para acento nem maiúscula.

const plain = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Os primeiros nomes marcados no texto (já sem acento, em minúsculas). */
export function mentionedNames(text: string): Set<string> {
  return new Set([...text.matchAll(/@([\p{L}][\p{L}\p{M}'-]*)/gu)].map(m => plain(m[1])));
}

/** Quem, entre as pessoas, foi marcado no texto (e não estava marcado antes). */
export function mentioned<T extends { first: string }>(people: T[], text: string, before = ''): T[] {
  const now = mentionedNames(text);
  const old = mentionedNames(before);
  return people.filter(p => p.first && now.has(plain(p.first)) && !old.has(plain(p.first)));
}
