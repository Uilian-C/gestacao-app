import type { Checkin } from '../hooks/useGestationData';

// A sequência gentil: os dias em que os dois contaram um ao outro como estavam.
// Uma semana da gestação inteira assim ganha um coraçãozinho no livro. Falhar
// um dia não apaga nada (as semanas já ganhas ficam), e quem volta depois de
// uns dias é recebido com carinho, nunca com cobrança.

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('en-CA');
};

/** Todos (os papéis do casal que participam) contaram no dia. */
export function allTold(checkins: Checkin[], roles: Array<'mae' | 'pai'>, day: string) {
  return roles.length > 0 && roles.every(r => checkins.some(c => c.author_role === r && c.day === day));
}

/** A semana inteira (do primeiro ao último dia) com os dois contando. */
export function togetherWeek(checkins: Checkin[], roles: Array<'mae' | 'pai'>, from: string, to: string) {
  if (roles.length === 0) return false;
  for (let d = from; d <= to; d = addDays(d, 1)) if (!allTold(checkins, roles, d)) return false;
  return true;
}

/** Quantos dias seguidos, até hoje (ou até ontem, se hoje ainda falta alguém), os dois contaram. */
export function togetherRun(checkins: Checkin[], roles: Array<'mae' | 'pai'>, today: string) {
  let day = allTold(checkins, roles, today) ? today : addDays(today, -1);
  let n = 0;
  while (allTold(checkins, roles, day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

/** Quem conta hoje depois de 3 dias ou mais sem contar (e já tinha contado antes). */
export function welcomeBack(checkins: Checkin[], today: string) {
  const before = checkins.filter(c => c.mine && c.day < today).map(c => c.day).sort();
  const last = before[before.length - 1];
  return !!last && last <= addDays(today, -3);
}
