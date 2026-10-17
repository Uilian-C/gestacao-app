import { PLAN_ITEMS } from '../../src/content/prenatalPlan.js';
import type { NotifyKind, PushPayload } from './push.js';

// Quais lembretes saem hoje. Função pura (sem banco), para dar para testar:
// recebe o que está registrado e devolve a lista de avisos.

export const TIME_ZONE = 'America/Sao_Paulo';

export interface FamilyRow {
  id: string;
  dum_date: string | null;
  blood_type: string | null;
  members: string[];
  done: string[];
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

export function planReminders(today: string, families: FamilyRow[], consultations: ConsultationRow[], entries: EntryRow[]): Notice[] {
  const notices: Notice[] = [];
  const membersOf = new Map(families.map(f => [f.id, f.members]));

  // Consultas: na véspera e na manhã do dia.
  for (const c of consultations) {
    const [date, time] = c.local.split(' ');
    const when = date === today ? 'hoje' : 'amanhã';
    const details = [c.professional_name, c.location].filter(Boolean).join(' · ');
    notices.push({
      userIds: membersOf.get(c.family_id) ?? [],
      kind: 'consultas',
      key: `consulta:${c.id}:${date === today ? 'dia' : 'vespera'}`,
      payload: {
        title: `${KIND_LABEL[c.kind ?? 'consulta'] ?? 'Consulta'} ${when} às ${time}`,
        body: clip([c.kind && c.kind !== 'consulta' ? c.title : null, details].filter(Boolean).join(' · '), 140) || 'Toque para ver o endereço e as dúvidas para levar.',
        url: '/?aba=consultas',
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

  // Semana nova: no dia em que completa a semana, com o que abre na jornada.
  for (const f of families) {
    if (!f.dum_date) continue;
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
  }

  return notices.filter(n => n.userIds.length > 0);
}
