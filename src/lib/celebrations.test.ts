import { describe, expect, it } from 'vitest';
import { budgetOf, diaperFor, diaperPlan, dueOf, guestsOf, pendingTasks, upcomingCelebration, type Celebration, type CelebrationItem } from './celebrations';

const item = (over: Partial<CelebrationItem>): CelebrationItem => ({ id: 'i', kind: 'tarefa', title: 'x', due_date: null, due_offset: null, assigned_to: 'casal', done: false, contact: null, amount: null, status: null, people: null, notes: null, created_at: '', ...over });
const party = (over: Partial<Celebration>): Celebration => ({ id: 'c', kind: 'cha_bebe', title: 'Chá', event_at: '2026-12-12T15:00:00-03:00', location: null, theme: null, colors: [], budget: null, notes: null, created_at: '', items: [], ...over });

describe('celebrações', () => {
  it('prazo "X dias antes" acompanha a data; prazo fixo fica', () => {
    expect(dueOf(item({ due_offset: 30 }), '2026-12-12T15:00:00-03:00')).toBe('2026-11-12');
    expect(dueOf(item({ due_offset: 30 }), null)).toBeNull();
    expect(dueOf(item({ due_date: '2026-11-01', due_offset: 30 }), '2026-12-12T15:00:00-03:00')).toBe('2026-11-01');
  });

  it('as tarefas que faltam vêm da mais urgente', () => {
    const c = party({ items: [item({ id: 'a', due_offset: 7 }), item({ id: 'b', due_offset: 30 }), item({ id: 'c', done: true, due_offset: 60 }), item({ id: 'd' })] });
    expect(pendingTasks(c).map(t => t.item.id)).toEqual(['b', 'a', 'd']);
  });

  it('orçamento: previsto, combinado e pago', () => {
    const c = party({ budget: '2000', items: [item({ kind: 'fornecedor', amount: '800', status: 'pago' }), item({ kind: 'fornecedor', amount: '500', status: 'contratado' }), item({ kind: 'fornecedor', amount: '300', status: 'orcado' })] });
    expect(budgetOf(c)).toEqual({ planned: 2000, committed: 1300, paid: 800, quoted: 1600 });
  });

  it('convidados contam as pessoas de cada convite', () => {
    const c = party({ items: [item({ kind: 'convidado', status: 'vai', people: 2 }), item({ kind: 'convidado', status: 'talvez' }), item({ kind: 'convidado' })] });
    expect(guestsOf(c)).toMatchObject({ going: 2, maybe: 1, waiting: 1, notGoing: 0 });
  });

  it('fraldas: a divisão soma exatamente e põe mais em M e G', () => {
    const plan = diaperPlan(20);
    expect(plan.reduce((n, p) => n + p.packs, 0)).toBe(20);
    expect(plan.map(p => p.packs)).toEqual([1, 4, 7, 6, 2]);
    expect(diaperPlan(7).reduce((n, p) => n + p.packs, 0)).toBe(7);
    expect([...diaperFor(['a', 'b', 'c']).values()]).toEqual(['P', 'M', 'G']);
  });

  it('o Início mostra só a celebração dos próximos 60 dias', () => {
    const today = new Date(2026, 9, 22);
    expect(upcomingCelebration([party({ event_at: '2027-02-01T15:00:00-03:00' })], today)).toBeNull();
    expect(upcomingCelebration([party({ id: 'perto', event_at: '2026-11-15T15:00:00-03:00' }), party({ id: 'longe', event_at: '2026-12-15T15:00:00-03:00' })], today)?.c.id).toBe('perto');
  });
});
