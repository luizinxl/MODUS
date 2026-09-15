// ============================================================
// MODUS — Serviço de Dados Acadêmicos (Frontend)
// ============================================================
// Lê academic_tasks e academic_sync_state do Supabase.
// Usado pelo hook useAcademic para alimentar a UI.
// ============================================================

import { supabase } from '@/config/supabase';
import type { AcademicTask, AcademicSyncState, AcademicTaskType } from '@/types';

export interface AcademicFilters {
  courseCode?: string;
  taskType?: AcademicTaskType;
  priority?: string;
  status?: string;
  /** Se true, inclui tarefas concluídas e canceladas */
  includeCompleted?: boolean;
}

/**
 * Busca todas as tarefas acadêmicas do usuário.
 */
export async function fetchAcademicTasks(
  filters?: AcademicFilters
): Promise<AcademicTask[]> {
  let query = supabase
    .from('academic_tasks')
    .select('*')
    .order('due_date', { ascending: true, nullsFirst: false });

  if (filters?.courseCode) {
    query = query.eq('course_code', filters.courseCode);
  }
  if (filters?.taskType) {
    query = query.eq('task_type', filters.taskType);
  }
  if (filters?.priority) {
    query = query.eq('priority', filters.priority);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (!filters?.includeCompleted) {
    query = query.not('status', 'in', '("completed","cancelled")');
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Erro ao buscar tarefas acadêmicas: ${error.message}`);
  }

  return (data ?? []) as AcademicTask[];
}

/**
 * Busca tarefas de um dia específico (para o painel do calendário).
 */
export async function fetchTasksByDate(date: string): Promise<AcademicTask[]> {
  // Buscar tarefas que vencem nesse dia, começam nesse dia, ou têm prova nesse período.
  //
  // IMPORTANTE: cada intervalo de data precisa ser agrupado com and(...) dentro do
  // .or() do PostgREST. Sem o and(), "due_date.gte.X,due_date.lte.Y" vira duas
  // condições OR independentes (devido >= X **ou** devido <= Y), o que casa com
  // praticamente qualquer tarefa que tenha due_date — por isso clicar em qualquer
  // dia mostrava as atividades de todos os dias.
  const { data, error } = await supabase
    .from('academic_tasks')
    .select('*')
    .or(
      `and(due_date.gte.${date}T00:00:00,due_date.lte.${date}T23:59:59),` +
      `and(start_date.gte.${date}T00:00:00,start_date.lte.${date}T23:59:59),` +
      `and(exam_period_start.lte.${date},exam_period_end.gte.${date})`
    )
    .order('due_date', { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar tarefas por data: ${error.message}`);
  }

  return (data ?? []) as AcademicTask[];
}

/**
 * Busca o estado de sincronização do scraper.
 */
export async function fetchSyncState(): Promise<AcademicSyncState | null> {
  const { data, error } = await supabase
    .from('academic_sync_state')
    .select('*')
    .maybeSingle();

  if (error) {
    console.warn('[academicService] Erro ao buscar sync_state:', error.message);
    return null;
  }

  return data as AcademicSyncState | null;
}

/**
 * Retorna um mapa de datas → tipos de evento para renderizar
 * pontos coloridos no calendário.
 */
export interface CalendarDayInfo {
  date: string; // YYYY-MM-DD
  hasDeadline: boolean;
  hasPeerReview: boolean;
  hasStart: boolean;
  hasExam: boolean;
  isExamPeriod: boolean;
  taskCount: number;
}

export async function fetchCalendarMonth(
  year: number,
  month: number
): Promise<CalendarDayInfo[]> {
  const lastDay = new Date(year, month, 0).getDate();
  const monthStr = String(month).padStart(2, '0');
  const startDate = `${year}-${monthStr}-01`;
  const endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

  // Mesmo cuidado do fetchTasksByDate: cada faixa precisa do próprio and(...),
  // senão o OR "solto" faz o mês inteiro casar com quase todas as tarefas.
  const { data, error } = await supabase
    .from('academic_tasks')
    .select('due_date, start_date, task_type, task_subtype, exam_period_start, exam_period_end, status')
    .or(
      `and(due_date.gte.${startDate},due_date.lte.${endDate}T23:59:59),` +
      `and(start_date.gte.${startDate},start_date.lte.${endDate}T23:59:59),` +
      `and(exam_period_start.lte.${endDate},exam_period_end.gte.${startDate})`
    )
    .not('status', 'eq', 'cancelled');

  if (error) {
    throw new Error(`Erro ao buscar calendário: ${error.message}`);
  }

  // Agregar por dia
  const dayMap = new Map<string, CalendarDayInfo>();

  const getOrCreate = (dateStr: string): CalendarDayInfo => {
    const key = dateStr.substring(0, 10); // YYYY-MM-DD
    if (!dayMap.has(key)) {
      dayMap.set(key, {
        date: key,
        hasDeadline: false,
        hasPeerReview: false,
        hasStart: false,
        hasExam: false,
        isExamPeriod: false,
        taskCount: 0,
      });
    }
    return dayMap.get(key)!;
  };

  for (const task of (data ?? []) as AcademicTask[]) {
    // Prazo
    if (task.due_date) {
      const day = getOrCreate(task.due_date);
      day.hasDeadline = true;
      day.taskCount++;
    }

    // Início
    if (task.start_date) {
      const day = getOrCreate(task.start_date);
      day.hasStart = true;
    }

    // Peer review
    if (task.task_type === 'peer_review' || task.task_subtype === 'peer_review') {
      if (task.due_date) {
        const day = getOrCreate(task.due_date);
        day.hasPeerReview = true;
      }
    }

    // Prova presencial
    if (task.task_type === 'exam' || task.task_subtype === 'exam') {
      if (task.due_date) {
        const day = getOrCreate(task.due_date);
        day.hasExam = true;
      }

      // Período de prova (faixa contínua)
      if (task.exam_period_start && task.exam_period_end) {
        const start = new Date(task.exam_period_start);
        const end = new Date(task.exam_period_end);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
          const current = new Date(start);
          while (current <= end) {
            const key = current.toISOString().substring(0, 10);
            const day = getOrCreate(key);
            day.isExamPeriod = true;
            day.hasExam = true;
            current.setDate(current.getDate() + 1);
          }
        }
      }

    }
  }

  return Array.from(dayMap.values());
}
