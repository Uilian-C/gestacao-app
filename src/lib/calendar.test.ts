import { describe, expect, it } from 'vitest';
import { buildCalendar, gestationalWeekDays, gestationalWeekOf, googleCalendarUrl, monthGrid, toIcs } from './calendar';
import { parseLocalDate, toISODate } from './dates';
import type { Consultation, HealthMetric, PartnerTask, SymptomItem } from '../types';

const TODAY = parseLocalDate('2026-10-16');
const consultation: Consultation = { id: 'c1', scheduled_at: '2026-10-20 12:00:00+00', specialty: 'nutricionista', professional_name: 'Marina', location: 'Clínica, sala 2', created_by: 'pai' };
const tasks: PartnerTask[] = [
  { id: 't1', week_number: 22, task_title: 'Curva glicêmica', assigned_to: 'mae', is_completed: false, due_date: '2026-10-10', priority: 'Alta', created_by: 'pai' },
  { id: 't2', week_number: 22, task_title: 'Sem prazo', assigned_to: 'casal', is_completed: false, due_date: null, priority: 'Baixa', created_by: 'mae' },
  { id: 't3', week_number: 22, task_title: 'Feita', assigned_to: 'casal', is_completed: true, due_date: '2026-10-25', priority: 'Baixa', created_by: 'mae' },
];
const symptoms: SymptomItem[] = [
  { id: 's1', week_number: 22, log_date: '2026-10-14', symptom_name: 'Azia', intensity: 4, created_by: 'mae', category: 'Digestivo' },
  { id: 's2', week_number: 22, log_date: '2026-10-14', symptom_name: 'Insônia', intensity: 2, created_by: 'mae', category: 'Sono' },
];
const metrics: HealthMetric[] = [{ id: 'm1', week_number: 22, recorded_at: '2026-10-14', weight_kg: 66, systolic_bp: 142, diastolic_bp: 91, created_by: 'pai' }];
const cal = buildCalendar({ dumDate: '2026-05-11', consultations: [consultation], tasks, symptoms, metrics, today: TODAY });

describe('eventos do calendário', () => {
  it('coloca a consulta no dia e hora locais', () => {
    const [e] = cal.events.get('2026-10-20')!;
    expect(e.kind).toBe('consulta');
    expect(e.title).toBe('Nutricionista');
    expect(e.time).toBe('09:00');
  });

  it('tarefas entram pelo prazo, marcando atraso e conclusão', () => {
    expect(cal.events.get('2026-10-10')![0].overdue).toBe(true);
    expect(cal.events.get('2026-10-25')![0].done).toBe(true);
    expect([...cal.events.values()].flat().some(e => e.title === 'Sem prazo')).toBe(false);
  });

  it('calcula os marcos pela DUM, com a DPP em 40 semanas', () => {
    expect(cal.events.get('2027-02-15')!.some(e => e.title === 'Data provável do parto')).toBe(true);
    expect(cal.events.get('2026-08-17')!.some(e => e.title === 'Início do 2º trimestre')).toBe(true);
  });

  it('resume os registros do dia', () => {
    const r = cal.records.get('2026-10-14')!;
    expect(r.symptoms).toHaveLength(2);
    expect(r.maxIntensity).toBe(4);
    expect(r.bpHigh).toBe(true);
  });
});

describe('grades', () => {
  it('mês começa no domingo e cobre semanas inteiras', () => {
    const weeks = monthGrid(2026, 9); // outubro de 2026
    expect(weeks[0][0].getDay()).toBe(0);
    expect(toISODate(weeks[0][0])).toBe('2026-09-27');
    expect(toISODate(weeks[weeks.length - 1][6])).toBe('2026-10-31');
    expect(weeks).toHaveLength(5);
  });

  it('semana da gestação começa no dia da semana da DUM', () => {
    const days = gestationalWeekDays('2026-05-11', 22);
    expect(toISODate(days[0])).toBe('2026-10-12');
    expect(toISODate(days[6])).toBe('2026-10-18');
    expect(gestationalWeekOf('2026-05-11', TODAY)).toBe(22);
  });
});

