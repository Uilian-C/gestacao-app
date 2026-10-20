import { describe, expect, it } from 'vitest';
import { localDate, planReminders, planTimed, type FamilyRow } from './reminders.js';

const family = (over: Partial<FamilyRow> = {}): FamilyRow => ({ id: 'f1', dum_date: '2026-05-01', blood_type: 'O+', members: ['mae', 'pai'], done: [], ...over });

describe('localDate', () => {
  it('usa o dia de São Paulo, não o de Londres', () => {
    // 01:30 UTC do dia 17 ainda é dia 16 em São Paulo (UTC-3).
    expect(localDate(new Date('2026-10-17T01:30:00Z'))).toBe('2026-10-16');
    expect(localDate(new Date('2026-10-17T01:30:00Z'), 1)).toBe('2026-10-17');
  });
});

describe('planReminders', () => {
  it('familiares recebem só a semana nova, com um texto para a família', () => {
    const notices = planReminders('2026-10-16', [family({ relatives: ['avo'] })], [
      { id: 'c1', family_id: 'f1', local: '2026-10-17 09:30', professional_name: null, location: null },
    ], []);
    const toAvo = notices.filter(n => n.userIds.includes('avo'));
    expect(toAvo).toHaveLength(1);
    expect(toAvo[0]).toMatchObject({ kind: 'jornada', key: 'semana:f1:24', payload: { title: '24 semanas', url: '/' } });
    expect(notices.find(n => n.kind === 'consultas')?.userIds).toEqual(['mae', 'pai']);
  });

  it('avisa a consulta na véspera e no dia, para todo o espaço', () => {
    const notices = planReminders('2026-10-16', [family()], [
      { id: 'c1', family_id: 'f1', local: '2026-10-17 09:30', professional_name: 'Dra. Ana', location: 'Clínica Bem Nascer' },
      { id: 'c2', family_id: 'f1', local: '2026-10-16 14:00', professional_name: null, location: null },
    ], []);
    const [vespera, dia] = notices.filter(n => n.kind === 'consultas');
    expect(vespera).toMatchObject({ userIds: ['mae', 'pai'], key: 'consulta:c1:vespera', payload: { title: 'Consulta amanhã às 09:30', body: 'Dra. Ana · Clínica Bem Nascer' } });
    expect(dia).toMatchObject({ key: 'consulta:c2:dia', payload: { title: 'Consulta hoje às 14:00' } });
  });

  it('lembrete de momento particular vai só para quem escreveu', () => {
    const notices = planReminders('2026-10-16', [family()], [], [
      { id: 'e1', family_id: 'f1', user_id: 'mae', visibility: 'private', body: 'Contar para a família' },
      { id: 'e2', family_id: 'f1', user_id: 'pai', visibility: 'shared', body: 'Montar o berço' },
    ]);
    expect(notices.find(n => n.key === 'momento:e1')?.userIds).toEqual(['mae']);
    expect(notices.find(n => n.key === 'momento:e2')?.userIds).toEqual(['mae', 'pai']);
  });

  it('lembrete de tarefa vai só para quem cuida dela', () => {
    const notices = planReminders('2026-10-17', [family()], [], [], [{ id: 't1', title: 'Montar o berço', user_ids: ['pai'] }]);
    expect(notices).toEqual([{ userIds: ['pai'], kind: 'momentos', key: 'tarefa:t1:2026-10-17', payload: { title: 'Lembrete de tarefa', body: 'Montar o berço', url: '/?aba=tarefas', tag: 'tarefa-t1' } }]);
  });

  it('na virada da semana conta o que abre na jornada e ignora o que já foi feito', () => {
    // DUM 2026-05-01 + 24 semanas = 2026-10-16: abre a curva glicêmica.
    const [semana] = planReminders('2026-10-16', [family()], [], []);
    expect(semana).toMatchObject({ kind: 'jornada', key: 'semana:f1:24', payload: { title: '24 semanas', url: '/?aba=jornada' } });
    expect(semana.payload.body).toContain('Curva glicêmica');
    expect(semana.payload.body).not.toContain('Coombs'); // só para Rh negativo

    const rhNeg = planReminders('2026-10-16', [family({ blood_type: 'A-' })], [], [])[0];
    expect(rhNeg.payload.body).toContain('Coombs');

    const feito = planReminders('2026-10-16', [family({ done: ['totg'] })], [], [])[0];
    expect(feito.payload.body).toBe('Uma nova semana começou. Veja o que muda para vocês e para o bebê.');
  });

  it('fora da virada da semana, sem aviso de semana', () => {
    expect(planReminders('2026-10-17', [family()], [], [])).toEqual([]);
    expect(planReminders('2026-10-16', [family({ dum_date: null })], [], [])).toEqual([]);
  });
});

describe('planTimed', () => {
  it('lembretes com hora: diário (particular só para quem escreveu), tarefa para quem cuida e aviso antes da consulta', () => {
    const notices = planTimed([family()], {
      entries: [{ id: 'e1', family_id: 'f1', user_id: 'mae', visibility: 'private', body: 'Ligar para a doula', at: '2026-10-20 17:30:00+00' }],
      tasks: [{ id: 't1', title: 'Montar o berço', user_ids: ['pai'], at: '2026-10-20 18:00:00+00' }],
      early: [{ id: 'c1', family_id: 'f1', local: '2026-10-20 15:00', professional_name: 'Dra. Ana', location: null, kind: 'consulta', before: 60 }],
    });
    expect(notices.map(n => [n.key, n.userIds, n.payload.title])).toEqual([
      ['momento:e1:2026-10-20 17:30:00+00', ['mae'], 'Lembrete'],
      ['tarefa:t1:2026-10-20 18:00:00+00', ['pai'], 'Lembrete de tarefa'],
      ['consulta:c1:antes:60', ['mae', 'pai'], 'Consulta em 1 hora, às 15:00'],
    ]);
  });
});
