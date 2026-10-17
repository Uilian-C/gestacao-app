import { describe, expect, it } from 'vitest';
import { PLAN_ITEMS } from '../content/prenatalPlan';
import type { JournalEntry } from '../hooks/useGestationData';
import type { Consultation, PartnerTask } from '../types';
import { parseLocalDate } from './dates';
import { todayCards } from './today';

const TODAY = parseLocalDate('2026-10-16');
const item = (id: string) => PLAN_ITEMS.find(i => i.id === id)!;
const task = (over: Partial<PartnerTask>): PartnerTask => ({ id: 't', week_number: 22, task_title: 'Montar o berço', assigned_to: 'pai', is_completed: false, priority: 'Média', created_by: 'mae', ...over });
const moment = (over: Partial<JournalEntry>): JournalEntry => ({ id: 'm', entry_date: '2026-10-15', body: 'Sentimos o bebê mexer', visibility: 'shared', remind_on: null, author_role: 'pai', mine: false, created_at: '', folder: 'momento', photos: [], ...over });
const base = { today: TODAY, dumDate: '2026-05-15', reminders: [], nextConsultation: null, steps: [], tasks: [], currentWeek: 22, moments: [], savedExams: new Set<string>() };

describe('todayCards', () => {
  it('sem nada pendente, não inventa cartões', () => {
    expect(todayCards(base)).toEqual([]);
  });

  it('consulta nos próximos 14 dias vira cartão com "Preparar resumo"', () => {
    const c: Consultation = { id: 'c1', scheduled_at: '2026-10-19T12:30:00Z', specialty: 'obstetra', professional_name: 'Dra. Marina', created_by: 'mae' };
    const [card] = todayCards({ ...base, nextConsultation: c });
    expect(card).toMatchObject({ tone: 'verde', label: 'Consulta em 3 dias', action: { label: 'Preparar resumo' } });
    expect(card.detail).toContain('Dra. Marina');
    expect(todayCards({ ...base, nextConsultation: { ...c, scheduled_at: '2026-11-20T12:30:00Z' } })).toEqual([]);
  });

  it('exame na janela pede o resultado; some quando já foi guardado', () => {
    const steps = [{ item: item('morfo-2'), status: 'agora' as const }, { item: item('dtpa'), status: 'agora' as const }];
    const cards = todayCards({ ...base, steps });
    expect(cards.map(c => c.action?.label)).toEqual(['Guardar resultado', 'Marcar como feito']);
    expect(cards[0].label).toBe('Exame na janela');
    expect(todayCards({ ...base, steps: [{ item: item('primeira-consulta'), status: 'pendente' }] })[0].label).toBe('Consulta atrasada');
    expect(todayCards({ ...base, steps, savedExams: new Set(['morfo-2']) }).map(c => c.title)).toEqual(['Vacina dTpa']);
  });

  it('tarefas: atrasadas primeiro, no máximo duas', () => {
    const tasks = [task({ id: 'a', task_title: 'Da semana' }), task({ id: 'b', task_title: 'Atrasada', due_date: '2026-10-10' }), task({ id: 'c', task_title: 'Outra da semana' }), task({ id: 'd', is_completed: true })];
    const cards = todayCards({ ...base, tasks });
    expect(cards.map(c => c.title)).toEqual(['Atrasada', 'Da semana']);
    expect(cards[0]).toMatchObject({ tone: 'azul', label: 'Tarefa atrasada' });
  });

  it('mostra o momento recente da outra pessoa, não os próprios nem os particulares', () => {
    expect(todayCards({ ...base, moments: [moment({})] })[0]).toMatchObject({ label: 'Momento do pai', title: 'Sentimos o bebê mexer' });
    expect(todayCards({ ...base, moments: [moment({ mine: true }), moment({ visibility: 'private' }), moment({ entry_date: '2026-09-01' })] })).toEqual([]);
  });

  it('lembretes da próxima semana', () => {
    const r = moment({ remind_on: '2026-10-17', body: 'Contar para a família', mine: true });
    expect(todayCards({ ...base, reminders: [r] })[0]).toMatchObject({ tone: 'rosa', label: 'Lembrete amanhã', title: 'Contar para a família' });
  });
});
