import { PLAN_ITEMS } from '../../src/content/prenatalPlan.js';
import type { NotifyKind, PushPayload } from './push.js';

// Quais lembretes saem hoje. Função pura (sem banco), para dar para testar:
// recebe o que está registrado e devolve a lista de avisos.

export const TIME_ZONE = 'America/Sao_Paulo';

export interface FamilyRow {
  id: string;
  dum_date: string | null;
  blood_type: string | null;
  /** O casal. */
  members: string[];
  /** Familiares (migração 023): recebem só a semana nova. */
  relatives?: string[];
  done: string[];
  /** Modo cuidado ligado (migração 029): nada de semana nova nem contagens. */
  care?: boolean;
}

export interface ConsultationRow {
  id: string;
  family_id: string;
  /** Data e hora locais (São Paulo), "YYYY-MM-DD HH:MM". */
  local: string;
  professional_name: string | null;
  location: string | null;
  /** consulta, exame, ultrassom ou vacina (migração 013). */
  kind?: string | null;
  title?: string | null;
}

const KIND_LABEL: Record<string, string> = { consulta: 'Consulta', exame: 'Exame', ultrassom: 'Ultrassom', vacina: 'Vacina' };

export interface EntryRow {
  id: string;
  family_id: string;
  user_id: string | null;
  visibility: 'private' | 'shared';
  body: string;
}

export interface TaskRow {
  id: string;
  title: string;
  /** Quem cuida da tarefa (a mãe, o pai ou os dois), já como pessoas do espaço. */
  user_ids: string[];
}

/** Lembretes com hora (migração 018) que já chegaram: o instante entra na chave para não repetir. */
export interface Timed {
  entries: Array<EntryRow & { at: string }>;
  tasks: Array<TaskRow & { at: string }>;
  /** Agendamentos com aviso a mais antes do horário (minutos). */
  early: Array<ConsultationRow & { before: number }>;
  /** Consultas e ultrassons que terminaram há umas 3 horas, ainda sem "como foi" (migração 032). */
  after?: ConsultationRow[];
}

const BEFORE_TEXT: Record<number, string> = { 30: 'em 30 minutos', 60: 'em 1 hora', 120: 'em 2 horas', 1440: 'amanhã' };

/** Os lembretes com hora: saem quando a hora chega (o /api/lembretes roda a cada 15 minutos). */
export function planTimed(families: FamilyRow[], timed: Timed): Notice[] {
  const membersOf = new Map(families.map(f => [f.id, f.members]));
  const notices: Notice[] = [];
  for (const e of timed.entries) {
    notices.push({
      userIds: e.visibility === 'private' ? (e.user_id ? [e.user_id] : []) : (membersOf.get(e.family_id) ?? []),
      kind: 'momentos',
      key: `momento:${e.id}:${e.at}`,
      payload: { title: 'Lembrete', body: clip(e.body, 140) || 'Lembrete do diário', url: '/?aba=diario', tag: `momento-${e.id}` },
    });
  }
  for (const t of timed.tasks) {
    notices.push({ userIds: t.user_ids, kind: 'momentos', key: `tarefa:${t.id}:${t.at}`, payload: { title: 'Lembrete de tarefa', body: clip(t.title, 140), url: '/?aba=tarefas', tag: `tarefa-${t.id}` } });
  }
  for (const c of timed.early) {
    const time = c.local.split(' ')[1];
    const what = KIND_LABEL[c.kind ?? 'consulta'] ?? 'Consulta';
    notices.push({
      userIds: membersOf.get(c.family_id) ?? [],
      kind: 'consultas',
      key: `consulta:${c.id}:antes:${c.before}`,
      payload: {
        title: `${what} ${BEFORE_TEXT[c.before] ?? 'em breve'}, às ${time}`,
        body: clip([c.kind && c.kind !== 'consulta' ? c.title : null, c.professional_name, c.location].filter(Boolean).join(' · '), 140) || 'Toque para ver o endereço.',
        url: '/?aba=proximos',
        tag: `consulta-${c.id}`,
      },
    });
  }
  // "Como foi a consulta?": algumas horas depois, um toque para contar.
  for (const c of timed.after ?? []) {
    const ultra = c.kind === 'ultrassom';
    notices.push({
      userIds: membersOf.get(c.family_id) ?? [],
      kind: 'consultas',
      key: `comofoi:${c.id}`,
      payload: { title: ultra ? 'Como foi o ultrassom?' : 'Como foi a consulta?', body: ultra ? 'Um toque para contar, e a foto do bebê pode virar página do livro.' : 'Um toque para contar, e as dúvidas que vocês levaram.', url: `/?comofoi=${c.id}`, tag: `comofoi-${c.id}` },
    });
  }
  return notices.filter(n => n.userIds.length > 0);
}

export interface Notice {
  userIds: string[];
  kind: NotifyKind;
  key: string;
  payload: PushPayload;
}

