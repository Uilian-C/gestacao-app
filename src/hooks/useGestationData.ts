import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import type { BirthPlanRecord, Consultation, Contraction, HealthMetric, KickSession, PartnerComment, PartnerTask, PregnancyProfile, QuestionItem, SymptomItem } from '../types';

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
  kickSessions: KickSession[];
  contractions: Contraction[];
  birthPlan: BirthPlanRecord | null;
  /** A migração 004 (kit do parto) já foi aplicada. */
  laborAvailable: boolean;
  /** Itens marcados como feitos: jornada do pré-natal e mala da maternidade. */
  checks: CheckItem[];
  /** A migração 007 já foi aplicada. */
  checksAvailable: boolean;
}

export interface CheckItem {
  list: 'prenatal' | 'mala';
  item_id: string;
  done_at: string;
}

const fetchAll = () => api.data<GestationData>();

export type LoadState = 'loading' | 'ready' | 'error';

export function useGestationData(onAccessLost: () => void) {
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
        if (cancelled) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) onAccessLost();
        else setLoadState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, onAccessLost]);

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
