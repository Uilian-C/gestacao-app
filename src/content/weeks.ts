import { FIRST_WEEK, LAST_WEEK, trimesterOf } from '../lib/dates';

export interface WeekInfo {
  week: number;
  fruit: string;
  emoji: string;
  size: string;
  weight: string;
  milestone: string;
  trimester: 1 | 2 | 3;
}

// Referência aproximada por faixa de semanas.
const RANGES: Array<Omit<WeekInfo, 'week' | 'trimester'> & { from: number }> = [
  { from: 4, fruit: 'uma semente de papoula', emoji: '🌱', size: '1-2 mm', weight: '< 1 g', milestone: 'O embrião está se implantando no útero.' },
  { from: 5, fruit: 'um grão de arroz', emoji: '🍚', size: '5-10 mm', weight: '< 1 g', milestone: 'O coração começa a bater e os primeiros órgãos se formam.' },
  { from: 8, fruit: 'uma azeitona', emoji: '🫒', size: '1,6-3,1 cm', weight: '1-4 g', milestone: 'Braços e pernas se alongam e os dedos começam a aparecer.' },
  { from: 11, fruit: 'um limão', emoji: '🍋', size: '4,1-7,4 cm', weight: '7-23 g', milestone: 'Os órgãos principais estão formados. Agora é crescer.' },
  { from: 14, fruit: 'um abacate', emoji: '🥑', size: '8,7-13 cm', weight: '43-140 g', milestone: 'O bebê já faz caretas e pode chupar o dedo.' },
  { from: 18, fruit: 'uma manga', emoji: '🥭', size: '14,2-27,8 cm', weight: '190-430 g', milestone: 'Muitas mães começam a sentir os primeiros movimentos.' },
  { from: 23, fruit: 'uma berinjela', emoji: '🍆', size: '28,9-36,6 cm', weight: '500-875 g', milestone: 'O bebê já reage a sons e reconhece a voz de vocês.' },
  { from: 28, fruit: 'um coco', emoji: '🥥', size: '37,6-42,4 cm', weight: '1-1,7 kg', milestone: 'Os olhos se abrem e o bebê ganha gordurinha para se aquecer.' },
  { from: 33, fruit: 'uma melancia', emoji: '🍉', size: '43,7-50,7 cm', weight: '1,9-3,5 kg', milestone: 'Os pulmões amadurecem e o bebê se prepara para nascer.' },
];

export const GESTATION_WEEKS: WeekInfo[] = Array.from({ length: LAST_WEEK - FIRST_WEEK + 1 }, (_, i) => {
  const week = FIRST_WEEK + i;
  const { from: _from, ...range } = [...RANGES].reverse().find(r => week >= r.from)!;
  void _from;
  return { week, trimester: trimesterOf(week), ...range };
});

export function weekInfo(week: number): WeekInfo {
  return GESTATION_WEEKS.find(w => w.week === week) ?? GESTATION_WEEKS[0];
}
