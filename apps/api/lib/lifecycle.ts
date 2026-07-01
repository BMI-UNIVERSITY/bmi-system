/**
 * BMI UMS — Lifecycle Workflow Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Implements the Application → Alumni state machine from the SIS Wiring Plan.
 *
 * Design principles:
 *   1. Each stage writes ONE immutable row to lifecycle_events — never updates.
 *   2. Each sub-step has a unique idempotency_key so retries skip completed work.
 *   3. The pipeline is driven by admission acceptance in handleUpdateStatus.
 *   4. Every step is independently resumable — a Worker crash mid-pipeline
 *      does not duplicate work already committed.
 *
 * Lifecycle stages (in order):
 *   application_submitted
 *   application_number_generated
 *   application_under_review
 *   application_accepted          ← admission decision — triggers pipeline below
 *   uid_generated                 ← Phase 1: persons row + UID
 *   student_record_created        ← Phase 1/2: students row linked
 *   programme_enrolled            ← Phase 3: student_programmes row
 *   registration_number_generated ← Phase 4: reg_no assigned
 *   provisioning_queued           ← Phase 6: downstream jobs dispatched
 *   student_active
 *   graduated
 *   alumni
 */

import type { D1Database } from '@cloudflare/workers-types';
import { generateUID } from './uid';
import { generateRegNo } from './reg_number';
import { enqueueProvisioningJobs } from './provisioning';

// ─── Stage constants ──────────────────────────────────────────────────────────

export const STAGES = {
  APPLICATION_SUBMITTED:            'application_submitted',
  APPLICATION_NUMBER_GENERATED:     'application_number_generated',
  APPLICATION_UNDER_REVIEW:         'application_under_review',
  APPLICATION_ACCEPTED:             'application_accepted',
  UID_GENERATED:                    'uid_generated',
  STUDENT_RECORD_CREATED:           'student_record_created',
  PROGRAMME_ENROLLED:               'programme_enrolled',
  REGISTRATION_NUMBER_GENERATED:    'registration_number_generated',
  PROVISIONING_QUEUED:              'provisioning_queued',
  STUDENT_ACTIVE:                   'student_active',
  GRADUATED:                        'graduated',
  ALUMNI:                           'alumni',
} as const;

export type LifecycleStage = typeof STAGES[keyof typeof STAGES];
export type LifecycleStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';

// ─── Core helpers ─────────────────────────────────────────────────────────────

/**
 * Check whether a stage has already been completed for this idempotency key.
 * Returns true if a completed row already exists — the caller should skip this step.
 */
export async function isStageComplete(db: D1Database, idempotencyKey: string): Promise<boolean> {
  const row = await db.prepare(
    `SELECT 1 FROM lifecycle_events WHERE idempotency_key = ? AND status = 'completed' LIMIT 1`
  ).bind(idempotencyKey).first();
  return row !== null;
}

/**
 * Append a single lifecycle event row.
 * Uses INSERT OR IGNORE so concurrent retries of the same step don't conflict
 * on the UNIQUE idempotency_key constraint.
 */
