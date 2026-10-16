import type { Assignee, Priority } from '../types';

export interface TaskSuggestion {
  title: string;
  fromWeek: number;
  toWeek: number;
  /** Semana em que a tarefa é criada. */
  week: number;
  assignee: Assignee;
  priority: Priority;
  notes?: string;
}

// Marcos do pré-natal e da preparação do casal. As datas exatas de exames e
// vacinas são confirmadas com o obstetra; aqui ficam as janelas usuais.
export const TASK_SUGGESTIONS: TaskSuggestion[] = [
  { title: 'Agendar ultrassom morfológico do 1º trimestre', fromWeek: 8, toWeek: 13, week: 10, assignee: 'casal', priority: 'Alta', notes: 'Feito entre 11 e 14 semanas.' },
  { title: 'Fazer exames de sangue do 1º trimestre', fromWeek: 6, toWeek: 13, week: 8, assignee: 'mae', priority: 'Alta' },
  { title: 'Atualizar vacinas do pai (dTpa, gripe, hepatite B)', fromWeek: 10, toWeek: 32, week: 16, assignee: 'pai', priority: 'Média', notes: 'Quem convive com o bebê também se vacina.' },
  { title: 'Agendar ultrassom morfológico do 2º trimestre', fromWeek: 16, toWeek: 24, week: 18, assignee: 'casal', priority: 'Alta', notes: 'Feito entre 20 e 24 semanas.' },
  { title: 'Tomar a vacina dTpa', fromWeek: 18, toWeek: 36, week: 20, assignee: 'mae', priority: 'Alta', notes: 'A partir da 20ª semana.' },
  { title: 'Agendar consulta odontológica do pré-natal', fromWeek: 12, toWeek: 30, week: 14, assignee: 'mae', priority: 'Média' },
  { title: 'Fazer a curva glicêmica (TOTG)', fromWeek: 22, toWeek: 28, week: 24, assignee: 'mae', priority: 'Alta', notes: 'Entre 24 e 28 semanas.' },
  { title: 'Tomar a vacina contra o VSR', fromWeek: 26, toWeek: 36, week: 28, assignee: 'mae', priority: 'Alta', notes: 'Disponível no SUS a partir da 28ª semana. Confirmar com o obstetra.' },
  { title: 'Escrever o plano de parto juntos', fromWeek: 26, toWeek: 36, week: 30, assignee: 'casal', priority: 'Média' },
  { title: 'Visitar a maternidade e conferir documentos', fromWeek: 28, toWeek: 36, week: 32, assignee: 'casal', priority: 'Média' },
  { title: 'Organizar a licença-paternidade no trabalho', fromWeek: 24, toWeek: 36, week: 30, assignee: 'pai', priority: 'Média' },
  { title: 'Montar a mala da maternidade', fromWeek: 30, toWeek: 36, week: 33, assignee: 'casal', priority: 'Alta' },
  { title: 'Fazer a pesquisa de estreptococo B', fromWeek: 34, toWeek: 37, week: 35, assignee: 'mae', priority: 'Alta', notes: 'Entre 35 e 37 semanas.' },
  { title: 'Instalar a cadeirinha no carro', fromWeek: 32, toWeek: 38, week: 35, assignee: 'pai', priority: 'Média' },
];

/** Sugestões da fase atual que o casal ainda não criou (comparação pelo título). */
export function suggestionsFor(currentWeek: number, existingTitles: string[]): TaskSuggestion[] {
  const existing = new Set(existingTitles.map(t => t.trim().toLowerCase()));
  return TASK_SUGGESTIONS.filter(s => currentWeek >= s.fromWeek && currentWeek <= s.toWeek && !existing.has(s.title.toLowerCase()));
}
