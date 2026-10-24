// "Primeiros 7 dias com o Tumtum": uma pequena missão por dia, que se marca
// sozinha quando a ação acontece de verdade (nada para clicar em "feito").

export type MissionId = 'convidar' | 'checkin' | 'consulta' | 'barriga' | 'nome' | 'carta' | 'livro';

export interface Mission {
  id: MissionId;
  day: number;
  title: string;
  why: string;
  action: string;
}

export const MISSIONS: Mission[] = [
  { id: 'convidar', day: 1, title: 'Chamar quem vai viver isso com você', why: 'O Tumtum é pensado para os dois.', action: 'Convidar' },
  { id: 'checkin', day: 2, title: 'Contar como você está hoje', why: 'Um toque por dia, e o outro sabe como você está.', action: 'Contar' },
  { id: 'consulta', day: 3, title: 'Agendar a próxima consulta', why: 'A agenda e os lembretes começam a cuidar de vocês.', action: 'Agendar' },
  { id: 'barriga', day: 4, title: 'Tirar a primeira foto da barriga', why: 'Semana a semana, ela vira a evolução da barriga.', action: 'Tirar foto' },
  { id: 'nome', day: 5, title: 'Anotar uma ideia de nome', why: 'Cada nome ganha uma página, com o porquê e quem curtiu.', action: 'Anotar' },
  { id: 'carta', day: 6, title: 'Escrever uma carta para o bebê', why: 'Uma página que ele vai ler um dia.', action: 'Escrever' },
  { id: 'livro', day: 7, title: 'Abrir o livro de vocês', why: 'Tudo isso vira a história de vocês, capítulo por capítulo.', action: 'Abrir o livro' },
];

export interface FirstDaysState {
  done: Set<MissionId>;
  /** O dia de hoje no roteiro (1 a 7), contado a partir do primeiro dia em que o cartão apareceu. */
  today: number;
  /** A missão sugerida agora: a do dia, ou a primeira que falta. */
  next: Mission | null;
  complete: boolean;
}

export function firstDays(done: Set<MissionId>, startIso: string, todayIso: string): FirstDaysState {
  const days = Math.round((Date.parse(`${todayIso}T12:00:00`) - Date.parse(`${startIso}T12:00:00`)) / 86_400_000);
  const today = Math.min(7, Math.max(1, days + 1));
  const pending = MISSIONS.filter(m => !done.has(m.id));
  // A do dia, se ainda falta; senão a primeira que falta (pode adiantar ou recuperar).
  const next = pending.find(m => m.day === today) ?? pending.find(m => m.day <= today) ?? pending[0] ?? null;
  return { done, today, next, complete: pending.length === 0 };
}
