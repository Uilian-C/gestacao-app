import { describe, expect, it } from 'vitest';
import type { FamilyMember, Relative } from '../api';
import { speakerOf } from './people';
import { coupleNames, slotsText } from './relatives';

const ana: FamilyMember = { userId: 'a', name: 'Ana Souza', email: '', role: 'mae', me: true };
const caio: FamilyMember = { userId: 'c', name: 'Caio', email: '', role: 'pai', me: false };
const rosa: Relative = { userId: 'r', name: 'Rosa Maria', email: '', role: 'familia', me: false, relation: 'Avó', joinedAt: '2026-10-01' };

describe('vagas e nomes', () => {
  it('conta as vagas de familiares', () => {
    expect(slotsText(0, 5)).toBe('5 vagas para familiares');
    expect(slotsText(2, 5)).toBe('2 de 5 vagas usadas');
    expect(slotsText(0, 0)).toBe('Sem vagas para familiares');
  });
  it('junta os primeiros nomes do casal', () => {
    expect(coupleNames(['Ana Souza', 'Caio Lima'])).toBe('Ana e Caio');
    expect(coupleNames(['Ana'])).toBe('Ana');
  });
});

describe('speakerOf', () => {
  it('acha o familiar pela conta, com o parentesco', () => {
    expect(speakerOf([ana, caio], [rosa], { mine: false, author_role: 'familia', author_id: 'r' })).toMatchObject({ name: 'Rosa', label: 'avó', role: 'familia' });
  });
  it('familiar que saiu vira "Família"', () => {
    expect(speakerOf([ana, caio], [], { mine: false, author_role: 'familia', author_id: 'x' })).toMatchObject({ name: 'Família', label: 'família' });
  });
  it('o casal continua pelo papel', () => {
    expect(speakerOf([ana, caio], [rosa], { mine: false, author_role: 'pai' })).toMatchObject({ name: 'Caio', label: 'pai' });
  });
});
