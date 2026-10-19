import { describe, expect, it } from 'vitest';
import type { CheckItem, ExamItem, ListItem } from '../hooks/useGestationData';
import type { Consultation } from '../types';
import { planFor } from './journey';
import { appointmentKindFor, journeyRows, journeySummary, plannedItems, planToText, statusText, suggestPlanItem, todoNow, windowDatesText } from './journeyPlan';

// DUM 15/05/2026: semana 24 começa em 30/10/2026.
const dum = '2026-05-15';
const now = new Date(2026, 10, 10, 12); // 10/11/2026, semana 25
const appt = (over: Partial<Consultation>): Consultation => ({ id: 'a', scheduled_at: '2026-11-20T12:00:00.000Z', specialty: 'ultrassom', created_by: 'mae', kind: 'exame', title: null, plan_item: null, ...over });
const exam = (over: Partial<ExamItem>): ExamItem => ({ id: 'e', kind: 'exame', title: 'x', exam_date: '2026-11-01', plan_item: null, notes: null, visibility: 'shared', author_role: 'mae', mine: true, created_at: '', files: [], ...over });
const items = plannedItems(planFor('O+'), []);
const row = (rows: ReturnType<typeof journeyRows>, id: string) => rows.find(r => r.item.id === id)!;

describe('jornada: planejado × realizado', () => {
  it('agendamento ligado deixa o item agendado e, depois da data, feito', () => {
    const ctx = { week: 25, dumDate: dum, now, checks: [] as CheckItem[], exams: [] as ExamItem[] };
    const future = journeyRows(items, { ...ctx, consultations: [appt({ plan_item: 'totg' })] });
    expect(row(future, 'totg').status).toBe('agendado');
    expect(row(future, 'totg').appointment?.id).toBe('a');
    const past = journeyRows(items, { ...ctx, consultations: [appt({ plan_item: 'totg', scheduled_at: '2026-11-05T12:00:00.000Z' })] });
    expect(row(past, 'totg').status).toBe('feito');
    expect(row(past, 'totg').doneOn).toBe('2026-11-05');
  });

  it('resultado guardado e marcação à mão também contam como feito; janela passada sem nada é atrasado', () => {
    const rows = journeyRows(items, { week: 25, dumDate: dum, now, consultations: [], checks: [{ list: 'prenatal', item_id: 'primeira-consulta', done_at: '2026-06-20' }], exams: [exam({ plan_item: 'morfo-2', exam_date: '2026-10-20' })] });
    expect(row(rows, 'primeira-consulta')).toMatchObject({ status: 'feito', checked: true, doneOn: '2026-06-20' });
    expect(row(rows, 'morfo-2')).toMatchObject({ status: 'feito', doneOn: '2026-10-20' });
    expect(row(rows, 'morfo-1').status).toBe('atrasado');
    expect(row(rows, 'dtpa').status).toBe('agora');
    expect(row(rows, 'vsr').status).toBe('em-breve');
  });

  it('semanas ajustadas pelo casal mudam a janela e avisam quando o agendamento fica fora dela', () => {
    const adjusted = plannedItems(planFor('O+'), [{ item_id: 'totg', from: 20, to: 22 }]);
    const totg = adjusted.find(i => i.id === 'totg')!;
    expect(totg).toMatchObject({ from: 20, to: 22, base: { from: 24, to: 28 } });
    const rows = journeyRows(adjusted, { week: 25, dumDate: dum, now, checks: [], exams: [], consultations: [appt({ plan_item: 'totg' })] });
    expect(row(rows, 'totg')).toMatchObject({ status: 'agendado', outside: true });
  });

  it('itens do casal entram na jornada, na semana escolhida', () => {
    const own: ListItem = { id: '11111111-1111-1111-1111-111111111111', list: 'prenatal', title: 'Ecocardiograma fetal', bag_group: null, week: 26, created_by: 'mae' };
    const all = plannedItems(planFor('O+'), [], [own]);
    expect(all.find(i => i.id === own.id)).toMatchObject({ from: 26, to: 26, own });
  });

  it('resumo: previstos até agora, feitos, agendados e atrasados', () => {
    const rows = journeyRows(items, { week: 25, dumDate: dum, now, exams: [], checks: [{ list: 'prenatal', item_id: 'primeira-consulta', done_at: '2026-06-20' }], consultations: [appt({ plan_item: 'totg' })] });
    const s = journeySummary(rows, 25);
    expect(s).toMatchObject({ dueByNow: 6, done: 1, scheduled: 1, late: 3 }); // atrasados: exames iniciais, morfo 1 e morfo 2
  });
});

