// ==== Tipos centrais do MODUS ====

export type Priority = 'P1_critical' | 'P2_high' | 'P3_normal' | 'P4_low';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';

export type AcademicTaskType =
  | 'assignment'
  | 'quiz'
  | 'peer_review'
  | 'reading'
  | 'exam'
  | 'forum'
  | 'other';

export interface AcademicTask {
  id: string;
  user_id: string;
  id_moodle?: string;
  title: string;
  description?: string;
  summary?: string;
  course?: string;
  course_code?: string;
  professor?: string;
  task_type?: AcademicTaskType;
  task_subtype?: string;
  status: TaskStatus;
  start_date?: string;
  due_date: string;
  submitted_at?: string;
  days_remaining?: number;
  priority: Priority;
  priority_score?: number;
  estimated_hours?: number;
  has_no_deadline?: boolean;
  ava_url?: string;
  submission_link?: string;
  /** Avaliação entre pares: total de colegas para avaliar */
  peer_review_total?: number;
  /** Avaliação entre pares: quantos já avaliou */
  peer_review_done?: number;
  /** Prova presencial: polo */
  exam_location?: string;
  /** Prova presencial: início do período */
  exam_period_start?: string;
  /** Prova presencial: fim do período */
  exam_period_end?: string;
  /** Leitura: semana */
  week_number?: number;
  synced_at?: string;
  moodle_status?: string;
  last_change_detected_at?: string;
  notification_sent?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AcademicSyncState {
  id: string;
  user_id: string;
  last_morning_sync?: string;
  last_evening_sync?: string;
  last_login_success?: boolean;
  last_error?: string;
  last_morning_payload?: string;
  updated_at?: string;
}

export type TransactionType = 'income' | 'expense' | 'transfer' | 'saving';

export interface Transaction {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  transaction_type: TransactionType;
  category?: string;
  status?: string;
  transaction_date: string;
  payment_method?: string;
  created_at?: string;
}

export interface Investment {
  id: string;
  user_id: string;
  ticker?: string;
  name: string;
  investment_type: string;
  quantity?: number;
  average_price?: number;
  current_price?: number;
  invested_amount?: number;
  current_value?: number;
  profit_loss?: number;
  profit_loss_percentage?: number;
  price_updated_at?: string;
}

export interface CreditCard {
  id: string;
  user_id: string;
  name: string;
  brand?: string;
  last_four_digits?: string;
  credit_limit?: number;
  available_limit?: number;
  used_limit?: number;
  usage_percentage?: number;
  current_bill_amount?: number;
  bill_due_day?: number;
  color?: string;
}

export interface Insight {
  id: string;
  user_id: string;
  insight_type?: string;
  title?: string;
  content?: string;
  severity: 'info' | 'positive' | 'warning' | 'critical';
  related_tickers?: string[];
  ai_model?: string;
  created_at?: string;
}

export interface EmailSummary {
  id: string;
  user_id: string;
  category: 'personal' | 'academic' | 'financial' | 'other';
  sender_name?: string;
  sender_email?: string;
  original_subject?: string;
  summary?: string;
  key_points?: string[];
  action_required?: boolean;
  suggested_action?: string;
  priority?: 'low' | 'normal' | 'high';
  received_at?: string;
  is_read?: boolean;
}

export interface LearningCourse {
  id: string;
  user_id: string;
  title: string;
  provider?: string;
  category?: string;
  url?: string;
  total_modules: number;
  completed_modules: number;
  progress?: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'paused';
  color?: string;
}

export interface PersonalGoal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  category?: string;
  target_date?: string;
  progress: number;
  status: 'active' | 'achieved' | 'paused' | 'abandoned';
  milestones?: { title: string; done: boolean; date?: string }[];
}
