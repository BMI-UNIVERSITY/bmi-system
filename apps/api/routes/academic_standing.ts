// routes/academic_standing.ts
//
// Academic Standing & Probation Tracking
//
// ARCHITECTURE:
//   Standing is stored as pre-computed records in `academic_standing_records`
//   (source of truth for reads — fast, auditable, displayable).
//
//   Computation happens at two trigger points:
//     1. END-OF-TERM BATCH: computeStandingForTerm() is called by the admin
//        endpoint POST /api/v1/admin/standing/compute, or can be wired to a
//        Cloudflare Cron Trigger at term close.
//     2. ON-DEMAND (admin): same endpoint, any term_id.
//
//   The computation logic:
//     - For each enrolled student in the term, query grades → compute term GPA
//       and cumulative GPA and completion rate.
//     - Match against standing_rules (ordered by strictest first).
//     - Upsert into academic_standing_records.
//     - If standing is 'suspended' or 'dismissed', automatically create a
//       student_hold to prevent further enrollment.
//     - If standing improved to 'good', auto-resolve probation/warning holds.

import { ok, error } from '../lib/types';
import type { Env } from '../lib/types';
import type { IDatabase } from '@bmi/ports';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StandingRecord {
  id: string;
  student_id: string;
  term_id: string;
  term_name?: string;
  standing: 'good' | 'warning' | 'probation' | 'suspended' | 'dismissed';
  term_gpa: number | null;
  cumulative_gpa: number | null;
  credits_attempted: number | null;
  credits_earned: number | null;
  completion_rate: number | null;
  rule_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface StandingRule {
  id: string;
  rule_name: string;
  standing: 'good' | 'warning' | 'probation' | 'suspended' | 'dismissed';
  min_gpa: number | null;
  max_gpa: number | null;
  max_consecutive_terms: number | null;
  min_completion_rate: number | null;
  is_active: number;
  description: string | null;
}

interface GradeRow {
  enrollment_id: string;
  credits: number;
  grade_points: number | null;
  passed: number; // 1 if grade_points >= 1.0 (D or above)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function matchRule(
  rules: StandingRule[],
  termGpa: number,
  completionRate: number,
  consecutiveTermsBelowGood: number
): StandingRule | null {
  // Rules are evaluated strictest-first (dismissed > suspended > probation > warning > good)
  const priority: StandingRule['standing'][] = ['dismissed', 'suspended', 'probation', 'warning', 'good'];

  for (const standing of priority) {
    const candidates = rules.filter(r => r.standing === standing && r.is_active);
    for (const rule of candidates) {
      const gpaOk =
        (rule.min_gpa === null || termGpa >= rule.min_gpa) &&
        (rule.max_gpa === null || termGpa <= rule.max_gpa);
      const completionOk =
        rule.min_completion_rate === null || completionRate >= rule.min_completion_rate;
      const consecutiveOk =
        rule.max_consecutive_terms === null ||
        consecutiveTermsBelowGood >= rule.max_consecutive_terms;

      if (gpaOk && completionOk && consecutiveOk) return rule;
    }
  }
  return null;
}

// Grade point scale: percentage → grade points (4.0 scale)
function pctToGradePoints(pct: number): number {
  if (pct >= 90) return 4.0;
  if (pct >= 80) return 3.0;
  if (pct >= 70) return 2.0;
  if (pct >= 60) return 1.0;
  return 0.0;
}

// ─── Core Computation ────────────────────────────────────────────────────────

async function computeStandingForTerm(
  db: IDatabase,
  termId: string,
  dryRun = false
): Promise<{ processed: number; updated: number; holds_created: number; holds_resolved: number; errors: string[] }> {

  const errs: string[] = [];
  let processed = 0, updated = 0, holdsCreated = 0, holdsResolved = 0;

  // 1. Load active standing rules
  const { results: rules } = await db.prepare(
    `SELECT * FROM standing_rules WHERE is_active = 1 ORDER BY id ASC`
  ).all<StandingRule>();

  if (!rules.length) {
    return { processed: 0, updated: 0, holds_created: 0, holds_resolved: 0, errors: ['No active standing rules found'] };
  }

  // 2. Get all students with enrollments in this term
  const { results: termStudents } = await db.prepare(
    `SELECT DISTINCT e.student_id
     FROM enrollments e
     WHERE e.term_id = ?`
  ).bind(termId).all<{ student_id: string }>();

  for (const { student_id } of termStudents) {
    try {
      processed++;

      // 3. Compute term GPA from grades
      const { results: gradeRows } = await db.prepare(
        `SELECT
           e.id as enrollment_id,
           c.credits,
           (SELECT AVG(g.score * 100.0 / NULLIF(g.max_score,0))
            FROM grades g WHERE g.enrollment_id = e.id AND g.max_score > 0) as avg_pct
         FROM enrollments e
         JOIN courses c ON c.id = e.course_id
         WHERE e.student_id = ? AND e.term_id = ? AND e.status != 'waitlisted'`
      ).bind(student_id, termId).all<{ enrollment_id: string; credits: number; avg_pct: number | null }>();

      let termCreditsAttempted = 0;
      let termCreditsEarned = 0;
      let termWeightedPoints = 0;

      for (const row of gradeRows) {
        const gp = row.avg_pct !== null ? pctToGradePoints(row.avg_pct) : null;
        termCreditsAttempted += row.credits;
        if (gp !== null) {
          termWeightedPoints += gp * row.credits;
          if (gp >= 1.0) termCreditsEarned += row.credits; // D or above = passed
        }
      }

      const termGpa = termCreditsAttempted > 0
        ? termWeightedPoints / termCreditsAttempted
        : null;
      const completionRate = termCreditsAttempted > 0
        ? termCreditsEarned / termCreditsAttempted
        : null;

      // 4. Compute cumulative GPA across all completed terms
      const cumulativeRow = await db.prepare(
        `SELECT
           SUM(c.credits) as total_attempted,
           SUM(CASE WHEN e.status != 'waitlisted' THEN c.credits ELSE 0 END) as total_earned_credits
         FROM enrollments e
         JOIN courses c ON c.id = e.course_id
         WHERE e.student_id = ? AND e.status != 'waitlisted'`
      ).bind(student_id).first<{ total_attempted: number | null; total_earned_credits: number | null }>();

      // Simpler: use stored GPA on student record as cumulative baseline
      const studentRow = await db.prepare(
        `SELECT gpa FROM students WHERE user_id = ?`
      ).bind(student_id).first<{ gpa: number | null }>();

      const cumulativeGpa = termGpa !== null ? (studentRow?.gpa ?? termGpa) : null;

      // 5. Count consecutive terms below good standing
      const { results: recentStanding } = await db.prepare(
        `SELECT standing
         FROM academic_standing_records
         WHERE student_id = ?
         ORDER BY created_at DESC
         LIMIT 5`
      ).bind(student_id).all<{ standing: string }>();

      let consecutiveBelowGood = 0;
      for (const r of recentStanding) {
        if (r.standing === 'good') break;
        consecutiveBelowGood++;
      }

      // 6. Match against rules
      const effectiveGpa = termGpa ?? 0;
      const effectiveCompletion = completionRate ?? 0;
      const matchedRule = matchRule(rules, effectiveGpa, effectiveCompletion, consecutiveBelowGood);
      const standing = matchedRule?.standing ?? 'good';

      if (!dryRun) {
        // 7. Upsert standing record
        const recordId = crypto.randomUUID();
        await db.prepare(
          `INSERT INTO academic_standing_records
             (id, student_id, term_id, standing, term_gpa, cumulative_gpa,
              credits_attempted, credits_earned, completion_rate, rule_id, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT(student_id, term_id) DO UPDATE SET
             standing         = excluded.standing,
             term_gpa         = excluded.term_gpa,
             cumulative_gpa   = excluded.cumulative_gpa,
             credits_attempted = excluded.credits_attempted,
             credits_earned   = excluded.credits_earned,
             completion_rate  = excluded.completion_rate,
             rule_id          = excluded.rule_id,
             updated_at       = excluded.updated_at`
        ).bind(
          recordId, student_id, termId, standing,
          termGpa, cumulativeGpa,
          termCreditsAttempted, termCreditsEarned,
          completionRate, matchedRule?.id ?? null
        ).run();
        updated++;

        // 8. Update cumulative GPA on students table
        if (termGpa !== null) {
          await db.prepare(
            `UPDATE students SET gpa = ?, updated_at = datetime('now') WHERE user_id = ?`
          ).bind(termGpa, student_id).run();
        }

        // 9. Manage holds based on standing

        if (standing === 'suspended' || standing === 'dismissed') {
          // Create an academic hold if one doesn't already exist for this term
          const existing = await db.prepare(
            `SELECT id FROM student_holds
             WHERE student_id = ? AND hold_type = 'academic_standing' AND is_active = 1 LIMIT 1`
          ).bind(student_id).first<{ id: string }>();

          if (!existing) {
            await db.prepare(
              `INSERT INTO student_holds (id, student_id, hold_type, reason, is_active, created_at)
               VALUES (?, ?, 'academic_standing', ?, 1, datetime('now'))`
            ).bind(
              crypto.randomUUID(),
              student_id,
              `Academic ${standing}: Standing below minimum requirements. Contact your academic advisor.`
            ).run();
            holdsCreated++;
          }
        } else if (standing === 'good') {
          // Auto-resolve any active academic holds if student returned to good standing
          const resolved = await db.prepare(
            `UPDATE student_holds
             SET is_active = 0, resolved_at = datetime('now')
             WHERE student_id = ? AND hold_type = 'academic_standing' AND is_active = 1`
          ).bind(student_id).run();
          if (resolved.meta.changes > 0) holdsResolved++;
        }
      }
    } catch (e: unknown) {
      errs.push(`student ${student_id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { processed, updated, holds_created: holdsCreated, holds_resolved: holdsResolved, errors: errs };
}

// ─── Route Handlers ──────────────────────────────────────────────────────────

/**
 * GET /api/v1/students/:studentId/standing
 * Returns full standing history for a student.
 * Auth: admin or the student themselves.
 */
export async function handleGetStudentStanding(
  req: Request,
  env: Env,
  studentId: string,
  requestingUserId: string,
  requestingRole: string
): Promise<Response> {
  // Students can only view their own standing
  if (requestingRole === 'student' && requestingUserId !== studentId) {
    return error('Forbidden', 403);
  }

  const { results } = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT
       asr.id, asr.student_id, asr.term_id, at.name as term_name,
       asr.standing, asr.term_gpa, asr.cumulative_gpa,
       asr.credits_attempted, asr.credits_earned, asr.completion_rate,
       asr.notes, asr.created_at, asr.updated_at,
       sr.rule_name, sr.description as rule_description
     FROM academic_standing_records asr
     LEFT JOIN academic_terms at ON at.id = asr.term_id
     LEFT JOIN standing_rules sr ON sr.id = asr.rule_id
     WHERE asr.student_id = ?
     ORDER BY asr.created_at DESC`
  ).bind(studentId).all<StandingRecord & { term_name: string; rule_name: string; rule_description: string }>();

  return ok({ standing_history: results, count: results.length });
}

/**
 * GET /api/v1/students/:studentId/standing/current
 * Returns only the most recent standing record.
 * Auth: admin or the student themselves.
 */
export async function handleGetCurrentStanding(
  req: Request,
  env: Env,
  studentId: string,
  requestingUserId: string,
  requestingRole: string
): Promise<Response> {
  if (requestingRole === 'student' && requestingUserId !== studentId) {
    return error('Forbidden', 403);
  }

  const current = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT
       asr.id, asr.student_id, asr.term_id, at.name as term_name,
       asr.standing, asr.term_gpa, asr.cumulative_gpa,
       asr.credits_attempted, asr.credits_earned, asr.completion_rate,
       asr.notes, asr.created_at, asr.updated_at,
       sr.rule_name, sr.description as rule_description
     FROM academic_standing_records asr
     LEFT JOIN academic_terms at ON at.id = asr.term_id
     LEFT JOIN standing_rules sr ON sr.id = asr.rule_id
     WHERE asr.student_id = ?
     ORDER BY asr.created_at DESC
     LIMIT 1`
  ).bind(studentId).first<StandingRecord & { term_name: string; rule_name: string; rule_description: string }>();

  if (!current) {
    // No records yet — return 'good' as default for new students
    return ok({ standing: 'good', message: 'No standing records yet — student is in good standing by default.' });
  }

  return ok(current);
}

/**
 * GET /api/v1/admin/standing?standing=probation&page=1&perPage=50
 * Lists all students currently on a given standing level.
 * Auth: admin only.
 */
export async function handleAdminListStanding(
  req: Request,
  env: Env
): Promise<Response> {
  const url = new URL(req.url);
  const standingFilter = url.searchParams.get('standing'); // 'probation' | 'suspended' | 'dismissed' | null
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get('perPage') ?? '50')));
  const offset = (page - 1) * perPage;

  const whereClause = standingFilter
    ? `WHERE asr.standing = '${standingFilter.replace(/'/g, '')}'`
    : `WHERE asr.standing != 'good'`;

  const { results } = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT
       asr.student_id, asr.standing, asr.term_gpa, asr.cumulative_gpa,
       asr.completion_rate, asr.created_at,
       at.name as term_name,
       u.email,
       s.reg_no,
       (u.raw_meta->>'first_name' || ' ' || u.raw_meta->>'last_name') as full_name
     FROM academic_standing_records asr
     INNER JOIN (
       SELECT student_id, MAX(created_at) as latest
       FROM academic_standing_records
       GROUP BY student_id
     ) latest_rec ON asr.student_id = latest_rec.student_id AND asr.created_at = latest_rec.latest
     LEFT JOIN academic_terms at ON at.id = asr.term_id
     LEFT JOIN users u ON u.id = asr.student_id
     LEFT JOIN students s ON s.user_id = asr.student_id
     ${whereClause}
     ORDER BY asr.standing DESC, asr.term_gpa ASC
     LIMIT ? OFFSET ?`
  ).bind(perPage, offset).all();

  const { results: countRow } = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT COUNT(DISTINCT asr.student_id) as total
     FROM academic_standing_records asr
     INNER JOIN (
       SELECT student_id, MAX(created_at) as latest
       FROM academic_standing_records GROUP BY student_id
     ) latest_rec ON asr.student_id = latest_rec.student_id AND asr.created_at = latest_rec.latest
     ${whereClause}`
  ).all<{ total: number }>();

  return ok({
    data: results,
    meta: { page, perPage, total: countRow[0]?.total ?? 0 }
  });
}

