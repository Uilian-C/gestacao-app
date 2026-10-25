import type { Consultation } from '../types';
import type { Celebration } from './celebrations';
import { daysBetween, localDay, parseLocalDate, parseTimestamp, toISODate } from './dates';

// A contagem para os marcos: o próximo grande momento (um ultrassom, a festa
// de vocês, a chegada do bebê), com quantos dias faltam e uma barrinha que
// vai enchendo. Antecipação compartilhada: assunto para os dois.

export interface Countdown {
  id: string;
  days: number;
  /** "o morfológico", "o chá de bebê", "a chegada de Helena". */
  what: string;
  /** "vocês vão ver o rostinho". */
  why: string;
  /** De 0 a 1: quanto da espera já passou. */
  progress: number;
  kind: 'ultrassom' | 'celebracao' | 'parto';
  targetId?: string;
}

const WINDOW = { ultrassom: 21, celebracao: 30, parto: 30 } as const;

/** Quanto da janela da contagem já passou: a barra enche conforme o dia chega. */
const progressOf = (days: number, window: number) => Math.min(1, Math.max(0.05, 1 - days / window));

function ultrasoundWhy(c: Consultation) {
  const t = (c.title ?? '').toLowerCase();
  if (t.includes('morfo')) return { what: 'o morfológico', why: 'vocês vão ver o rostinho' };
  if (t.includes('transluc')) return { what: 'a translucência nucal', why: 'o primeiro encontro com o perfil do bebê' };
  if (t.includes('3d') || t.includes('4d')) return { what: 'o ultrassom 3D', why: 'vocês vão ver a carinha' };
  return { what: `o ${c.title ? c.title.toLowerCase() : 'ultrassom'}`, why: 'vocês vão ver o bebê de novo' };
}

/** O próximo marco que vale contar os dias (o mais perto, dentro da janela de cada um). */
export function nextCountdown(input: { consultations: Consultation[]; celebrations?: Celebration[] | null; dpp: Date | null; babyName: string | null; today?: Date }): Countdown | null {
  const today = input.today ?? new Date();
  const todayDay = parseLocalDate(toISODate(today));
  const options: Countdown[] = [];
  for (const c of input.consultations) {
    if ((c.kind ?? 'consulta') !== 'ultrassom') continue;
    const days = daysBetween(todayDay, localDay(c.scheduled_at));
    if (days < 1 || days > WINDOW.ultrassom) continue;
    options.push({ id: `ultra-${c.id}`, days, ...ultrasoundWhy(c), progress: progressOf(days, WINDOW.ultrassom), kind: 'ultrassom', targetId: c.id });
  }
  for (const p of input.celebrations ?? []) {
    if (!p.event_at) continue;
    const days = daysBetween(todayDay, parseLocalDate(toISODate(parseTimestamp(p.event_at))));
    if (days < 1 || days > WINDOW.celebracao) continue;
    options.push({ id: `festa-${p.id}`, days, what: p.title.toLowerCase().startsWith('chá') ? `o ${p.title.toLowerCase()}` : p.title, why: 'a festa de vocês', progress: progressOf(days, WINDOW.celebracao), kind: 'celebracao', targetId: p.id });
  }
  if (input.dpp) {
    const days = daysBetween(todayDay, input.dpp);
    if (days >= 1 && days <= WINDOW.parto) options.push({ id: 'parto', days, what: input.babyName ? `a chegada de ${input.babyName}` : 'a chegada do bebê', why: 'a data provável do parto', progress: progressOf(days, WINDOW.parto), kind: 'parto' });
  }
  return options.sort((a, b) => a.days - b.days)[0] ?? null;
}

export const countdownTitle = (c: Countdown) => `${c.days === 1 ? 'Falta 1 dia' : `Faltam ${c.days} dias`} para ${c.what}`;
