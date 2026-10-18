import { MILESTONES, type Milestone } from '../content/milestones';
import { daysBetween, parseLocalDate } from './dates';

/** O próximo marco (ou o de hoje) e em quantos dias ele chega, contando da DUM. */
export function nextMilestone(dumDate: string, todayIso: string): { milestone: Milestone; days: number } | null {
  const elapsed = daysBetween(parseLocalDate(dumDate), parseLocalDate(todayIso));
  for (const milestone of MILESTONES) {
    const days = milestone.week * 7 - elapsed;
    if (days >= 0) return { milestone, days };
  }
  return null;
}

/** "hoje", "amanhã", "em 5 dias", "em 2 semanas" ou "em 2 semanas e 3 dias". */
export function inDays(days: number): string {
  if (days === 0) return 'hoje';
  if (days === 1) return 'amanhã';
  if (days < 7) return `em ${days} dias`;
  const weeks = Math.floor(days / 7);
  const rest = days % 7;
  const w = `${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
  return rest ? `em ${w} e ${rest} ${rest === 1 ? 'dia' : 'dias'}` : `em ${w}`;
}
