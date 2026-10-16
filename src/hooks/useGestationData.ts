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
  /** Momentos: os compartilhados e os particulares de quem está logado. */
  journal: JournalEntry[];
  journalAvailable: boolean;
}

export interface JournalEntry {
  id: string;
  entry_date: string;
  body: string;
  visibility: 'private' | 'shared';
  remind_on: string | null;
  author_role: 'mae' | 'pai';
  /** Escrito por quem está logado (só esses podem ser apagados). */
  mine: boolean;
  created_at: string;
}

export interface CheckItem {
  list: 'prenatal' | 'mala';
  item_id: string;
  done_at: string;
}

const fetchAll = () => api.data<GestationData>();

export type LoadState = 'loading' | 'ready' | 'error';

export function useGestationData(onAccessLost: () => void, initial?: unknown) {
  // Os dados que vieram junto com a abertura (/api/family) evitam uma segunda chamada.
  const [data, setData] = useState<GestationData | null>((initial as GestationData | undefined) ?? null);
  const [loadState, setLoadState] = useState<LoadState>(initial ? 'ready' : 'loading');
  const [attempt, setAttempt] = useState(initial ? -1 : 0);

  useEffect(() => {
    if (attempt < 0) return;
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

  /** Troca pelos dados que o servidor devolveu junto com a gravação. */
  const replace = useCallback((next: unknown) => setData(next as GestationData), []);

  /** Mostra a mudança na hora, antes de o servidor confirmar. */
  const patch = useCallback((fn: (d: GestationData) => GestationData) => setData(d => (d ? fn(d) : d)), []);

  const retry = useCallback(() => {
    setLoadState('loading');
    setAttempt(a => Math.max(0, a) + 1);
  }, []);

  return { data, loadState, refresh, replace, patch, retry };
}
