// ============================================================
// dailyS Academic Scraper — Orquestrador Principal
// ============================================================
// Fluxo:
//   1. Carrega env vars
//   2. Determina modo (morning/evening) por hora ou CLI arg
//   3. Puppeteer: reusar cookies → login se necessário
//   4. Scrape: dashboard → calendário → 5 disciplinas
//   5. Classifica prioridades P1-P4
//   6. Sincroniza com Supabase (dedup, detecção de mudanças)
//   7. Gera payload de notificação (manhã vs noite)
//   8. Fecha browser, loga resultado
//
// Uso:
//   node dist/index.js                  # auto-detecta modo pela hora
//   node dist/index.js --mode morning   # força modo manhã
//   node dist/index.js --mode evening   # força modo noite
//   node dist/index.js --dry-run        # scrape sem sync
// ============================================================

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootScraper = path.resolve(__dirname, '..');

dotenv.config({ path: path.resolve(rootScraper, '.env.local') });
dotenv.config({ path: path.resolve(rootScraper, '.env') });

import { authenticate, closeBrowser } from './auth.js';
import { scrapeDashboard } from './scrapers/dashboard.js';
import { scrapeCalendar } from './scrapers/calendar.js';
import { scrapeCourse } from './scrapers/course.js';
import { classifyItems } from './classifier.js';
import { syncToSupabase, recordLoginFailure } from './sync.js';
import { generateNotification } from './notifier.js';
import type { ExecutionMode, ScrapedItem } from './config.js';

// ---- Logger ----
function log(msg: string) {
  console.log(`\n[main] ${new Date().toISOString()} — ${msg}`);
}

