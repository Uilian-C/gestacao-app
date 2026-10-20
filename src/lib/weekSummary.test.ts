import { describe, expect, it } from 'vitest';
import type { Checkin, JournalEntry } from '../hooks/useGestationData';
import type { Consultation, PartnerTask, SymptomItem } from '../types';
import { showsWeekSummary, summaryHeadline, summaryRange, weekSummary } from './weekSummary';

const sunday = new Date(2026, 9, 25, 10); // domingo, 25/10
const monday = new Date(2026, 9, 26, 10);
const ck = (day: string, mood: Checkin['mood'], author_role: 'mae' | 'pai'): Checkin => ({ day, mood, author_role, mine: author_role === 'mae' });
const entry = (over: Partial<JournalEntry>): JournalEntry => ({ id: 'e', entry_date: '2026-10-22', body: '', visibility: 'shared', remind_on: null, author_role: 'mae', mine: true, created_at: '', folder: 'momento', photos: [], ...over });
const appt = (scheduled_at: string): Consultation => ({ id: scheduled_at, scheduled_at, specialty: 'obstetra', created_by: 'mae' });
const task = (over: Partial<PartnerTask>): PartnerTask => ({ id: 't', week_number: 23, task_title: 'x', assigned_to: 'pai', is_completed: false, priority: 'Média', created_by: 'mae', ...over });
const sym = (log_date: string): SymptomItem => ({ id: log_date, week_number: 23, log_date, symptom_name: 'Azia', intensity: 2, created_by: 'mae' }) as SymptomItem;

describe('resumo da semana do casal', () => {
  it('aparece no domingo e na segunda, contando os 7 dias que terminam no domingo', () => {
    expect(showsWeekSummary(sunday)).toBe(true);
    expect(showsWeekSummary(monday)).toBe(true);
    expect(showsWeekSummary(new Date(2026, 9, 27))).toBe(false);
    expect(summaryRange(sunday)).toEqual({ from: '2026-10-19', to: '2026-10-25' });
    expect(summaryRange(monday)).toEqual({ from: '2026-10-19', to: '2026-10-25' });
  });

  it('conta humor de cada um, posts e fotos, compromissos e o que vem', () => {
    const s = weekSummary({
      today: sunday,
      roles: ['mae', 'pai'],
      checkins: [ck('2026-10-19', 'bem', 'mae'), ck('2026-10-20', 'cansada', 'mae'), ck('2026-10-21', 'cansada', 'mae'), ck('2026-10-20', 'otima', 'pai'), ck('2026-10-12', 'bem', 'pai')],
      journal: [entry({ id: 'a', photos: [{ id: 'p', thumb: true }] }), entry({ id: 'b', visibility: 'private' }), entry({ id: 'c', entry_date: '2026-10-10' })],
      consultations: [appt('2026-10-23T12:00:00.000Z'), appt('2026-10-28T12:00:00.000Z'), appt('2026-11-20T12:00:00.000Z')],
      tasks: [task({ due_date: '2026-10-30' }), task({ due_date: '2026-10-30', is_completed: true }), task({ due_date: null })],
      symptoms: [sym('2026-10-22'), sym('2026-10-01')],
    });
    expect(s.people).toEqual([
      { role: 'mae', days: 3, top: 'cansada' },
      { role: 'pai', days: 1, top: 'otima' },
    ]);
    expect(s).toMatchObject({ posts: 1, photos: 1, appointments: 1, symptoms: 1, next: { appointments: 1, tasks: 1 } });
  });

  it('frase de abertura conforme a presença dos dois', () => {
    const base = { from: '', to: '', posts: 0, photos: 0, appointments: 0, symptoms: 0, next: { appointments: 0, tasks: 0 } };
    expect(summaryHeadline({ ...base, people: [{ role: 'mae', days: 6, top: 'bem' }, { role: 'pai', days: 5, top: 'bem' }] })).toMatch(/um para o outro/);
    expect(summaryHeadline({ ...base, people: [{ role: 'mae', days: 0, top: null }, { role: 'pai', days: 0, top: null }] })).toMatch(/Semana corrida/);
  });
});
