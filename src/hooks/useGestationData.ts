import { useCallback, useEffect, useState } from 'react';
import { sql } from '../db';
import type { HealthMetric, PartnerComment, PartnerTask, QuestionItem, SymptomItem } from '../types';

export interface GestationData {
  dumDate: string | null;
  symptoms: SymptomItem[];
  questions: QuestionItem[];
  tasks: PartnerTask[];
  comments: PartnerComment[];
  metrics: HealthMetric[];
}

async function fetchAll(): Promise<GestationData> {
  const [family, symptoms, questions, tasks, comments, metrics] = await Promise.all([
    sql`SELECT dum_date::text FROM families WHERE dum_date IS NOT NULL LIMIT 1`,
    sql`
      SELECT id, week_number, log_date::text, symptom_name, intensity,
             COALESCE(created_by, 'mae') AS created_by, COALESCE(category, 'Geral') AS category, notes
      FROM symptoms_log
      ORDER BY created_at DESC
    `,
    sql`
      SELECT id, questions_to_ask, COALESCE(created_by, 'mae') AS created_by, COALESCE(category, 'Geral') AS category,
             doctor_answer, created_at::text, status
      FROM medical_appointments
      WHERE questions_to_ask IS NOT NULL
      ORDER BY created_at DESC
    `,
    sql`
      SELECT id, week_number, task_title, COALESCE(assigned_to, 'casal') AS assigned_to, is_completed, due_date::text,
             COALESCE(priority, 'Média') AS priority, notes, COALESCE(created_by, 'mae') AS created_by
      FROM partner_tasks
      ORDER BY created_at DESC
    `,
    sql`SELECT id, symptom_id, comment_text, COALESCE(author_role, 'mae') AS author_role FROM partner_comments ORDER BY created_at ASC`,
    sql`
      SELECT id, week_number, recorded_at::text, weight_kg::float AS weight_kg, systolic_bp, diastolic_bp,
             COALESCE(created_by, 'mae') AS created_by
      FROM health_metrics_log
      ORDER BY week_number ASC, recorded_at ASC
    `,
  ]);

  return {
    dumDate: (family[0]?.dum_date as string | undefined) ?? null,
    symptoms: symptoms as SymptomItem[],
    questions: questions as QuestionItem[],
    tasks: tasks as PartnerTask[],
    comments: comments as PartnerComment[],
    metrics: metrics as HealthMetric[],
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
