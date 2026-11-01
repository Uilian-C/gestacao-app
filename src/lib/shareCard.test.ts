import { describe, expect, it } from 'vitest';
import { countdownCard, letterCard, nameCard, weekCard, wrapLines } from './shareCard';

const measure = (s: string) => s.length * 10;

describe('cartões para compartilhar', () => {
  it('a semana leva o tamanho, a fase e quanto falta', () => {
    const c = weekCard({ week: 24, days: 3, fruit: 'um mamão', stage: 'Ouvindo vocês', daysToDpp: 109, babyName: 'Helena' });
    expect(c.kicker).toBe('24 semanas e 3 dias');
    expect(c.title).toBe('Do tamanho de um mamão');
    expect(c.sub).toBe('Ouvindo vocês · faltam 109 dias');
    expect(c.name).toBe('Helena');
  });

  it('a contagem leva o número e o marco', () => {
    const c = countdownCard({ days: 1, what: 'o chá da Helena', why: 'a família toda junta', babyName: null });
    expect(c.big).toBe('1');
    expect(c.bigUnit).toBe('dia');
    expect(c.title).toBe('para o chá da Helena');
  });

  it('o nome escolhido ocupa o cartão', () => {
    const c = nameCard({ name: 'Helena', date: '12 de outubro', week: 19 });
    expect(c.kicker).toBe('Escolhemos o nome');
    expect(c.name).toBe('Helena');
    expect(c.sub).toBe('Escolhido em 12 de outubro · semana 19');
  });

  it('a carta longa é cortada numa palavra inteira', () => {
    const c = letterCard({ body: 'palavra '.repeat(60), role: 'mae', babyName: null, week: 20 });
    expect(c.quote!.length).toBeLessThanOrEqual(260);
    expect(c.quote!.endsWith('palavra…')).toBe(true);
  });

  it('quebra o texto em linhas e corta com reticências', () => {
    expect(wrapLines(measure, 'um dois tres', 70)).toEqual(['um dois', 'tres']);
    const cut = wrapLines(measure, 'aaaa bbbb cccc dddd eeee', 40, 2);
    expect(cut).toHaveLength(2);
    expect(cut[1].endsWith('…')).toBe(true);
    expect(measure(cut[1])).toBeLessThanOrEqual(40);
  });
});