describe('encaixe automático ao agendar', () => {
  const ctx = { items, dumDate: dum, done: new Set<string>(), consultations: [] as Consultation[], now };
  it('pelo nome', () => {
    expect(suggestPlanItem({ kind: 'exame', title: 'Curva glicêmica', date: '2026-11-20' }, ctx)?.id).toBe('totg');
    expect(suggestPlanItem({ kind: 'vacina', title: 'dTpa', date: '2026-11-20' }, ctx)?.id).toBe('dtpa');
    expect(suggestPlanItem({ kind: 'exame', title: 'Pesquisa de estreptococo', date: '2027-01-20' }, ctx)?.id).toBe('gbs');
  });
  it('nome genérico: vale a semana da data', () => {
    expect(suggestPlanItem({ kind: 'ultrassom', title: 'Ultrassom', date: '2026-10-05' }, ctx)?.id).toBe('morfo-2'); // semana 20
    expect(suggestPlanItem({ kind: 'ultrassom', title: '', date: '2026-08-01' }, ctx)?.id).toBe('morfo-1'); // semana 11
    expect(suggestPlanItem({ kind: 'exame', title: 'Exames de sangue', date: '2026-12-15' }, ctx)?.id).toBe('exames-3tri'); // semana 30
    expect(suggestPlanItem({ kind: 'ultrassom', title: 'Ultrassom', date: '2026-12-15' }, ctx)).toBeNull();
  });
  it('mesmo nome em duas janelas: a semana decide', () => {
    expect(suggestPlanItem({ kind: 'exame', title: 'Hemograma', date: '2026-07-20' }, ctx)?.id).toBe('exames-iniciais');
    expect(suggestPlanItem({ kind: 'exame', title: 'Hemograma', date: '2026-12-15' }, ctx)?.id).toBe('exames-3tri');
  });
  it('nome que não é da jornada não encaixa', () => {
    expect(suggestPlanItem({ kind: 'exame', title: 'Ecocardiograma fetal', date: '2026-11-20' }, ctx)).toBeNull();
  });
  it('não repete item feito ou já agendado', () => {
    expect(suggestPlanItem({ kind: 'exame', title: 'Curva glicêmica', date: '2026-11-20' }, { ...ctx, done: new Set(['totg']) })).toBeNull();
    const taken = [appt({ id: 'b', plan_item: 'totg' })];
    expect(suggestPlanItem({ kind: 'exame', title: 'Curva glicêmica', date: '2026-11-20' }, { ...ctx, consultations: taken })).toBeNull();
    expect(suggestPlanItem({ kind: 'exame', title: 'Curva glicêmica', date: '2026-11-20', id: 'b' }, { ...ctx, consultations: taken })?.id).toBe('totg');
  });
  it('tipo do agendamento para cada item', () => {
    expect(appointmentKindFor(items.find(i => i.id === 'morfo-2')!)).toBe('ultrassom');
    expect(appointmentKindFor(items.find(i => i.id === 'totg')!)).toBe('exame');
    expect(appointmentKindFor(items.find(i => i.id === 'vsr')!)).toBe('vacina');
  });
});

describe('jornada para leigos', () => {
  const ctx = { week: 25, dumDate: dum, now, exams: [] as ExamItem[] };
  it('anotação do combinado sem mudar as semanas', () => {
    const all = plannedItems(planFor('O+'), [{ item_id: 'totg', from: null, to: null, note: 'Dra. Ana pediu em jejum de 10 h' }]);
    expect(all.find(i => i.id === 'totg')).toMatchObject({ from: 24, to: 28, note: 'Dra. Ana pediu em jejum de 10 h' });
    expect(all.find(i => i.id === 'totg')!.base).toBeUndefined();
  });

  it('situação em uma linha, sem jargão', () => {
    const rows = journeyRows(items, { ...ctx, checks: [], consultations: [appt({ plan_item: 'totg', scheduled_at: '2026-11-20T12:00:00.000Z' })] });
    expect(statusText(row(rows, 'morfo-1'), dum)).toMatch(/^Passou da janela, que ia até \d\d\/\d\d$/);
    expect(statusText(row(rows, 'dtpa'), dum)).toMatch(/^Fazer até \d\d\/\d\d$/);
    expect(statusText(row(rows, 'vsr'), dum)).toMatch(/^A partir de \d\d\/\d\d$/);
    expect(statusText(row(rows, 'totg'), dum)).toMatch(/^Agendado: .*20\/11, 09:00$/);
  });

  it('janela em datas reais', () => {
    expect(windowDatesText(items.find(i => i.id === 'totg')!, dum)).toBe('de 30/10 a 03/12');
  });

  it('para fazer agora: atrasados primeiro, depois a janela aberta, depois o que abre em breve', () => {
    const rows = journeyRows(items, { ...ctx, checks: [{ list: 'prenatal', item_id: 'primeira-consulta', done_at: '2026-06-20' }], consultations: [] });
    const ids = todoNow(rows).map(r => r.item.id);
    expect(ids.slice(0, 3)).toEqual(['exames-iniciais', 'morfo-1', 'morfo-2']);
    expect(ids).toContain('totg');
    expect(ids.indexOf('totg')).toBeLessThan(ids.indexOf('vsr'));
    expect(ids).not.toContain('primeira-consulta');
    expect(ids).not.toContain('gripe');
  });

  it('plano em texto para levar à consulta, com o combinado', () => {
    const noted = plannedItems(planFor('O+'), [{ item_id: 'totg', from: 22, to: 23, note: 'pedido da Dra. Ana' }]);
    const rows = journeyRows(noted, { ...ctx, checks: [{ list: 'prenatal', item_id: 'primeira-consulta', done_at: '2026-06-20' }], consultations: [] });
    const text = planToText(rows, dum, 25, [{ title: 'Toda a jornada', rows }]);
    expect(text).toContain('Plano do pré-natal · semana 25');
    expect(text).toContain('[x] 1ª consulta de pré-natal');
    expect(text).toContain('Curva glicêmica (TOTG 75 g) · semanas 22 a 23');
    expect(text).toContain('Combinado: pedido da Dra. Ana');
  });
});
