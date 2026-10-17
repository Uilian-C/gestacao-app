import { describe, expect, it } from 'vitest';
import type { ExamItem, JournalEntry } from '../hooks/useGestationData';
import type { Consultation, PartnerTask } from '../types';
import { buildUpcoming } from './upcoming';

const NOW = new Date(2026, 9, 17, 12, 0);
const at = (day: string, time = '14:00') => new Date(`${day}T${time}:00`).toISOString();
const consult = (over: Partial<Consultation>): Consultation => ({ id: 'c', scheduled_at: at('2026-10-17'), specialty: 'obstetra', created_by: 'mae', ...over });
const task = (over: Partial<PartnerTask>): PartnerTask => ({ id: 't', week_number: 22, task_title: 'Montar o berço', assigned_to: 'pai', is_completed: false, priority: 'Média', created_by: 'mae', ...over });
const entry = (over: Partial<JournalEntry>): JournalEntry => ({ id: 'e', entry_date: '2026-10-01', body: 'Contar para a família', visibility: 'shared', remind_on: null, author_role: 'mae', mine: true, created_at: '', folder: 'momento', photos: [], ...over });
const exam = (over: Partial<ExamItem>): ExamItem => ({ id: 'x', kind: 'ultrassom', title: 'Morfo', exam_date: '2026-10-13', plan_item: null, notes: null, visibility: 'shared', author_role: 'mae', mine: true, created_at: '', files: [], ...over });

describe('Hoje e próximos', () => {
  const up = buildUpcoming({
    today: NOW,
    consultations: [
      consult({ id: 'hoje', kind: 'ultrassom', title: 'Morfológico' }),
      consult({ id: 'ter', scheduled_at: at('2026-10-20', '09:00'), kind: 'vacina', title: 'dTpa' }),
      consult({ id: 'nov', scheduled_at: at('2026-11-10', '07:00'), kind: 'exame', title: 'Curva glicêmica' }),
      consult({ id: 'passou', scheduled_at: at('2026-10-13', '08:00'), kind: 'exame', title: 'Exames de sangue' }),
      consult({ id: 'passou-com', scheduled_at: at('2026-10-10', '08:00'), kind: 'ultrassom', title: 'Obstétrico' }),
      consult({ id: 'consulta-passada', scheduled_at: at('2026-10-05', '08:00') }),
    ],
    tasks: [task({ id: 'atrasada', due_date: '2026-10-15' }), task({ id: 'sab', due_date: '2026-10-24' }), task({ id: 'feita', due_date: '2026-10-17', is_completed: true }), task({ id: 'sem-prazo' })],
    journal: [entry({ id: 'lembra', remind_on: '2026-11-15' }), entry({ id: 'velho', remind_on: '2026-10-01' })],
    exams: [exam({ appointment_id: 'passou-com' })],
  });

  it('hoje traz só o que é de hoje, com a tarefa atrasada marcada', () => {
    expect(up.today.map(i => i.id)).toEqual(['tarefa-atrasada', 'agendado-hoje']);
    expect(up.today[0].overdue).toBe(true);
    expect(up.today[1]).toMatchObject({ label: 'Ultrassom', title: 'Morfológico', time: '14:00' });
  });

  it('a semana traz os próximos 7 dias; o resto vai para depois', () => {
    expect(up.week.map(i => i.id)).toEqual(['agendado-ter', 'tarefa-sab']);
    expect(up.later.map(i => i.id)).toEqual(['agendado-nov', 'lembrete-lembra']);
  });

  it('exame que já aconteceu sem resultado pede para guardar; consulta e exame com resultado não', () => {
    expect(up.missingResults.map(c => c.id)).toEqual(['passou']);
    expect(up.past.map(c => c.id)).toEqual(['passou', 'passou-com', 'consulta-passada']);
  });
});
