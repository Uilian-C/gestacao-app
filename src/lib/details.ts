import { questionSpecialty } from '../data/specialties';
import type { JournalEntry } from '../hooks/useGestationData';
import type { Consultation, HealthMetric, PartnerComment, PartnerTask, SymptomItem } from '../types';

// Qual registro está aberto na janela de detalhes.

export type DetailKind = 'symptom' | 'metric' | 'entry' | 'task' | 'consultation';
export interface DetailTarget {
  kind: DetailKind;
  id: string;
}

export type Detail =
  | { kind: 'symptom'; item: SymptomItem; comments: PartnerComment[] }
  | { kind: 'metric'; item: HealthMetric }
  | { kind: 'entry'; item: JournalEntry }
  | { kind: 'task'; item: PartnerTask }
  | { kind: 'consultation'; item: Consultation; pendingQuestions: number };


/** Acha o registro aberto nos dados atuais (some se foi apagado). */
export function resolveDetail(
  target: DetailTarget | null,
  d: { symptoms: SymptomItem[]; comments: PartnerComment[]; metrics: HealthMetric[]; journal: JournalEntry[]; tasks: PartnerTask[]; consultations: Consultation[]; pendingQuestions: (specialty: string) => number },
): Detail | null {
  if (!target) return null;
  const { kind, id } = target;
  if (kind === 'symptom') {
    const item = d.symptoms.find(x => x.id === id);
    return item ? { kind, item, comments: d.comments.filter(c => c.symptom_id === id) } : null;
  }
  if (kind === 'metric') {
    const item = d.metrics.find(x => x.id === id);
    return item ? { kind, item } : null;
  }
  if (kind === 'entry') {
    const item = d.journal.find(x => x.id === id);
    return item ? { kind, item } : null;
  }
  if (kind === 'task') {
    const item = d.tasks.find(x => x.id === id);
    return item ? { kind, item } : null;
  }
  const item = d.consultations.find(x => x.id === id);
  return item ? { kind, item, pendingQuestions: d.pendingQuestions(questionSpecialty(item.specialty)) } : null;
}
