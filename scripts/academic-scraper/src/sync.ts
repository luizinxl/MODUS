// ============================================================
// dailyS Academic Scraper — Sincronização com Supabase
// ============================================================
// Upsert em academic_tasks via id_moodle.
// Detecta mudanças (prazo alterado, status mudou).
// Registra em sync_logs.
// NUNCA sobrescreve status 'completed' sem confirmação do site.
// ============================================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig, getUserId, type ExecutionMode } from './config.js';
import type { ClassifiedItem } from './classifier.js';

function log(msg: string) {
  console.log(`[sync] ${new Date().toISOString()} — ${msg}`);
}

// ---- Tipos de resultado ----
export interface SyncResult {
  created: number;
  updated: number;
  unchanged: number;
  errors: number;
  changes: ChangeRecord[];
  courses?: { code: string; name: string; progress: number }[];
}

export interface ChangeRecord {
  idMoodle: string;
  title: string;
  courseCode: string;
  changeType: 'new' | 'deadline_changed' | 'status_changed' | 'details_updated';
  oldValue?: string;
  newValue?: string;
}

// ---- Supabase row shape ----
interface AcademicTaskRow {
  id: string;
  id_moodle: string;
  user_id: string;
  title: string;
  description: string | null;
  course: string;
  course_code: string | null;
  task_type: string | null;
  task_subtype: string | null;
  status: string;
  start_date: string | null;
  due_date: string | null;
  has_no_deadline: boolean;
  submitted_at: string | null;
  priority: string | null;
  priority_score: number | null;
  estimated_hours: number | null;
  ava_url: string | null;
  peer_review_total: number | null;
  peer_review_done: number | null;
  exam_location: string | null;
  exam_period_start: string | null;
  exam_period_end: string | null;
  week_number: number | null;
  submission_link: string | null;
  synced_at: string | null;
  moodle_status: string | null;
  last_change_detected_at: string | null;
  raw_scraped_data: Record<string, unknown> | null;
}

