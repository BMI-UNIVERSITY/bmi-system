/**
 * Queue Consumer — Transcript Generation Jobs
 *
 * This file is the Cloudflare Queue consumer handler for the `bmi-transcript-jobs`
 * queue. It processes heavy transcript-generation work asynchronously, keeping
 * the bmi-ums worker responsive (Worker CPU time < 50ms per request).
 *
 * Architecture:
 *   1. A student requests `/api/student/transcript` (bmi-ums).
 *   2. bmi-ums returns { jobId, status: "queued" } immediately.
 *   3. bmi-ums enqueues a `TranscriptJob` message to this queue.
 *   4. This consumer picks up the job, generates the transcript PDF,
 *      saves it to R2, and updates the `transcript_jobs` D1 table.
 *   5. The student polls `/api/student/transcript/status/:jobId` for completion.
 *
 * Retry policy: 3 retries with 30s delay. Jobs that fail 3x are dead-lettered.
 */

import type { Env } from './lib/types';
import { createLogger } from '@bmi/api-middleware';

const log = createLogger('bmi-ums-queue');

export interface TranscriptJob {
  jobId: string;
  studentId: string;
  requestedAt: string;
  format: 'pdf' | 'csv';
}

/**
 * Enqueue a transcript generation job.
 * Call this from the `/api/student/transcript` route instead of generating inline.
 *
 * @param env       - UMS worker environment (must have TRANSCRIPT_QUEUE binding)
 * @param studentId - The student's user ID
 * @param format    - Output format (pdf or csv)
 * @returns jobId   - The caller should return this to the client for status polling
 */
export async function enqueueTranscriptJob(
  env: Env,
  studentId: string,
  format: 'pdf' | 'csv' = 'pdf'
): Promise<string> {
  const jobId = crypto.randomUUID();
  const now = new Date().toISOString();

  // 1. Insert a pending job record in D1
  await env.DB.prepare(
    `INSERT INTO transcript_jobs (id, student_id, status, format, requested_at)
     VALUES (?, ?, 'queued', ?, ?)`
  ).bind(jobId, studentId, format, now).run();

  // 2. Enqueue the message to Cloudflare Queue
  const job: TranscriptJob = { jobId, studentId, requestedAt: now, format };
  await env.TRANSCRIPT_QUEUE.send(job);

  log.info('Transcript job enqueued', { jobId, studentId: '[REDACTED]', format });

  return jobId;
}

/**
 * Cloudflare Queue consumer — called by the runtime when messages arrive.
 * This runs in the same Worker process but is invoked asynchronously.
 */
export async function handleTranscriptQueue(
  batch: MessageBatch<TranscriptJob>,
  env: Env
): Promise<void> {
  for (const message of batch.messages) {
    const { jobId, studentId, format } = message.body;

    try {
      log.info('Processing transcript job', { jobId, format });

      // Mark job as processing
      await env.DB.prepare(
        `UPDATE transcript_jobs SET status = 'processing', started_at = ? WHERE id = ?`
      ).bind(new Date().toISOString(), jobId).run();

      // Generate transcript data from D1
      const { results: grades } = await env.DB.prepare(
        `SELECT c.code, c.title, c.credits, e.grade, c.term
         FROM enrollments e
         JOIN courses c ON e.course_id = c.id
         WHERE e.student_id = ? AND e.grade IS NOT NULL
         ORDER BY c.term DESC, c.code ASC`
      ).bind(studentId).all<{ code: string; title: string; credits: number; grade: string; term: string }>();

      const student = await env.DB.prepare(
        `SELECT first_name, last_name, email FROM users WHERE id = ?`
      ).bind(studentId).first<{ first_name: string; last_name: string; email: string }>();

      if (!student) throw new Error(`Student ${studentId} not found`);

      // Build transcript content
      const transcriptData = {
        student: {
          name: `${student.first_name} ${student.last_name}`,
          email: '[REDACTED]',
          id: studentId,
        },
        generatedAt: new Date().toISOString(),
        courses: grades,
        gpa: calculateGPA(grades),
      };

      // Serialize to JSON (PDF generation would happen here in production)
      const content = format === 'pdf'
        ? JSON.stringify(transcriptData, null, 2) // Replace with actual PDF library
        : gradesToCSV(grades);

      // Save to R2
      const r2Key = `transcripts/${studentId}/${jobId}.${format === 'pdf' ? 'json' : 'csv'}`;
      await env.DOCUMENTS.put(r2Key, content, {
        httpMetadata: {
          contentType: format === 'pdf' ? 'application/json' : 'text/csv',
        },
        customMetadata: { jobId, studentId, format },
      });

      // Mark job as complete
      await env.DB.prepare(
        `UPDATE transcript_jobs SET status = 'complete', r2_key = ?, completed_at = ? WHERE id = ?`
      ).bind(r2Key, new Date().toISOString(), jobId).run();

      log.info('Transcript job complete', { jobId, r2Key, format });
      message.ack();
    } catch (err: any) {
      log.error('Transcript job failed', { jobId, err: err?.message, retries: message.attempts });

      await env.DB.prepare(
        `UPDATE transcript_jobs SET status = 'failed', error = ? WHERE id = ?`
      ).bind(err?.message ?? 'Unknown error', jobId).run();

      // Retry up to 3 times; after that, the queue auto-dead-letters
      message.retry({ delaySeconds: 30 });
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calculateGPA(grades: Array<{ grade: string; credits: number }>): number {
  const gradePoints: Record<string, number> = {
    'A+': 4.0, 'A': 4.0, 'A-': 3.7,
    'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7,
    'D+': 1.3, 'D': 1.0, 'F': 0.0,
  };

  let totalPoints = 0;
  let totalCredits = 0;

  for (const { grade, credits } of grades) {
    const gp = gradePoints[grade] ?? 0;
    totalPoints += gp * credits;
    totalCredits += credits;
  }

  return totalCredits === 0 ? 0 : Math.round((totalPoints / totalCredits) * 100) / 100;
}

function gradesToCSV(grades: Array<{ code: string; title: string; credits: number; grade: string; term: string }>): string {
  const header = 'Course Code,Title,Credits,Grade,Term\n';
  const rows = grades.map(
    (g) => `${g.code},"${g.title}",${g.credits},${g.grade},${g.term}`
  ).join('\n');
  return header + rows;
}
