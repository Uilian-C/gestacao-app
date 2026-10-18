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
  /** Dia do lembrete no celular (migração 017). */
  remind_on?: string | null;
  /** Dia e hora do lembrete (migração 018). */
  remind_at?: string | null;
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
  /** Tipo do agendamento (migração 013); sem ele, é consulta. */
  kind?: AppointmentKind;
  /** Nome do exame, ultrassom ou vacina. */
  title?: string | null;
  /** Item da jornada do pré-natal ligado ao agendamento. */
  plan_item?: string | null;
  /** Quem vai (migração 016): mãe, pai ou os dois. */
  attendees?: Assignee | null;
  /** Aviso a mais antes do horário, em minutos (migração 018). */
  remind_before?: number | null;
}

export type AppointmentKind = 'consulta' | 'exame' | 'ultrassom' | 'vacina';

export interface PregnancyProfile {
  dumDate: string | null;
  preWeightKg: number | null;
  heightCm: number | null;
  motherName: string | null;
  motherBirthDate: string | null;
  bloodType: string | null;
  gestations: number | null;
  births: number | null;
  abortions: number | null;
  cesareans: number | null;
  allergies: string | null;
  medications: string | null;
  conditions: string | null;
  /** A migração 003 (ficha da gestante) já foi aplicada. */
  fichaAvailable: boolean;
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

export interface KickSession {
  id: string;
  started_at: string;
  ended_at: string;
  kicks: number;
  target: number;
  created_by: Author;
}

export interface Contraction {
  id: string;
  started_at: string;
  ended_at: string;
  created_by: Author;
}

export interface BirthPlanRecord {
  data: Record<string, unknown>;
  updated_by: Author | null;
  updated_at: string | null;
}

export type DeletableKind = 'task' | 'symptom' | 'question' | 'comment' | 'metric' | 'consultation' | 'kick' | 'contraction' | 'entry' | 'exam' | 'examFile' | 'item' | 'thread';

export type Tab = 'inicio' | 'diario' | 'agenda' | 'cuidados' | 'parto';

/** Partes de cada aba (os chips logo abaixo do título). */
/** Diário: a capa do fichário ou uma das pastas. */
export type DiaryView = 'mural' | 'tudo' | 'humor' | 'momento' | 'dia' | 'ideia' | 'carta' | 'barriga';
export type AgendaView = 'proximos' | 'calendario' | 'tarefas';
export type CareView = 'saude' | 'exames' | 'duvidas' | 'jornada';
/** Cuidados → Saúde: os registros, os gráficos e o resumo. */
export type HealthView = 'registros' | 'sintomas' | 'corpo' | 'resumo';

/** Visões dos gráficos e da jornada (o antigo Painel, hoje dentro de Cuidados). */
export type DashboardView = 'geral' | 'jornada' | 'sintomas' | 'corpo';
