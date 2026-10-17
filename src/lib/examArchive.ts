import { PLAN_ITEMS } from '../content/prenatalPlan';
import type { ExamItem } from '../hooks/useGestationData';
import { parseLocalDate } from './dates';

// Arquivo dos resultados: com o tempo são dezenas de exames, então a lista é
// organizada por trimestre (o que aconteceu quando) e por exame (a evolução de
// um mesmo exame, como o hemograma do 1º e do 3º trimestre), com busca.

export type Trimester = 0 | 1 | 2 | 3;

export const TRIMESTER_LABEL: Record<Trimester, string> = { 3: '3º trimestre', 2: '2º trimestre', 1: '1º trimestre', 0: 'Antes da gestação' };

/** Semana da gestação numa data (negativa antes da DUM). */
export function weekAt(dumDate: string, iso: string) {
  return Math.floor((parseLocalDate(iso).getTime() - parseLocalDate(dumDate).getTime()) / (7 * 86_400_000));
}

export function trimesterOf(dumDate: string, iso: string): Trimester {
  const w = weekAt(dumDate, iso);
  if (w < 1) return 0;
  if (w < 14) return 1;
  if (w < 28) return 2;
  return 3;
}

const byDateDesc = (a: ExamItem, b: ExamItem) => b.exam_date.localeCompare(a.exam_date) || b.created_at.localeCompare(a.created_at);

/** Trimestres com exames, do mais recente ao mais antigo; dentro de cada um, por mês. */
export function byTrimester(exams: ExamItem[], dumDate: string) {
  const groups = new Map<Trimester, ExamItem[]>();
  for (const e of exams) {
    const t = trimesterOf(dumDate, e.exam_date);
    groups.set(t, [...(groups.get(t) ?? []), e]);
  }
  return ([3, 2, 1, 0] as Trimester[])
    .filter(t => groups.has(t))
    .map(t => {
      const items = groups.get(t)!.sort(byDateDesc);
      const months = new Map<string, ExamItem[]>();
      for (const e of items) months.set(e.exam_date.slice(0, 7), [...(months.get(e.exam_date.slice(0, 7)) ?? []), e]);
      return {
        trimester: t,
        label: TRIMESTER_LABEL[t],
        items,
        months: [...months.entries()].map(([key, list]) => {
          const [y, m] = key.split('-').map(Number);
          return { key, label: new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }), items: list };
        }),
      };
    });
}

/** Texto sem acentos e sem diferença de maiúsculas, para comparar e buscar. */
export const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Mesmo exame ao longo do tempo: o item da jornada, quando houver (os dois
 * morfológicos ficam separados), senão o nome. Séries com mais exames primeiro.
 */
export function bySeries(exams: ExamItem[]) {
  const groups = new Map<string, ExamItem[]>();
  for (const e of exams) {
    const key = e.plan_item ? `jornada:${e.plan_item}` : `nome:${normalize(e.title)}`;
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  return [...groups.entries()]
    .map(([key, list]) => {
      const items = list.sort(byDateDesc);
      const plan = items[0].plan_item ? PLAN_ITEMS.find(i => i.id === items[0].plan_item) : null;
      // Nome da série: o da jornada, ou o primeiro escrito com maiúscula ("Hemograma", não "hemograma").
      const named = items.find(i => /^\p{Lu}/u.test(i.title))?.title ?? items[0].title.charAt(0).toUpperCase() + items[0].title.slice(1);
      return { key, label: plan?.title ?? named, kind: items[0].kind, items, last: items[0].exam_date, first: items[items.length - 1].exam_date };
    })
    .sort((a, b) => b.items.length - a.items.length || b.last.localeCompare(a.last));
}

/** Busca no nome, nas observações e no item da jornada. */
export function searchExams(exams: ExamItem[], query: string) {
  const q = normalize(query);
  if (!q) return exams;
  const words = q.split(' ');
  return exams
    .filter(e => {
      const plan = e.plan_item ? PLAN_ITEMS.find(i => i.id === e.plan_item) : null;
      const text = normalize([e.title, e.notes ?? '', plan?.title ?? '', plan?.short ?? ''].join(' '));
      return words.every(w => text.includes(w));
    })
    .sort(byDateDesc);
}
