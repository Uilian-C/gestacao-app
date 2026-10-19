import { specialtyOf } from '../data/specialties';
import type { ExamItem } from '../hooks/useGestationData';
import type { AppointmentKind, Consultation } from '../types';

// Agendamentos: consultas, exames, ultrassons e vacinas marcados. Todos vão
// para a Agenda e recebem lembrete; só as consultas têm o resumo para o médico
// e contam como consulta do pré-natal.

export const APPOINTMENT_KINDS: Array<{ id: AppointmentKind; label: string }> = [
  { id: 'consulta', label: 'Consulta' },
  { id: 'exame', label: 'Exame' },
  { id: 'ultrassom', label: 'Ultrassom' },
  { id: 'vacina', label: 'Vacina' },
];

export const kindOf = (c: Pick<Consultation, 'kind'>): AppointmentKind => c.kind ?? 'consulta';
export const isConsultation = (c: Pick<Consultation, 'kind'>) => kindOf(c) === 'consulta';
export const kindInfo = (k: AppointmentKind) => APPOINTMENT_KINDS.find(x => x.id === k)!;

/** Nome que aparece na lista e na Agenda: a especialidade (consulta) ou o nome do exame. */
export function appointmentTitle(c: Consultation): string {
  const kind = kindOf(c);
  if (kind === 'consulta') return specialtyOf(c.specialty).label;
  return c.title?.trim() || kindInfo(kind).label;
}

/** Tem resultado para guardar (exame e ultrassom; vacina e consulta não). */
export const hasResult = (c: Consultation) => kindOf(c) === 'exame' || kindOf(c) === 'ultrassom';

/** Resultado já guardado de um agendamento. */
export const resultOf = (c: Consultation, exams: ExamItem[]) => exams.find(e => e.appointment_id === c.id) ?? null;
