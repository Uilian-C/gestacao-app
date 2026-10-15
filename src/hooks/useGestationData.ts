import { useCallback, useEffect, useState } from 'react';
import { sql } from '../db';
import type { Consultation, HealthMetric, PartnerComment, PartnerTask, PregnancyProfile, QuestionItem, SymptomItem } from '../types';

export interface GestationData {
  profile: PregnancyProfile;
  symptoms: SymptomItem[];
  questions: QuestionItem[];
  tasks: PartnerTask[];
  comments: PartnerComment[];
  metrics: HealthMetric[];
  consultations: Consultation[];
  /** A migração 002 ainda não foi aplicada: consultas e campos novos ficam desligados. */
  migrationPending: boolean;
}

const toNumber = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v));

// Campos novos são lidos com to_jsonb(...)->>'campo': devolvem NULL quando a
// coluna ainda não existe, em vez de quebrar a consulta inteira.
async function fetchAll(): Promise<GestationData> {
  const [family, symptoms, questions, tasks, comments, metrics, consultations] = await Promise.all([
    sql`
      SELECT f.dum_date::text AS dum_date,
             to_jsonb(f)->>'pre_pregnancy_weight_kg' AS pre_weight,
             to_jsonb(f)->>'height_cm' AS height
      FROM families f
      WHERE f.dum_date IS NOT NULL
      LIMIT 1
    `,
    sql`
      SELECT s.id, s.week_number, s.log_date::text AS log_date, s.symptom_name, s.intensity,
             COALESCE(s.created_by, 'mae') AS created_by, COALESCE(s.category, 'Físico') AS category, s.notes,
             to_jsonb(s)->>'time_of_day' AS time_of_day, s.created_at::text AS created_at
      FROM symptoms_log s
      ORDER BY s.log_date DESC, s.created_at DESC
    `,
    sql`
      SELECT q.id, q.questions_to_ask, COALESCE(q.created_by, 'mae') AS created_by, COALESCE(q.category, 'Geral') AS category,
             q.doctor_answer, q.created_at::text AS created_at, q.status,
             to_jsonb(q)->>'specialty' AS specialty, to_jsonb(q)->>'answered_at' AS answered_at
      FROM medical_appointments q
      WHERE q.questions_to_ask IS NOT NULL
      ORDER BY q.created_at DESC
    `,
    sql`
      SELECT id, week_number, task_title, COALESCE(assigned_to, 'casal') AS assigned_to, is_completed, due_date::text AS due_date,
             COALESCE(priority, 'Média') AS priority, notes, COALESCE(created_by, 'mae') AS created_by
      FROM partner_tasks
      ORDER BY created_at DESC
    `,
    sql`
      SELECT id, symptom_id, comment_text, COALESCE(author_role, 'mae') AS author_role, created_at::text AS created_at
      FROM partner_comments
      ORDER BY created_at ASC
    `,
    sql`
      SELECT id, week_number, recorded_at::text AS recorded_at, weight_kg::float AS weight_kg, systolic_bp, diastolic_bp,
             COALESCE(created_by, 'mae') AS created_by
      FROM health_metrics_log
      ORDER BY recorded_at ASC, week_number ASC
    `,
    sql`
      SELECT id, scheduled_at::text AS scheduled_at, specialty, professional_name, location, notes, COALESCE(created_by, 'mae') AS created_by
      FROM consultations
      ORDER BY scheduled_at ASC
    `.catch(() => null),
  ]);

  const f = family[0] as { dum_date: string; pre_weight: string | null; height: string | null } | undefined;

  return {
    profile: {
      dumDate: f?.dum_date ?? null,
      preWeightKg: toNumber(f?.pre_weight),
      heightCm: toNumber(f?.height),
    },
    symptoms: symptoms as SymptomItem[],
    questions: questions as QuestionItem[],
    tasks: tasks as PartnerTask[],
    comments: comments as PartnerComment[],
    metrics: metrics as HealthMetric[],
    consultations: (consultations ?? []) as Consultation[],
    migrationPending: consultations === null,
  };
}

export type LoadState = 'loading' | 'ready' | 'error';

export function useGestationData() {
  const [data, setData] = useState<GestationData | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchAll()
      .then(result => {
        if (cancelled) return;
        setData(result);
        setLoadState('ready');
      })
      .catch(err => {
        console.error(err);
        if (!cancelled) setLoadState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  /** Recarrega depois de uma alteração. Lança o erro para quem chamou mostrar o aviso. */
  const refresh = useCallback(async () => {
    setData(await fetchAll());
  }, []);

  const retry = useCallback(() => {
    setLoadState('loading');
    setAttempt(a => a + 1);
  }, []);

  return { data, loadState, refresh, retry };
}