function logSection(title: string) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${'═'.repeat(60)}`);
}

// ---- Determinar modo ----

function detectMode(): ExecutionMode {
  // CLI arg
  const args = process.argv.slice(2);
  const modeIdx = args.indexOf('--mode');
  if (modeIdx !== -1 && args[modeIdx + 1]) {
    const mode = args[modeIdx + 1];
    if (mode === 'morning' || mode === 'evening') return mode;
  }

  // Auto-detectar pela hora (BRT = UTC-3)
  const now = new Date();
  const brtHour = (now.getUTCHours() - 3 + 24) % 24;

  // Manhã: 05h-14h BRT → morning; restante → evening
  return brtHour >= 5 && brtHour < 14 ? 'morning' : 'evening';
}

function isDryRun(): boolean {
  return process.argv.includes('--dry-run');
}

// ---- Main ----

async function main() {
  const startTime = Date.now();
  const mode = detectMode();
  const dryRun = isDryRun();

  logSection(`dailyS Academic Scraper — ${mode.toUpperCase()} ${dryRun ? '(DRY RUN)' : ''}`);
  log(`Modo: ${mode} | Dry run: ${dryRun}`);
  log(`Hora BRT: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);

  // ---- 1. Autenticação ----
  logSection('1. Autenticação no AVA');
  const auth = await authenticate();

  if (!auth.success) {
    log(`❌ Falha na autenticação: ${auth.error}`);

    // Registrar falha sem sobrescrever dados
    if (!dryRun) {
      await recordLoginFailure(auth.error || 'Falha de login desconhecida');
    }

    if (auth.browser) await closeBrowser(auth.browser);
    process.exit(1);
  }

  const { browser, page } = auth;
  log('✅ Autenticado com sucesso');

  try {
    // ---- 2. Scrape Dashboard ----
    logSection('2. Scraping Dashboard');
    const dashboard = await scrapeDashboard(page);

    // ---- 3. Scrape Calendário ----
    logSection('3. Scraping Calendário');
    const calendarItems = await scrapeCalendar(page);

    // ---- 4. Scrape Disciplinas ----
    logSection('4. Scraping Disciplinas');
    const allItems: ScrapedItem[] = [...dashboard.examItems, ...calendarItems];

    for (const course of dashboard.courses) {
      if (!course.moodleCourseId) {
        log(`⏭ Pulando ${course.code} — ID não encontrado no dashboard`);
        continue;
      }
      const courseItems = await scrapeCourse(page, course);
      allItems.push(...courseItems);
    }

    // Deduplicar globalmente (por ID e por similaridade de Título)
    // Isso evita que um evento do calendário (status: pending) duplique uma atividade
    // da página da disciplina (que possui o status real de 'completed'/'submitted').
    const uniqueItemsMap = new Map<string, ScrapedItem>();

    for (const item of allItems) {
      let matchedExistingId: string | null = null;

      // 1. Tenta achar correspondência exata de ID
      if (uniqueItemsMap.has(item.idMoodle)) {
        matchedExistingId = item.idMoodle;
      } else {
        // 2. Tenta achar por título aproximado no mesmo curso
        const normalizedTitle = item.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const existing of uniqueItemsMap.values()) {
          if (existing.courseCode === item.courseCode) {
            const existingTitle = existing.title.toLowerCase().replace(/[^a-z0-9]/g, '');
            // Se as strings limpas forem iguais ou uma estiver contida na outra (com tamanho razoável)
            if (
              normalizedTitle === existingTitle ||
              (normalizedTitle.includes(existingTitle) && existingTitle.length > 5) ||
              (existingTitle.includes(normalizedTitle) && normalizedTitle.length > 5)
            ) {
              matchedExistingId = existing.idMoodle;
              break;
            }
          }
        }
      }

      if (!matchedExistingId) {
        uniqueItemsMap.set(item.idMoodle, item);
      } else {
        const existing = uniqueItemsMap.get(matchedExistingId)!;
        const isExistingCal = existing.idMoodle.startsWith('cal_');
        const isNewCourse = !item.idMoodle.startsWith('cal_') && !item.idMoodle.startsWith('exam_dashboard');

        if (isExistingCal && isNewCourse) {
          // Substitui item genérico de calendário pelo item real da disciplina
          uniqueItemsMap.delete(existing.idMoodle);
          uniqueItemsMap.set(item.idMoodle, item);
        } else if (item.status === 'completed' || item.status === 'submitted') {
          // Se o novo item tiver um status mais "evoluído", atualizamos o existente
          existing.status = item.status;
          if (item.submittedAt) existing.submittedAt = item.submittedAt;
        }
      }
    }

    const uniqueItems = Array.from(uniqueItemsMap.values());

    log(`Total de itens únicos extraídos: ${uniqueItems.length}`);

    // ---- 5. Classificação ----
    logSection('5. Classificação de Prioridades');
    const classifiedItems = classifyItems(uniqueItems);

    // Resumo por tipo
    const typeCount: Record<string, number> = {};
    for (const item of classifiedItems) {
      typeCount[item.taskType] = (typeCount[item.taskType] || 0) + 1;
    }
    log(`Por tipo: ${JSON.stringify(typeCount)}`);

    if (dryRun) {
      logSection('DRY RUN — Resultados (sem sync)');
      for (const item of classifiedItems) {
        console.log(`  [${item.priority}] ${item.courseCode} — ${item.title} (${item.taskType})`);
        if (item.dueDate) {
          console.log(`    📅 Prazo: ${new Date(item.dueDate).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
        }
        if (item.hasNoDeadline) {
          console.log(`    📅 Sem prazo definido`);
        }
        console.log(`    ⏱ Estimativa: ${item.estimatedHours}h`);
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      log(`Dry run concluído em ${elapsed}s`);
      return;
    }

    // ---- 6. Sincronização ----
    logSection('6. Sincronização com Supabase');
    const syncResult = await syncToSupabase(classifiedItems, mode, dashboard.courses.map(c => ({
      code: c.code,
      name: c.name,
      progress: c.progress || 0
    })));

    // ---- 7. Notificação ----
    logSection('7. Gerando Notificação');
    const notification = await generateNotification(classifiedItems, syncResult, mode);
    console.log(`\n${notification.summary}`);

    // ---- Resultado Final ----
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    logSection('Resultado Final');
    log(`Duração total: ${elapsed}s`);
    log(`Itens extraídos: ${uniqueItems.length}`);
    log(`Sync: +${syncResult.created} novos, ~${syncResult.updated} atualizados, =${syncResult.unchanged} inalterados, ✗${syncResult.errors} erros`);
    log(`Mudanças detectadas: ${syncResult.changes.length}`);
    log(`Notificação: ${notification.type}`);

  } catch (err) {
    log(`❌ Erro durante o scraping: ${err}`);

    if (!dryRun) {
      await recordLoginFailure(`Erro de scraping: ${err instanceof Error ? err.message : String(err)}`);
    }

    throw err;
  } finally {
    // ---- 8. Cleanup ----
    await closeBrowser(browser);
  }
}

// ---- Execução ----
main().catch((err) => {
  console.error('\n❌ Falha fatal:', err);
  process.exit(1);
});
