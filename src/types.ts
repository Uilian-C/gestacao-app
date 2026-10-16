export type Author = 'mae' | 'pai';
export type Assignee = Author | 'casal';
export type Priority = 'Baixa' | 'Média' | 'Alta';

export interface SymptomItem {
  id: string;
  week_number: number;
  log_date: string;
  symptom_name: string;
  intensity: number;
  created_by: Author;
  category: string;
  notes?: string | null;
  time_of_day?: TimeOfDay | null;
  created_at?: string;
}

export type TimeOfDay = 'madrugada' | 'manha' | 'tarde' | 'noite';

export interface QuestionItem {
  id: string;
  questions_to_ask: string;
  created_by: Author;
  category: string;
  doctor_answer?: string | null;
  created_at: string;
  status: string;
  /** NULL = obstetra. */
  specialty?: string | null;
  answered_at?: string | null;
}

export interface PartnerTask {
  id: string;
  week_number: number;
  task_title: string;
  assigned_to: Assignee;
  is_completed: boolean;
  due_date?: string | null;
  priority: Priority;
  notes?: string | null;
  created_by: Author;
}

export interface PartnerComment {
  id: string;
  symptom_id: string;
  comment_text: string;
  author_role: Author;
  created_at?: string;
}

export interface Consultation {
  id: string;
  scheduled_at: string;
  specialty: string;
  professional_name?: string | null;
  location?: string | null;
  notes?: string | null;
  created_by: Author;
}

export interface PregnancyProfile {
  dumDate: string | null;
  preWeightKg: number | null;
  heightCm: number | null;
}

export interface HealthMetric {
  id: string;
  week_number: number;
  recorded_at: string;
  weight_kg: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  created_by: Author;
}

export type DeletableKind = 'task' | 'symptom' | 'question' | 'comment' | 'metric' | 'consultation';

export type Tab = 'inicio' | 'agenda' | 'diario' | 'painel' | 'consultas' | 'tarefas';
