// Familiares no espaço (migração 023): o parentesco que aparece no Mural e as
// vagas de cada espaço.

/** Sugestões de parentesco; a pessoa também pode escrever outro. */
export const RELATIONS = ['Avó', 'Avô', 'Tia', 'Tio', 'Madrinha', 'Padrinho', 'Irmã', 'Irmão', 'Prima', 'Primo', 'Amiga', 'Amigo'] as const;

export const MAX_RELATION = 30;

/** "2 de 5 vagas usadas", "Nenhuma vaga usada". */
export function slotsText(used: number, slots: number) {
  if (slots === 0) return 'Sem vagas para familiares';
  if (used === 0) return `${slots} vagas para familiares`;
  return `${used} de ${slots} ${slots === 1 ? 'vaga usada' : 'vagas usadas'}`;
}

/** "Ana e Caio", "Ana" — quem é o casal, para o familiar. */
export function coupleNames(names: string[]) {
  const first = names.map(n => n.trim().split(/\s+/)[0]).filter(Boolean);
  return first.length > 1 ? `${first.slice(0, -1).join(', ')} e ${first[first.length - 1]}` : (first[0] ?? '');
}
