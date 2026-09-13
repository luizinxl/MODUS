// ============================================================
// dailyS Academic Scraper — Dashboard Scraper
// ============================================================
// Extrai do painel /my/:
//   - IDs reais das disciplinas no Moodle
//   - Avisos de período de provas presenciais
//   - Resumo geral de atividades pendentes
// ============================================================

import type { Page } from 'puppeteer';
import {
  AVA_DASHBOARD_URL,
  AVA_COURSES_URL,
  AVA_BASE,
  ENROLLED_COURSES,
  type EnrolledCourse,
  type ScrapedItem,
} from '../config.js';

function log(msg: string) {
  console.log(`[dashboard] ${new Date().toISOString()} — ${msg}`);
}

/** Resultado do scrape do dashboard */
export interface DashboardResult {
  /** Disciplinas com IDs do Moodle preenchidos */
  courses: EnrolledCourse[];
  /** Itens de prova presencial detectados no dashboard */
  examItems: ScrapedItem[];
  /** Avisos gerais encontrados */
  notices: string[];
}

/**
 * Extrai os IDs de curso do Moodle a partir da página de cursos do aluno.
 * O Moodle lista as disciplinas em /my/courses.php com links /course/view.php?id=NNN
 */
async function extractCourseIds(page: Page): Promise<EnrolledCourse[]> {
  const courses = [...ENROLLED_COURSES];

  try {
    log(`Acessando listagem de cursos: ${AVA_COURSES_URL}`);
    await page.goto(AVA_COURSES_URL, { waitUntil: 'networkidle2', timeout: 20_000 });
  } catch (err) {
    log(`Aviso ao acessar ${AVA_COURSES_URL}: ${err}`);
  }

  // Extrair todos os links de curso da página e seus progressos
  const courseLinks = await page.$$eval(
    'a[href*="course/view.php?id="]',
    (anchors) =>
      anchors.map((a) => {
        const container = a.closest('.card, .coursebox, .list-group-item') || a.parentElement;
        let progress = 0;
        if (container) {
          const progressEl = container.querySelector('.progress-bar, [role="progressbar"]');
          if (progressEl) {
            const val = progressEl.getAttribute('aria-valuenow');
            if (val) progress = parseInt(val, 10);
            else progress = parseInt((progressEl.textContent || '0').replace('%', ''), 10);
          }
        }
        return {
          href: a.getAttribute('href') || '',
          text: (a.textContent || '').trim(),
          progress: isNaN(progress) ? 0 : progress,
        };
      })
  );

  log(`Encontrados ${courseLinks.length} links de curso`);

  for (const course of courses) {
    // Tentar encontrar o link correspondente pelo código ou nome
    const match = courseLinks.find((link) => {
      const text = link.text.toLowerCase();
      return (
        text.includes(course.code.toLowerCase()) ||
        text.includes(course.name.toLowerCase().substring(0, 20))
      );
    });

    if (match) {
      const idMatch = match.href.match(/id=(\d+)/);
      if (idMatch) {
        course.moodleCourseId = parseInt(idMatch[1], 10);
        course.progress = match.progress;
        log(`  ✓ ${course.code} → id=${course.moodleCourseId}, progresso=${course.progress}%`);
      }
    } else if (course.moodleCourseId) {
      log(`  ℹ ${course.code} → usando fallback pré-configurado id=${course.moodleCourseId}`);
    } else {
      log(`  ✗ ${course.code} — não encontrado`);
    }
  }

  return courses;
}

/**
 * Detecta avisos de provas presenciais no dashboard.
 * Busca em banners, alertas e blocos informativos.
 */
async function extractExamNotices(page: Page): Promise<{
  items: ScrapedItem[];
  notices: string[];
}> {
  const items: ScrapedItem[] = [];
  const notices: string[] = [];

  // Buscar blocos de aviso/alerta no dashboard
  const alertTexts = await page.$$eval(
    '.alert, .block_html, .card-body, .course-info-container, [class*="notice"], [class*="announcement"]',
    (elements) =>
      elements.map((el) => ({
        text: (el.textContent || '').trim(),
        html: el.innerHTML || '',
      }))
  );

  for (const alert of alertTexts) {
    const text = alert.text.toLowerCase();

    // Detectar menções a provas presenciais
    if (
      text.includes('prova') ||
      text.includes('avaliação presencial') ||
      text.includes('exame') ||
      text.includes('período de provas')
    ) {
      notices.push(alert.text.substring(0, 500));

      // Tentar extrair datas do texto
      const datePattern = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g;
      const dates = [...alert.text.matchAll(datePattern)];

      if (dates.length >= 1) {
        const startDate = dates[0];
        const endDate = dates.length >= 2 ? dates[1] : null;

        // Extrair polo se mencionado
        const poloMatch = alert.text.match(/polo[:\s]+([^\n,]+)/i);

        items.push({
          idMoodle: `exam_dashboard_${Date.now()}`,
          title: 'Prova Presencial',
          description: alert.text.substring(0, 300),
          courseName: 'Geral',
          courseCode: 'GERAL',
          taskType: 'exam',
          hasNoDeadline: false,
          status: 'pending',
          avaUrl: AVA_DASHBOARD_URL,
          examLocation: poloMatch ? poloMatch[1].trim() : undefined,
          examPeriodStart: startDate
            ? formatBrDate(startDate[1], startDate[2], startDate[3])
            : undefined,
          examPeriodEnd: endDate
            ? formatBrDate(endDate[1], endDate[2], endDate[3])
            : undefined,
          rawData: { source: 'dashboard_alert', originalText: alert.text.substring(0, 500) },
        });
      }
    }
  }

  log(`Detectados ${items.length} avisos de prova e ${notices.length} avisos gerais`);
  return { items, notices };
}

/** Converte data BR (dd/mm/yyyy) para ISO */
function formatBrDate(day: string, month: string, year: string): string {
  const y = year.length === 2 ? `20${year}` : year;
  return `${y}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00.000Z`;
}

/**
 * Scrape principal do dashboard.
 */
export async function scrapeDashboard(page: Page): Promise<DashboardResult> {
  log('Acessando dashboard...');
  await page.goto(AVA_DASHBOARD_URL, { waitUntil: 'networkidle2', timeout: 30_000 });

  // Aguardar carregamento do conteúdo
  await page.waitForSelector('body', { timeout: 10_000 });

  // Extrair IDs das disciplinas
  const courses = await extractCourseIds(page);

  // Extrair avisos de prova
  const { items: examItems, notices } = await extractExamNotices(page);

  const foundCount = courses.filter((c) => c.moodleCourseId).length;
  log(`Dashboard concluído: ${foundCount}/${courses.length} disciplinas mapeadas`);

  return { courses, examItems, notices };
}
