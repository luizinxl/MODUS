// ============================================================
// dailyS Academic Scraper — Configuração e Constantes
// ============================================================

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- Caminhos ----
export const COOKIES_PATH = path.resolve(__dirname, '..', 'cookies.json');
export const DEBUG_DIR = path.resolve(__dirname, '..', 'debug');

// ---- URLs do AVA ----
export const AVA_BASE = 'https://ava.univesp.br';
export const AVA_LOGIN_URL = `${AVA_BASE}/login/index.php`;
export const AVA_DASHBOARD_URL = `${AVA_BASE}/my/`;
export const AVA_CALENDAR_UPCOMING = `${AVA_BASE}/calendar/view.php?view=upcoming`;
export const AVA_CALENDAR_MONTH = `${AVA_BASE}/calendar/view.php?view=month`;

export const AVA_COURSES_URL = `${AVA_BASE}/my/courses.php`;

// ---- Disciplinas matriculadas ----
export interface EnrolledCourse {
  name: string;
  code: string;
  section: string;
  /** Preenchido dinamicamente ao scrape do dashboard ou fallback pré-configurado */
  moodleCourseId?: number;
  progress?: number;
}

export const ENROLLED_COURSES: EnrolledCourse[] = [
  {
    name: 'Pensamento Computacional',
    code: 'COM100',
    section: 'EP - Turma 001',
    moodleCourseId: 18871,
  },
  {
    name: 'Inteligência Artificial na Prática Acadêmica e Profissional',
    code: 'COM170',
    section: 'EP - DRP04 - Turma 004',
    moodleCourseId: 19092,
  },
  {
    name: 'Disciplina Paulista de Acessibilidade e Inclusão',
    code: 'DPA20262',
    section: 'Turma 001',
    moodleCourseId: 20106,
  },
  {
    name: 'Leitura e Produção de Textos',
    code: 'LET110',
    section: 'EP - Turma 001',
    moodleCourseId: 18894,
  },
  {
    name: 'Ética, Cidadania e Sociedade',
    code: 'SOC100',
    section: 'EP - Turma 001',
    moodleCourseId: 18882,
  },
];

// ---- Tipos de tarefa reconhecidos ----
export type ScrapedTaskType =
  | 'assignment'
  | 'quiz'
  | 'peer_review'
  | 'reading'
  | 'exam'
  | 'forum'
  | 'other';

// ---- Prioridades ----
export type Priority = 'P1_critical' | 'P2_high' | 'P3_normal' | 'P4_low';

// ---- Status ----
export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'submitted'
  | 'completed'
  | 'overdue'
  | 'cancelled';

// ---- Item extraído (antes de classificar/sync) ----
export interface ScrapedItem {
  /** ID único do Moodle (ex: "assign_12345", "quiz_678") */
  idMoodle: string;
  title: string;
  description?: string;
  courseName: string;
  courseCode: string;
  taskType: ScrapedTaskType;
  /** Data de início da atividade */
  startDate?: string;
  /** Prazo final (ISO string) — null se "sem prazo definido" */
  dueDate?: string;
  /** true se marcado como "sem prazo definido" */
  hasNoDeadline: boolean;
  /** Status detectado no site */
  status: TaskStatus;
  /** Se já foi entregue no site (confirmação explícita) */
  submittedAt?: string;
  /** Link direto no AVA */
  avaUrl: string;
  /** Avaliação entre pares: total de colegas para avaliar */
  peerReviewTotal?: number;
  /** Avaliação entre pares: quantos já avaliou */
  peerReviewDone?: number;
  /** Prova presencial: local/polo */
  examLocation?: string;
  /** Prova presencial: início do período */
  examPeriodStart?: string;
  /** Prova presencial: fim do período */
  examPeriodEnd?: string;
  /** Leitura: número da semana */
  weekNumber?: number;
  /** Dados brutos para debug */
  rawData?: Record<string, unknown>;
}

// ---- Modo de execução ----
export type ExecutionMode = 'morning' | 'evening';

// ---- Constantes de tempo (P1-P4) ----
export const PRIORITY_THRESHOLDS = {
  P1_HOURS: 24,        // vence em ≤24h
  P1_EXAM_HOURS: 48,   // prova em ≤48h
  P2_HOURS: 72,        // vence em ≤72h
  P2_EXAM_DAYS: 7,     // prova em ≤7 dias
  P3_DAYS: 14,         // vence em ≤14 dias
} as const;

// ---- Estimativas de tempo (em horas) ----
export const TIME_ESTIMATES: Record<ScrapedTaskType, number> = {
  assignment: 3,
  quiz: 2,
  peer_review: 0.5,
  reading: 1.5,
  exam: 6,
  forum: 1,
  other: 2,
};

// ---- Puppeteer ----
export const PUPPETEER_CONFIG = {
  headless: true,
  defaultViewport: { width: 1280, height: 800 },
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
  ],
  timeout: 30_000,
} as const;

// ---- Supabase ----
export function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error('SUPABASE_URL não configurado');
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurado');

  return { url, key };
}

export function getAvaCredentials() {
  const user = process.env.AVA_USER;
  const pass = process.env.AVA_PASS;

  if (!user || !pass) {
    throw new Error('AVA_USER e/ou AVA_PASS não configurados nas variáveis de ambiente');
  }

  return { user, pass };
}

export function getUserId(): string | undefined {
  return process.env.DAILYS_USER_ID || undefined;
}