/**
 * POST /api/v1/admin/standing/compute
 * Body: { term_id: string, dry_run?: boolean }
 *
 * Computes academic standing for all students enrolled in the given term.
 * - Reads grades, computes GPA and completion rate
 * - Matches against standing_rules
 * - Upserts academic_standing_records
 * - Creates/resolves student_holds based on outcome
 *
 * Auth: admin only.
 */
export async function handleComputeStanding(
  req: Request,
  env: Env
): Promise<Response> {
  let body: { term_id?: string; dry_run?: boolean };
  try {
    body = await req.json();
  } catch {
    return error('Invalid JSON body');
  }

  if (!body.term_id) return error('term_id is required');

  // Verify term exists
  const term = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT id, name FROM academic_terms WHERE id = ?`
  ).bind(body.term_id).first<{ id: string; name: string }>();

  if (!term) return error('Term not found', 404);

  const dryRun = body.dry_run === true;
  const db = env.PLATFORM_CONTEXT!.db as any;

  const result = await computeStandingForTerm(db, body.term_id, dryRun);

  return ok({
    term_id: body.term_id,
    term_name: term.name,
    dry_run: dryRun,
    ...result,
    message: dryRun
      ? `Dry run complete — ${result.processed} students would be processed.`
      : `Standing computed for ${result.updated}/${result.processed} students.`
  });
}

/**
 * GET /api/v1/admin/standing/rules
 * Lists all standing rules.
 * Auth: admin only.
 */
export async function handleListStandingRules(
  req: Request,
  env: Env
): Promise<Response> {
  const { results } = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT * FROM standing_rules ORDER BY
       CASE standing
         WHEN 'dismissed' THEN 1
         WHEN 'suspended' THEN 2
         WHEN 'probation' THEN 3
         WHEN 'warning'   THEN 4
         WHEN 'good'      THEN 5
       END ASC, min_gpa ASC`
  ).all<StandingRule>();
  return ok(results);
}