/** Inicializa cliente Supabase com service role key (backend) */
function getSupabaseClient(): SupabaseClient {
  const { url, key } = getSupabaseConfig();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Converte ClassifiedItem para row do Supabase */
function itemToRow(item: ClassifiedItem, userId?: string): Partial<AcademicTaskRow> {
  const now = new Date().toISOString();

  const row: Partial<AcademicTaskRow> = {
    id_moodle: item.idMoodle,
    title: item.title,
    description: item.description || null,
    course: item.courseName,
    course_code: item.courseCode,
    task_type: item.taskType,
    task_subtype: item.taskType === 'peer_review' ? 'peer_review'
      : item.taskType === 'reading' ? 'reading'
      : item.taskType === 'exam' ? 'exam'
      : null,
    status: item.status,
    start_date: item.startDate || null,
    due_date: item.dueDate || null,
    has_no_deadline: item.hasNoDeadline,
    submitted_at: item.submittedAt || null,
    priority: item.priority,
    priority_score: item.priorityScore,
    estimated_hours: item.estimatedHours,
    ava_url: item.avaUrl || null,
    submission_link: item.avaUrl || null,
    peer_review_total: item.peerReviewTotal ?? null,
    peer_review_done: item.peerReviewDone ?? null,
    exam_location: item.examLocation || null,
    exam_period_start: item.examPeriodStart || null,
    exam_period_end: item.examPeriodEnd || null,
    week_number: item.weekNumber ?? null,
    synced_at: now,
    moodle_status: item.status === 'submitted' ? 'submitted' : item.status === 'completed' ? 'closed' : 'open',
    raw_scraped_data: item.rawData || null,
  };

  if (userId) {
    row.user_id = userId;
  }

  return row;
}

/** Detecta mudanças entre a row existente e os novos dados */
function detectChanges(
  existing: AcademicTaskRow,
  incoming: Partial<AcademicTaskRow>,
  item: ClassifiedItem
): ChangeRecord | null {
  // Prazo alterado
  if (existing.due_date && incoming.due_date && existing.due_date !== incoming.due_date) {
    return {
      idMoodle: item.idMoodle,
      title: item.title,
      courseCode: item.courseCode,
      changeType: 'deadline_changed',
      oldValue: existing.due_date,
      newValue: incoming.due_date,
    };
  }

  // Status mudou
  if (existing.status !== incoming.status) {
    return {
      idMoodle: item.idMoodle,
      title: item.title,
      courseCode: item.courseCode,
      changeType: 'status_changed',
      oldValue: existing.status,
      newValue: incoming.status || undefined,
    };
  }

  // Peer review: contagens mudaram
  if (
    item.taskType === 'peer_review' &&
    (existing.peer_review_done !== incoming.peer_review_done ||
      existing.peer_review_total !== incoming.peer_review_total)
  ) {
    return {
      idMoodle: item.idMoodle,
      title: item.title,
      courseCode: item.courseCode,
      changeType: 'details_updated',
      oldValue: `${existing.peer_review_done}/${existing.peer_review_total}`,
      newValue: `${incoming.peer_review_done}/${incoming.peer_review_total}`,
    };
  }

  return null;
}

/**
 * Sincroniza itens classificados com o Supabase.
 * Deduplicação via id_moodle, detecção de mudanças, proteção de status.
 */
export async function syncToSupabase(
  items: ClassifiedItem[],
  mode: ExecutionMode,
  courses?: { code: string; name: string; progress: number }[]
): Promise<SyncResult> {
  const supabase = getSupabaseClient();
  const userId = getUserId();
  const now = new Date().toISOString();

  const result: SyncResult = {
    created: 0,
    updated: 0,
    unchanged: 0,
    errors: 0,
    changes: [],
    courses,
  };

  log(`Sincronizando ${items.length} itens (modo: ${mode})...`);

  // Buscar todos os itens existentes para comparação
  let fetchQuery = supabase.from('academic_tasks').select('*');
  if (userId) {
    fetchQuery = fetchQuery.eq('user_id', userId);
  }
  const { data: existingRows, error: fetchErr } = await fetchQuery;

  if (fetchErr) {
    log(`ERRO ao buscar tarefas existentes: ${fetchErr.message}`);
    result.errors++;
    return result;
  }

  const existingMap = new Map<string, AcademicTaskRow>(
    (existingRows || []).map((row: AcademicTaskRow) => [row.id_moodle, row])
  );

  for (const item of items) {
    try {
      const row = itemToRow(item, userId);
      const existing = existingMap.get(item.idMoodle);

      if (existing) {
        // ---- REGRA: nunca reverter 'completed' sem confirmação do site ----
        if (
          existing.status === 'completed' &&
          item.status !== 'completed' &&
          item.status !== 'submitted'
        ) {
          log(`  ⚠ ${item.idMoodle}: protegendo status 'completed' existente (site diz '${item.status}')`);
          // Não alterar o status, mas atualizar outros campos
          delete row.status;
          delete row.moodle_status;
        }

        // Detectar mudanças
        const change = detectChanges(existing, row, item);
        if (change) {
          result.changes.push(change);
          row.last_change_detected_at = now;
          log(`  Δ ${item.courseCode}/${item.title}: ${change.changeType} (${change.oldValue} → ${change.newValue})`);
        }

        // Atualizar
        const { error: updateErr } = await supabase
          .from('academic_tasks')
          .update(row)
          .eq('id', existing.id);

        if (updateErr) {
          log(`  ✗ Erro ao atualizar ${item.idMoodle}: ${updateErr.message}`);
          result.errors++;
        } else if (change) {
          result.updated++;
        } else {
          result.unchanged++;
        }
      } else {
        // Novo item — inserir
        result.changes.push({
          idMoodle: item.idMoodle,
          title: item.title,
          courseCode: item.courseCode,
          changeType: 'new',
        });

        const { error: insertErr } = await supabase
          .from('academic_tasks')
          .insert(row);

        if (insertErr) {
          log(`  ✗ Erro ao inserir ${item.idMoodle}: ${insertErr.message}`);
          result.errors++;
        } else {
          result.created++;
          log(`  + ${item.courseCode}/${item.title} (${item.priority})`);
        }
      }
    } catch (err) {
      log(`  ✗ Erro inesperado para ${item.idMoodle}: ${err}`);
      result.errors++;
    }
  }

  // Atualizar sync state
  await updateSyncState(supabase, userId, mode, result);

  // Registrar sync log
  await recordSyncLog(supabase, userId, result);

  log(`Sync concluído: +${result.created} ~${result.updated} =${result.unchanged} ✗${result.errors}`);
  return result;
}

/** Atualiza academic_sync_state */
async function updateSyncState(
  supabase: SupabaseClient,
  userId: string | undefined,
  mode: ExecutionMode,
  result: SyncResult
): Promise<void> {
  const now = new Date().toISOString();

  const stateUpdate: Record<string, unknown> = {
    last_login_success: true,
    last_error: null,
    updated_at: now,
  };

  if (userId) {
    stateUpdate.user_id = userId;
  }

  if (mode === 'morning') {
    stateUpdate.last_morning_sync = now;
  } else {
    stateUpdate.last_evening_sync = now;
  }
  
  // Sempre salvar o payload no last_morning_payload para que o frontend tenha os dados mais recentes 
  // (incluindo o progresso dos cursos), independente do modo de execução.
  stateUpdate.last_morning_payload = JSON.stringify(result);

  try {
    const { data: existing } = await supabase
      .from('academic_sync_state')
      .select('id')
      .limit(1);

    if (existing && existing.length > 0) {
      await supabase
        .from('academic_sync_state')
        .update(stateUpdate)
        .eq('id', existing[0].id);
    } else {
      await supabase
        .from('academic_sync_state')
        .insert(stateUpdate);
    }
  } catch (err: any) {
    log(`⚠ Erro ao atualizar sync_state: ${err?.message || err}`);
  }
}

/** Registra log de sync */
async function recordSyncLog(
  supabase: SupabaseClient,
  userId: string | undefined,
  result: SyncResult
): Promise<void> {
  try {
    await supabase.from('sync_logs').insert({
      user_id: userId || null,
      source: 'moodle',
      module: 'academic',
      sync_type: 'incremental',
      status: result.errors > 0 ? 'partial' : 'success',
      items_processed: result.created + result.updated + result.unchanged + result.errors,
      items_created: result.created,
      items_updated: result.updated,
      items_deleted: 0,
      error_message: result.errors > 0 ? `${result.errors} erros durante o sync` : null,
      duration_seconds: 0,
    });
  } catch {
    // sync_logs é opcional se a tabela ainda não tiver sido criada
  }
}

/** Registra falha de login no sync state (sem sobrescrever dados) */
export async function recordLoginFailure(errorMessage: string): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const userId = getUserId();
    const now = new Date().toISOString();

    const stateUpdate: Record<string, unknown> = {
      last_login_success: false,
      last_error: errorMessage,
      updated_at: now,
    };

    if (userId) {
      stateUpdate.user_id = userId;
    }

    const { data: existing } = await supabase
      .from('academic_sync_state')
      .select('id')
      .limit(1);

    if (existing && existing.length > 0) {
      await supabase
        .from('academic_sync_state')
        .update(stateUpdate)
        .eq('id', existing[0].id);
    } else {
      await supabase
        .from('academic_sync_state')
        .insert(stateUpdate);
    }

    log(`Falha de login registrada: ${errorMessage}`);
  } catch (err) {
    log(`ERRO ao registrar falha de login: ${err}`);
  }
}
