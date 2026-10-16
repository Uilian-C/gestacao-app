// Contagem de movimentos e cronômetro de contrações. As regras aqui só
// organizam os registros e dizem quando vale ligar; quem decide é o obstetra.
import type { Contraction, KickSession } from '../types';
import { parseTimestamp } from './dates';

const MINUTE = 60_000;

/* ---------- Movimentos do bebê ---------- */

export interface KickSummary {
  session: KickSession;
  minutes: number;
  reachedTarget: boolean;
}

export function summarizeKicks(sessions: KickSession[]): KickSummary[] {
  return sessions
    .map(session => {
      const minutes = Math.max(0, (parseTimestamp(session.ended_at).getTime() - parseTimestamp(session.started_at).getTime()) / MINUTE);
      return { session, minutes, reachedTarget: session.kicks >= session.target };
    })
    .sort((a, b) => parseTimestamp(b.session.started_at).getTime() - parseTimestamp(a.session.started_at).getTime());
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/* ---------- Contrações ---------- */

export interface TimedContraction {
  id: string;
  start: Date;
  end: Date;
  durationSec: number;
  /** Minutos desde o início da contração anterior (intervalo usado pelos obstetras). */
  intervalMin: number | null;
  author: Contraction['created_by'];
}

export function timeContractions(list: Contraction[]): TimedContraction[] {
  const sorted = [...list].sort((a, b) => parseTimestamp(a.started_at).getTime() - parseTimestamp(b.started_at).getTime());
  return sorted.map((c, i) => {
    const start = parseTimestamp(c.started_at);
    const end = parseTimestamp(c.ended_at);
    const prev = i > 0 ? parseTimestamp(sorted[i - 1].started_at) : null;
    return {
      id: c.id,
      start,
      end,
      durationSec: Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000)),
      intervalMin: prev ? (start.getTime() - prev.getTime()) / MINUTE : null,
      author: c.created_by,
    };
  });
}

export type LaborSignal = 'nenhum' | 'irregular' | 'ritmo' | '511' | 'prematuro';

export interface LaborStatus {
  signal: LaborSignal;
  lastHourCount: number;
  avgDurationSec: number | null;
  avgIntervalMin: number | null;
}

/**
 * Lê a última hora de contrações.
 * - "511": a cada 5 minutos ou menos, durando 1 minuto ou mais, por 1 hora (regra usual para ligar).
 * - "prematuro": contrações frequentes antes de 37 semanas (sinal de alerta da Caderneta).
 * - "ritmo": já há um padrão, mas ainda sem fechar a regra 5-1-1.
 */
export function laborStatus(list: TimedContraction[], gestationalWeek: number, now: Date = new Date()): LaborStatus {
  const recent = list.filter(c => now.getTime() - c.start.getTime() <= 60 * MINUTE);
  const durations = recent.map(c => c.durationSec);
  const intervals = recent.slice(1).map(c => c.intervalMin!).filter(v => v !== null);
  const avg = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
  const avgDurationSec = avg(durations);
  const avgIntervalMin = avg(intervals);
  const base = { lastHourCount: recent.length, avgDurationSec, avgIntervalMin };

  if (recent.length === 0) return { signal: 'nenhum', ...base };
  if (gestationalWeek < 37 && recent.length >= 4) return { signal: 'prematuro', ...base };

  const span = recent.length > 1 ? (recent[recent.length - 1].start.getTime() - recent[0].start.getTime()) / MINUTE : 0;
  if (recent.length >= 6 && span >= 50 && avgIntervalMin !== null && avgIntervalMin <= 5.5 && avgDurationSec !== null && avgDurationSec >= 55) {
    return { signal: '511', ...base };
  }
  if (recent.length >= 3 && avgIntervalMin !== null && avgIntervalMin <= 10) return { signal: 'ritmo', ...base };
  return { signal: 'irregular', ...base };
}

/** Linhas para o resumo do obstetra: o que a reta final registrou no período. */
export function laborReportLines(
  input: { kicks: KickSession[]; contractions: Contraction[]; plan: { progress: number; discussed: boolean } | null },
  period: { from: Date; to: Date },
): string[] {
  const end = new Date(period.to.getFullYear(), period.to.getMonth(), period.to.getDate() + 1);
  const inside = (iso: string) => {
    const t = parseTimestamp(iso).getTime();
    return t >= period.from.getTime() && t < end.getTime();
  };
  const lines: string[] = [];

  const kicks = summarizeKicks(input.kicks.filter(k => inside(k.started_at)));
  if (kicks.length) {
    const reached = kicks.filter(k => k.reachedTarget);
    const avg = reached.length ? Math.round(reached.reduce((a, k) => a + k.minutes, 0) / reached.length) : null;
    const missed = kicks.length - reached.length;
    lines.push(
      `Movimentos do bebê: ${kicks.length} ${kicks.length === 1 ? 'contagem' : 'contagens'}` +
        (avg !== null ? `, meta alcançada em média em ${avg} min` : '') +
        (missed ? `; ${missed} sem alcançar a meta` : ''),
    );
  }

  const contractions = timeContractions(input.contractions.filter(c => inside(c.started_at)));
  if (contractions.length) {
    const avgDur = Math.round(contractions.reduce((a, c) => a + c.durationSec, 0) / contractions.length);
    lines.push(`Contrações cronometradas: ${contractions.length}, duração média de ${formatDuration(avgDur * 1000)}`);
  }

  if (input.plan) {
    lines.push(`Plano de parto: ${Math.round(input.plan.progress * 100)}% preenchido${input.plan.discussed ? ', já conversado com o obstetra' : ', ainda não conversado com o obstetra'}`);
  }
  return lines;
}