export async function appendLifecycleEvent(
  db: D1Database,
  params: {
    idempotencyKey: string;
    stage: LifecycleStage;
    status: LifecycleStatus;
    uid?: string | null;
    applicationId?: string | null;
    actorId?: string | null;
    notes?: string | null;
    errorDetail?: string | null;
  }
): Promise<void> {
  await db.prepare(
    `INSERT OR IGNORE INTO lifecycle_events
       (id, uid, application_id, stage, status, idempotency_key, actor_id, notes, error_detail)
     VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    params.uid ?? null,
    params.applicationId ?? null,
    params.stage,
    params.status,
    params.idempotencyKey,
    params.actorId ?? null,
    params.notes ?? null,
    params.errorDetail ?? null,
  ).run();
}

/**
 * Fetch the full lifecycle history for an application or uid.
 */
export async function getLifecycleHistory(
  db: D1Database,
  filter: { applicationId?: string; uid?: string }
): Promise<Record<string, unknown>[]> {
  if (filter.applicationId) {
    const { results } = await db.prepare(
      `SELECT * FROM lifecycle_events WHERE application_id = ? ORDER BY created_at ASC`
    ).bind(filter.applicationId).all();
    return results as Record<string, unknown>[];
  }
  if (filter.uid) {
    const { results } = await db.prepare(
      `SELECT * FROM lifecycle_events WHERE uid = ? ORDER BY created_at ASC`
    ).bind(filter.uid).all();
    return results as Record<string, unknown>[];
  }
  return [];
}

// ─── Admission Acceptance Pipeline ───────────────────────────────────────────

export interface AdmissionContext {
  applicationId: string;
  userId: string;      // the applicant's user row id
  actorId: string;     // the admin performing the acceptance
  program: string;     // free-text programme name from applications table
}

/**
 * Orchestrates the full post-acceptance pipeline.
 *
 * Each sub-step:
 *   - checks its idempotency_key before doing work (safe to re-run)
 *   - records its outcome as a lifecycle_events row
 *   - failures are logged but do not abort subsequent independent steps
 *
 * The pipeline does NOT throw on individual step failures — each step's failure
 * is visible in lifecycle_events and can be retried by ops without re-triggering
 * the whole pipeline.
 */
export async function runAdmissionPipeline(
  db: D1Database,
  ctx: AdmissionContext
): Promise<{ uid: string | null; regNo: string | null }> {
  const { applicationId, userId, actorId, program } = ctx;
  const base = `${applicationId}`;

  // ─── Step 1: Record acceptance ───────────────────────────────────────────
  await appendLifecycleEvent(db, {
    idempotencyKey: `${base}:application_accepted`,
    stage: STAGES.APPLICATION_ACCEPTED,
    status: 'completed',
    applicationId,
    actorId,
    notes: 'Application accepted — admission pipeline started',
  });

  // ─── Step 2: Generate / retrieve UID ────────────────────────────────────
  let uid: string | null = null;
  const uidKey = `${base}:uid_generated`;

  if (await isStageComplete(db, uidKey)) {
    // Already done — retrieve existing uid
    const person = await db.prepare(
      `SELECT p.uid FROM users u JOIN persons p ON u.person_id = p.id WHERE u.id = ?`
    ).bind(userId).first<{ uid: string }>();
    uid = person?.uid ?? null;
  } else {
    try {
      // Check if user already has a person record (e.g., from a prior partial run)
      const existing = await db.prepare(
        `SELECT p.uid, p.id as person_id FROM users u
         LEFT JOIN persons p ON u.person_id = p.id WHERE u.id = ?`
      ).bind(userId).first<{ uid: string | null; person_id: string | null }>();

      if (existing?.uid) {
        uid = existing.uid;
      } else {
        // Get user name for persons table
        const user = await db.prepare(
          `SELECT first_name, last_name FROM users WHERE id = ?`
        ).bind(userId).first<{ first_name: string; last_name: string }>();

        uid = await generateUID(db);
        const personId = crypto.randomUUID().replace(/-/g, '');
        const now = new Date().toISOString();

        await db.batch([
          db.prepare(
            `INSERT INTO persons (id, uid, first_name, last_name, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)`
          ).bind(personId, uid, user?.first_name ?? '', user?.last_name ?? '', now, now),
          db.prepare(
            `UPDATE users SET person_id = ?, updated_at = ? WHERE id = ?`
          ).bind(personId, now, userId),
        ]);
      }

      await appendLifecycleEvent(db, {
        idempotencyKey: uidKey,
        stage: STAGES.UID_GENERATED,
        status: 'completed',
        uid,
        applicationId,
        actorId,
        notes: `UID assigned: ${uid}`,
      });
    } catch (e) {
      await appendLifecycleEvent(db, {
        idempotencyKey: uidKey,
        stage: STAGES.UID_GENERATED,
        status: 'failed',
        applicationId,
        actorId,
        errorDetail: String(e),
      });
    }
  }

  // ─── Step 3: Create / verify student record ──────────────────────────────
  const studentKey = `${base}:student_record_created`;
  if (!(await isStageComplete(db, studentKey))) {
    try {
      const existingStudent = await db.prepare(
        `SELECT user_id FROM students WHERE user_id = ?`
      ).bind(userId).first();

      if (!existingStudent) {
        const now = new Date().toISOString();
        const year = new Date().getUTCFullYear();
        // Placeholder reg_no — will be overwritten by Phase 4 at enrollment
        const placeholderRegNo = `PENDING-${userId.slice(0, 8).toUpperCase()}`;

        await db.prepare(
          `INSERT INTO students (user_id, reg_no, admission_date, programme, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'Active', ?, ?)`
        ).bind(userId, placeholderRegNo, now.split('T')[0], program, now, now).run();
      }

      await appendLifecycleEvent(db, {
        idempotencyKey: studentKey,
        stage: STAGES.STUDENT_RECORD_CREATED,
        status: 'completed',
        uid,
        applicationId,
        actorId,
        notes: existingStudent ? 'Student record already existed' : 'Student record created',
      });
    } catch (e) {
      await appendLifecycleEvent(db, {
        idempotencyKey: studentKey,
        stage: STAGES.STUDENT_RECORD_CREATED,
        status: 'failed',
        uid,
        applicationId,
        actorId,
        errorDetail: String(e),
      });
    }
  }

  // ─── Step 4: Link programme (best-effort match) ──────────────────────────
  const progKey = `${base}:programme_enrolled`;
  if (uid && !(await isStageComplete(db, progKey))) {
    try {
      // Attempt to match the application's program string to programs table
      const matchedProg = await db.prepare(
        `SELECT id, code, level FROM programs
         WHERE lower(trim(name)) = lower(trim(?))
            OR lower(trim(code)) = lower(trim(?))
         LIMIT 1`
      ).bind(program, program).first<{ id: string; code: string; level: string }>();

      if (matchedProg) {
        const now = new Date().toISOString();
        const year = new Date().getUTCFullYear();
        const rowId = crypto.randomUUID().replace(/-/g, '');

        // Only insert if no current row exists for this uid
        const existingEnroll = await db.prepare(
          `SELECT id FROM student_programmes WHERE uid = ? AND current_flag = 1`
        ).bind(uid).first();

        if (!existingEnroll) {
          await db.batch([
            db.prepare(
              `INSERT OR IGNORE INTO student_programmes
                 (id, uid, programme_id, admission_year, enrollment_date, status, current_flag, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, 'active', 1, ?, ?)`
            ).bind(rowId, uid, matchedProg.id, year, now.split('T')[0], now, now),
            db.prepare(
              `UPDATE students SET programme_id = ?, updated_at = ? WHERE user_id = ?`
            ).bind(matchedProg.id, now, userId),
          ]);
        }

        await appendLifecycleEvent(db, {
          idempotencyKey: progKey,
          stage: STAGES.PROGRAMME_ENROLLED,
          status: 'completed',
          uid,
          applicationId,
          actorId,
          notes: `Linked to programme: ${matchedProg.code}`,
        });
      } else {
        // No confident match — skip gracefully, ops will resolve via backfill
        await appendLifecycleEvent(db, {
          idempotencyKey: progKey,
          stage: STAGES.PROGRAMME_ENROLLED,
          status: 'skipped',
          uid,
          applicationId,
          actorId,
          notes: `No confident programme match for: "${program}" — run backfill_student_programmes.sql`,
        });
      }
    } catch (e) {
      await appendLifecycleEvent(db, {
        idempotencyKey: progKey,
        stage: STAGES.PROGRAMME_ENROLLED,
        status: 'failed',
        uid,
        applicationId,
        actorId,
        errorDetail: String(e),
      });
    }
  }

  // ─── Step 5: Generate Registration Number ────────────────────────────────
  let regNo: string | null = null;
  const regKey = `${base}:registration_number_generated`;
  if (uid && !(await isStageComplete(db, regKey))) {
    try {
      // Fetch programme linkage for RegNo generation
      const progInfo = await db.prepare(
        `SELECT sp.programme_id, pr.code, pr.level
         FROM student_programmes sp
         JOIN programs pr ON sp.programme_id = pr.id
         WHERE sp.uid = ? AND sp.current_flag = 1`
      ).bind(uid).first<{ programme_id: string; code: string; level: string }>();

      if (progInfo) {
        const year = new Date().getUTCFullYear();
        regNo = await generateRegNo(db, progInfo.programme_id, progInfo.code, year, progInfo.level);
        const now = new Date().toISOString();

        await db.batch([
          db.prepare(
            `UPDATE students SET reg_no = ?, updated_at = ?
             WHERE user_id = ? AND (reg_no IS NULL OR reg_no NOT LIKE 'BMI/%')`
          ).bind(regNo, now, userId),
          db.prepare(
            `UPDATE student_programmes
             SET registration_number = ?, updated_at = ?
             WHERE uid = ? AND current_flag = 1 AND registration_number IS NULL`
          ).bind(regNo, now, uid),
        ]);

        await appendLifecycleEvent(db, {
          idempotencyKey: regKey,
          stage: STAGES.REGISTRATION_NUMBER_GENERATED,
          status: 'completed',
          uid,
          applicationId,
          actorId,
          notes: `Registration number: ${regNo}`,
        });
      } else {
        await appendLifecycleEvent(db, {
          idempotencyKey: regKey,
          stage: STAGES.REGISTRATION_NUMBER_GENERATED,
          status: 'skipped',
          uid,
          applicationId,
          actorId,
          notes: 'No programme linked yet — RegNo deferred to enrollment',
        });
      }
    } catch (e) {
      await appendLifecycleEvent(db, {
        idempotencyKey: regKey,
        stage: STAGES.REGISTRATION_NUMBER_GENERATED,
        status: 'failed',
        uid,
        applicationId,
        actorId,
        errorDetail: String(e),
      });
    }
  }

  // ─── Step 6: Mark provisioning queued ────────────────────────────────────
  // Actual provisioning jobs are dispatched in Phase 6 (provisioning_jobs table).
  const provKey = `${base}:provisioning_queued`;
  if (uid && !(await isStageComplete(db, provKey))) {
    try {
      await enqueueProvisioningJobs(db, uid);

      await appendLifecycleEvent(db, {
        idempotencyKey: provKey,
        stage: STAGES.PROVISIONING_QUEUED,
        status: 'completed',
        uid,
        applicationId,
        actorId,
        notes: 'Downstream provisioning jobs enqueued successfully',
      });
    } catch (e) {
      await appendLifecycleEvent(db, {
        idempotencyKey: provKey,
        stage: STAGES.PROVISIONING_QUEUED,
        status: 'failed',
        uid,
        applicationId,
        actorId,
        errorDetail: String(e),
      });
    }
  }

  // ─── Step 7: Mark student active ─────────────────────────────────────────
  const activeKey = `${base}:student_active`;
  if (!(await isStageComplete(db, activeKey))) {
    await appendLifecycleEvent(db, {
      idempotencyKey: activeKey,
      stage: STAGES.STUDENT_ACTIVE,
      status: 'completed',
      uid,
      applicationId,
      actorId,
      notes: 'Student is now active in the system',
    });
  }

  return { uid, regNo };
}
