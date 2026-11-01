import { describe, expect, it } from 'vitest';
import { DEFAULT_INCLUDE, estimatePages, pagesFor, priceFor, type BookStuff } from './bookProduct';

const stuff: BookStuff = {
  weeks: [5, 8, 12, 16, 20, 22, 24, 28, 30].map((week, i) => ({ week, photo: i % 2 === 0 })),
  letters: 3,
  bellyPhotos: 4,
  firstTimes: 5,
  bolao: true,
  names: true,
  familyNotes: 7,
  moodMonths: 6,
};

describe('o livro impresso', () => {
  it('conta as páginas: abertura, semanas, fotos e as páginas especiais, em cadernos de 4', () => {
    // 4 + 9 semanas + 5 com foto + 3 cartas + 2 barriga + 5 primeiras + 1 bolão + 1 nome + 2 recados + 6 humor = 38 → 40
    expect(estimatePages(stuff, 'tudo', DEFAULT_INCLUDE)).toBe(40);
  });
  it('sem os extras, fica só a história semana a semana', () => {
    const none = { cartas: false, barriga: false, primeiras: false, bolao: false, nomes: false, recados: false, humor: false };
    expect(estimatePages(stuff, 'tudo', none)).toBe(20); // 4 + 9 + 5 = 18 → 20
  });
  it('um trimestre só tem as semanas dele', () => {
    expect(estimatePages(stuff, 'trimestre3', { ...DEFAULT_INCLUDE, cartas: false, humor: false, recados: false, bolao: false, nomes: false, barriga: false })).toBe(8); // 4 + 2 + 1 → 8
  });
  it('cada modelo tem um mínimo e um máximo de páginas', () => {
    expect(pagesFor('livreto', 90)).toBe(48);
    expect(pagesFor('classico', 8)).toBe(24);
  });
  it('o preço: base até 60 páginas e um valor por página a mais (o livreto tem preço fixo)', () => {
    expect(priceFor('livreto', 90)).toBe(11900);
    expect(priceFor('classico', 40)).toBe(22900);
    expect(priceFor('classico', 80)).toBe(22900 + 20 * 150);
    expect(priceFor('caixa', 200)).toBe(34900 + 60 * 150);
  });
});
