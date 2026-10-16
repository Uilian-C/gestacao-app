import { describe, expect, it } from 'vitest';
import { photonLabel } from './places.js';

describe('rótulo de endereço (OpenStreetMap)', () => {
  it('monta nome, rua, número, bairro, cidade e UF', () => {
    expect(
      photonLabel({ name: 'Hospital Santa Joana', street: 'Rua do Paraíso', housenumber: '432', district: 'Paraíso', city: 'São Paulo', state: 'São Paulo' }),
    ).toBe('Hospital Santa Joana, Rua do Paraíso, 432 - Paraíso, São Paulo - São Paulo');
  });

  it('não repete o nome quando ele é a própria rua e pula o que falta', () => {
    expect(photonLabel({ name: 'Avenida Paulista', street: 'Avenida Paulista', housenumber: '1000', city: 'São Paulo', state: 'SP' })).toBe('Avenida Paulista, 1000, São Paulo - SP');
    expect(photonLabel({ name: 'Maternidade X', city: 'Recife' })).toBe('Maternidade X, Recife');
  });
});