/** Data de hoje em São Paulo, "YYYY-MM-DD". */
export function localDate(now: Date, offsetDays = 0): string {
  const d = new Date(now.getTime() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

const dayNumber = (iso: string) => Math.round(Date.parse(`${iso}T00:00:00Z`) / 86_400_000);
const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/** `evening`: já é noite (a partir das 19h); só então sai o aviso da véspera da consulta. */
export function planReminders(today: string, families: FamilyRow[], consultations: ConsultationRow[], entries: EntryRow[], tasks: TaskRow[] = [], evening = true): Notice[] {
  const notices: Notice[] = [];
  const membersOf = new Map(families.map(f => [f.id, f.members]));

  // Consultas: na noite da véspera e na manhã do dia (de manhã, um aviso de amanhã parece cedo demais).
  for (const c of consultations) {
    const [date, time] = c.local.split(' ');
    if (date !== today && !evening) continue;
    const when = date === today ? 'hoje' : 'amanhã';
    const details = [c.professional_name, c.location].filter(Boolean).join(' · ');
    notices.push({
      userIds: membersOf.get(c.family_id) ?? [],
      kind: 'consultas',
      key: `consulta:${c.id}:${date === today ? 'dia' : 'vespera'}`,
      payload: {
        title: `${KIND_LABEL[c.kind ?? 'consulta'] ?? 'Consulta'} ${when} às ${time}`,
        body: clip([c.kind && c.kind !== 'consulta' ? c.title : null, details].filter(Boolean).join(' · '), 140) || 'Toque para ver o endereço e as dúvidas para levar.',
        url: '/?aba=proximos',
        tag: `consulta-${c.id}`,
      },
    });
  }

  // Momentos com lembrete para hoje: os particulares só para quem escreveu.
  for (const e of entries) {
    const userIds = e.visibility === 'private' ? (e.user_id ? [e.user_id] : []) : (membersOf.get(e.family_id) ?? []);
    notices.push({
      userIds,
      kind: 'momentos',
      key: `momento:${e.id}`,
      payload: { title: 'Lembrete de hoje', body: clip(e.body, 140), url: '/?aba=diario', tag: `momento-${e.id}` },
    });
  }

  // Tarefas com lembrete para hoje: só para quem cuida delas.
  for (const t of tasks) {
    notices.push({
      userIds: t.user_ids,
      kind: 'momentos',
      key: `tarefa:${t.id}:${today}`,
      payload: { title: 'Lembrete de tarefa', body: clip(t.title, 140), url: '/?aba=tarefas', tag: `tarefa-${t.id}` },
    });
  }

  // Véspera da semana nova: um convite para voltar amanhã (a semana chega embrulhada no Início).
  for (const f of families) {
    if (!f.dum_date || f.care) continue;
    const days = dayNumber(today) - dayNumber(f.dum_date) + 1;
    if (days <= 0 || days % 7 !== 0) continue;
    const week = days / 7;
    if (week < 5 || week > 40) continue;
    notices.push({
      userIds: f.members,
      kind: 'jornada',
      key: `vespera-semana:${f.id}:${week}`,
      payload: { title: `Amanhã, ${week} semanas`, body: 'Tem um presente esperando por vocês no Tumtum: a semana nova chega embrulhada.', url: '/', tag: 'semana' },
    });
  }

  // Semana nova: no dia em que completa a semana, com o que abre na jornada.
  for (const f of families) {
    if (!f.dum_date || f.care) continue;
    const days = dayNumber(today) - dayNumber(f.dum_date);
    if (days <= 0 || days % 7 !== 0) continue;
    const week = days / 7;
    if (week < 4 || week > 42) continue;
    const rhNegative = !!f.blood_type && f.blood_type.trim().endsWith('-');
    const opening = PLAN_ITEMS.filter(i => i.from === week && !i.anytime && (!i.rhNegativeOnly || rhNegative) && !f.done.includes(i.id));
    notices.push({
      userIds: f.members,
      kind: 'jornada',
      key: `semana:${f.id}:${week}`,
      payload: {
        title: `${week} semanas`,
        body: opening.length
          ? clip(`Começa agora a janela de: ${opening.map(i => i.short).join(', ')}. Toque para ver a jornada.`, 160)
          : 'Uma nova semana começou. Veja o que muda para vocês e para o bebê.',
        url: opening.length ? '/?aba=jornada' : '/',
        tag: 'semana',
      },
    });
    // A família acompanha o bebê crescer, sem os detalhes do pré-natal.
    notices.push({
      userIds: f.relatives ?? [],
      kind: 'jornada',
      key: `semana:${f.id}:${week}`,
      payload: { title: `${week} semanas`, body: 'O bebê completou mais uma semana. Toque para ver como ele está.', url: '/', tag: 'semana' },
    });
  }

  return notices.filter(n => n.userIds.length > 0);
}
