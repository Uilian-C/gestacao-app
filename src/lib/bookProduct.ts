import type { Checkin, JournalEntry, ThreadComment } from '../hooks/useGestationData';
import type { Chapter } from './chapters';
import type { Espera } from './espera';
import { weekOn } from './folders';

// O livro impresso (onda 4): os modelos, o preço de lançamento e a conta das
// páginas a partir do que o casal já guardou. É uma pré-venda: nada é cobrado
// agora; a reserva mede qual formato e qual preço as famílias querem.
//
// Os preços são de teste: ajuste aqui e em api/_lib/bookOrder.ts (o servidor
// recalcula o preço da reserva com a mesma tabela).

export type BookModel = 'livreto' | 'classico' | 'caixa';
export type BookPeriod = 'tudo' | 'trimestre1' | 'trimestre2' | 'trimestre3';
export type BookInclude = { cartas: boolean; barriga: boolean; primeiras: boolean; bolao: boolean; nomes: boolean; recados: boolean; humor: boolean };

export const BOOK_MODELS: Record<BookModel, { name: string; size: string; cover: string; pages: [number, number]; base: number; extra: number; perks: string[] }> = {
  livreto: { name: 'Livreto', size: 'A5 · 15×21 cm', cover: 'Capa flexível', pages: [24, 48], base: 11900, extra: 0, perks: ['Os melhores momentos, até 48 páginas', 'Bom para presentear a família'] },
  classico: { name: 'Clássico', size: '21×21 cm', cover: 'Capa dura', pages: [24, 120], base: 22900, extra: 150, perks: ['A gestação inteira, semana a semana', 'Capa com o nome, o tom e a foto'] },
  caixa: { name: 'Caixa memória', size: '21×21 cm + caixa', cover: 'Capa dura em caixa', pages: [24, 120], base: 34900, extra: 150, perks: ['O Clássico, numa caixa', 'As cartas impressas em envelopes', 'O ultrassom em papel fotográfico'] },
};

/** Até quantas páginas o preço base cobre (depois, um valor por página a mais). */
export const BASE_PAGES = 60;

export const PERIODS: Record<BookPeriod, { label: string; weeks: [number, number] }> = {
  tudo: { label: 'A gestação inteira', weeks: [4, 42] },
  trimestre1: { label: '1º trimestre', weeks: [4, 13] },
  trimestre2: { label: '2º trimestre', weeks: [14, 27] },
  trimestre3: { label: '3º trimestre', weeks: [28, 42] },
};

export const DEFAULT_INCLUDE: BookInclude = { cartas: true, barriga: true, primeiras: true, bolao: true, nomes: true, recados: true, humor: true };

export const INCLUDE_LABEL: Record<keyof BookInclude, string> = {
  cartas: 'As cartas para o bebê',
  barriga: 'A barriga crescendo, foto a foto',
  primeiras: 'As primeiras vezes',
  bolao: 'O bolão e quem acertou',
  nomes: 'A escolha do nome',
  recados: 'Os recados da família',
  humor: 'O humor de vocês, mês a mês',
};

/** O que o livro tem até agora, contado a partir do diário e da espera. */
export interface BookStuff {
  /** Semanas com lembranças e se cada uma tem foto. */
  weeks: Array<{ week: number; photo: boolean }>;
  letters: number;
  bellyPhotos: number;
  firstTimes: number;
  bolao: boolean;
  names: boolean;
  familyNotes: number;
  moodMonths: number;
}

/** Quantas páginas o livro teria: capa e abertura, uma por semana (mais uma com foto) e as páginas especiais. */
export function estimatePages(stuff: BookStuff, period: BookPeriod, include: BookInclude): number {
  const [from, to] = PERIODS[period].weeks;
  const inRange = stuff.weeks.filter(w => w.week >= from && w.week <= to);
  const all = period === 'tudo';
  let pages = 4; // capa, folha de rosto, dedicatória e sumário
  pages += inRange.length + inRange.filter(w => w.photo).length;
  if (include.cartas) pages += all ? stuff.letters : Math.ceil(stuff.letters / 3);
  if (include.barriga && stuff.bellyPhotos >= 2) pages += 2;
  if (include.primeiras) pages += all ? stuff.firstTimes : 0;
  if (include.bolao && stuff.bolao) pages += 1;
  if (include.nomes && stuff.names) pages += 1;
  if (include.recados && stuff.familyNotes) pages += Math.ceil(stuff.familyNotes / 6);
  if (include.humor) pages += all ? stuff.moodMonths : Math.min(stuff.moodMonths, 3);
  // Os livros são impressos em cadernos de 4 páginas.
  return Math.ceil(pages / 4) * 4;
}

/** As páginas que vão para a gráfica: dentro do mínimo e do máximo do modelo. */
export const pagesFor = (model: BookModel, pages: number) => Math.min(BOOK_MODELS[model].pages[1], Math.max(BOOK_MODELS[model].pages[0], pages));

/** O preço de lançamento, em centavos. */
export function priceFor(model: BookModel, pages: number): number {
  const m = BOOK_MODELS[model];
  return m.base + Math.max(0, pagesFor(model, pages) - BASE_PAGES) * m.extra;
}

export const brl = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: cents % 100 ? 2 : 0 });

/** O que o livro tem até agora, a partir do diário, da espera, dos nomes e do humor. */
export function bookStuff(o: { book: Chapter[]; journal: JournalEntry[]; dumDate: string; espera: Espera | null | undefined; finalists: number; babyName: string | null; threads: ThreadComment[]; checkins: Checkin[] }): BookStuff {
  const shared = o.journal.filter(e => e.visibility !== 'private');
  const withPhoto = new Set(shared.filter(e => e.photos.length > 0).map(e => weekOn(o.dumDate, e.entry_date)));
  const months = new Set(o.checkins.map(c => c.day.slice(0, 7)));
  const votes = (o.espera?.guesses.length ?? 0) + (o.espera?.publicVotes?.length ?? 0);
  return {
    weeks: o.book.filter(c => !c.quiet).map(c => ({ week: c.week, photo: withPhoto.has(c.week) })),
    letters: shared.filter(e => e.folder === 'carta').length,
    bellyPhotos: shared.filter(e => e.folder === 'barriga' && e.photos.length > 0).length,
    firstTimes: new Set(shared.filter(e => e.first_time).map(e => e.first_time)).size,
    bolao: votes > 0,
    names: !!o.babyName || o.finalists > 0,
    familyNotes: o.threads.filter(t => t.author_role === 'familia').length,
    moodMonths: months.size,
  };
}

/** As fotos que podem ir na capa: a barriga primeiro, depois as outras (só fotos, sem vídeo). */
export function coverPhotos(journal: JournalEntry[]): Array<{ id: string; thumb: boolean }> {
  const shared = journal.filter(e => e.visibility !== 'private');
  const pick = (es: JournalEntry[]) => es.flatMap(e => e.photos.filter(p => !p.video).map(p => ({ id: p.id, thumb: p.thumb })));
  return [...pick(shared.filter(e => e.folder === 'barriga')), ...pick(shared.filter(e => e.folder !== 'barriga'))].slice(0, 12);
}
