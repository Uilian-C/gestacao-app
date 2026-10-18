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
  /** A migração 012 (pastas e fotos do diário) já foi aplicada. */
  photosAvailable?: boolean;
  /** Check-ins do dia dos dois, últimos 60 dias (migração 014). */
  checkins?: Checkin[];
  checkinAvailable?: boolean;
  /** A migração 016 já rodou: "quem vai" nos agendamentos. */
  attendeesAvailable?: boolean;
  hugs?: Hug[];
  /** Exames e ultrassons: os compartilhados e os particulares de quem está logado. */
  exams: ExamItem[];
  /** A migração 010 já foi aplicada. */
  examsAvailable: boolean;
  /** Itens que o casal pôs na mala ou na jornada. */
  listItems: ListItem[];
  /** Itens da lista padrão que não se aplicam a este casal. */
  hiddenItems: Array<{ list: 'prenatal' | 'mala'; item_id: string }>;
  /** Reações e conversas (só as de registros que esta pessoa vê). */
  reactions: Reaction[];
  threads: ThreadComment[];
  /** A migração 011 já foi aplicada. */
  socialAvailable: boolean;
}

export interface ListItem {
  id: string;
  list: 'prenatal' | 'mala';
  title: string;
  bag_group: 'mae' | 'bebe' | 'acompanhante' | null;
  week: number | null;
  created_by: 'mae' | 'pai';
}

export type ReactionKind = 'abraco' | 'forca' | 'aqui' | 'festa';
export type SocialTarget = 'entry' | 'exam' | 'symptom' | 'task';

export interface Reaction {
  target_type: SocialTarget;
  target_id: string;
  kind: ReactionKind;
  author_role: 'mae' | 'pai';
  mine: boolean;
}

export interface ThreadComment {
  id: string;
  target_type: 'entry' | 'exam';
  target_id: string;
  body: string;
  author_role: 'mae' | 'pai';
  mine: boolean;
  created_at: string;
}

export interface ExamFile {
  id: string;
  content_type: string;
  size: number;
}

export type ExamKind = 'ultrassom' | 'exame' | 'outro';

export interface ExamItem {
  id: string;
  kind: ExamKind;
  title: string;
  exam_date: string;
  /** Item da jornada do pré-natal a que o exame corresponde. */
  plan_item: string | null;
  notes: string | null;
  visibility: 'private' | 'shared';
  author_role: 'mae' | 'pai';
  mine: boolean;
  created_at: string;
  files: ExamFile[];
  /** Agendamento de onde veio o resultado (migração 013). */
  appointment_id?: string | null;
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
  /** Pasta do fichário (antes da migração 012, tudo é "momento"). */
  folder: Folder;
  /** Fotos do registro; `thumb` diz se há miniatura para as listas. */
  photos: EntryPhoto[];
}

export type Mood = 'otima' | 'bem' | 'cansada' | 'enjoada' | 'ansiosa';

export interface Checkin {
  day: string;
  mood: Mood;
  author_role: 'mae' | 'pai';
  mine: boolean;
}

/** Abraço do cartão "Vocês dois hoje": o dia e se veio para quem está logado. */
export interface Hug {
  day: string;
  toMe: boolean;
}

export type Folder = 'momento' | 'dia' | 'ideia' | 'carta' | 'barriga';

export interface EntryPhoto {
  id: string;
  thumb: boolean;
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