describe('exportação', () => {
  it('gera link do Google Agenda com horário em UTC', () => {
    const url = new URL(googleCalendarUrl(consultation));
    expect(url.searchParams.get('dates')).toBe('20261020T120000Z/20261020T130000Z');
    expect(url.searchParams.get('location')).toBe('Clínica, sala 2');
  });

  it('gera .ics com consulta, tarefa pendente e marcos, sem tarefa concluída', () => {
    const ics = toIcs([...cal.events.values()].flat(), [consultation], new Date(Date.UTC(2026, 9, 16)));
    expect(ics).toContain('DTSTART:20261020T120000Z');
    expect(ics).toContain('LOCATION:Clínica\\, sala 2');
    expect(ics).toContain('SUMMARY:Tarefa: Curva glicêmica');
    expect(ics).not.toContain('Feita');
    expect(ics).toContain('DTSTART;VALUE=DATE:20270215');
  });
});

describe('momentos na agenda', () => {
  const journal = [{ id: 'm1', entry_date: '2026-10-16', body: 'Contamos no trabalho', remind_on: '2026-10-31', visibility: 'private' as const, author_role: 'mae' as const }];
  it('momento no dia e lembrete na data marcada', () => {
    const cal = buildCalendar({ dumDate: '2026-05-15', consultations: [], tasks: [], symptoms: [], metrics: [], journal });
    expect(cal.events.get('2026-10-16')?.some(e => e.kind === 'momento' && !e.reminder)).toBe(true);
    const reminder = cal.events.get('2026-10-31')?.find(e => e.reminder);
    expect(reminder?.title).toBe('Lembrete: Contamos no trabalho');
    expect(reminder?.private).toBe(true);
  });
  it('a agenda exportada leva só o lembrete, não o momento vivido', () => {
    const cal = buildCalendar({ dumDate: '2026-05-15', consultations: [], tasks: [], symptoms: [], metrics: [], journal });
    const ics = toIcs([...cal.events.values()].flat(), []);
    expect(ics).toContain('SUMMARY:Lembrete: Contamos no trabalho');
    expect(ics.match(/Contamos no trabalho/g)?.length).toBe(1);
  });
});

describe('agendamentos e resultados no calendário', () => {
  const base = { dumDate: '2026-05-15', tasks: [], symptoms: [], metrics: [] };
  const ultrassom = { id: 'u1', scheduled_at: '2026-10-13T17:00:00.000Z', specialty: 'ultrassom', created_by: 'mae' as const, kind: 'ultrassom' as const, title: 'Ultrassom morfológico do 2º trimestre', plan_item: 'morfo-2' };

  it('exame agendado aparece com o nome e o tipo', () => {
    const cal = buildCalendar({ ...base, consultations: [ultrassom] });
    const e = cal.events.get('2026-10-13')!.find(x => x.kind === 'consulta')!;
    expect(e.title).toBe('Ultrassom morfológico do 2º trimestre');
    expect(e.appointment).toBe('ultrassom');
  });

  it('resultado guardado sem agendamento entra no dia do exame', () => {
    const cal = buildCalendar({ ...base, consultations: [], results: [{ id: 'r1', title: 'Hemograma', exam_date: '2026-10-13', kind: 'exame' }] });
    const e = cal.events.get('2026-10-13')!.find(x => x.kind === 'exame')!;
    expect(e.title).toBe('Hemograma');
    expect(e.sourceId).toBe('r1');
  });

  it('resultado de um agendamento do mesmo dia não aparece duas vezes', () => {
    const cal = buildCalendar({ ...base, consultations: [ultrassom], results: [{ id: 'r1', title: 'Morfológico', exam_date: '2026-10-13', kind: 'ultrassom', appointment_id: 'u1' }] });
    const day = cal.events.get('2026-10-13')!;
    expect(day.filter(x => x.kind === 'exame')).toHaveLength(0);
    expect(day.find(x => x.kind === 'consulta')!.detail).toContain('resultado guardado');
  });
});
