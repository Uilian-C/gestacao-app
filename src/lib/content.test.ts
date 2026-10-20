import { describe, expect, it } from 'vitest';
import type { ContentItem } from '../api';
import { messageOfDay, readingsFor, textBlocks } from './content';

const item = (over: Partial<ContentItem>): ContentItem => ({ id: 'a', kind: 'mensagem', title: null, body: 'x', weekFrom: 4, weekTo: 42, audience: 'casal', source: null, minutes: null, status: 'publicado', updatedAt: '', ...over });

describe('conteúdo do app', () => {
  const items = [
    item({ id: '1', body: 'geral' }),
    item({ id: '2', body: 'segundo tri', weekFrom: 14, weekTo: 27 }),
    item({ id: '3', body: 'só pai', audience: 'pai' }),
    item({ id: '4', body: 'rascunho', status: 'rascunho' }),
    item({ id: '5', kind: 'leitura', title: 'Geral', minutes: 2 }),
    item({ id: '6', kind: 'leitura', title: 'Da fase', weekFrom: 18, weekTo: 42 }),
    item({ id: '7', kind: 'leitura', title: 'Fim', weekFrom: 28, weekTo: 36 }),
  ];
  it('mensagem do dia: só publicada, da semana e para quem está logado; muda de um dia para o outro', () => {
    const d1 = messageOfDay(items, 20, 'mae', new Date(2026, 9, 20))!;
    const d2 = messageOfDay(items, 20, 'mae', new Date(2026, 9, 21))!;
    expect(['geral', 'segundo tri']).toContain(d1.body);
    expect(d1.body).not.toBe(d2.body);
    expect(messageOfDay(items, 20, 'mae', new Date(2026, 9, 20, 22))!.body).toBe(d1.body);
    expect(messageOfDay(items, 5, 'mae', new Date(2026, 9, 20))!.body).toBe('geral');
    expect(messageOfDay([], 20, 'mae', new Date())).toBeNull();
  });
  it('leituras da semana: as da fase primeiro', () => {
    expect(readingsFor(items, 20, 'mae').map(i => i.title)).toEqual(['Da fase', 'Geral']);
    expect(readingsFor(items, 30, 'pai').map(i => i.title)).toEqual(['Fim', 'Da fase', 'Geral']);
  });
  it('texto em parágrafos e listas', () => {
    expect(textBlocks('Primeiro parágrafo.\n\nAntes da lista:\n- um\n- dois\n\nFim.')).toEqual([
      { kind: 'p', text: 'Primeiro parágrafo.' },
      { kind: 'p', text: 'Antes da lista:' },
      { kind: 'ul', items: ['um', 'dois'] },
      { kind: 'p', text: 'Fim.' },
    ]);
  });
});
