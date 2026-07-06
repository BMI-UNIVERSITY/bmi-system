/**
 * BMI UMS — Provisioning Job Dispatcher
 * ─────────────────────────────────────────────────────────────────────────────
 * Enqueues and processes downstream provisioning jobs (LMS, Library, Finance, Email, ID Card).
 * Designed for async execution (via Cloudflare Queues or ctx.waitUntil).
 * Implements exponential backoff and dead-letter alerting identical to webhooks.
 */

import type { Env } from './types';
import type { D1Database } from '@cloudflare/workers-types';
import { sendEmail } from './email';

export type ProvisioningJobType = 'finance' | 'library' | 'lms' | 'portal' | 'email' | 'id_card';

export interface ProvisioningJob {
  id: string;
  uid: string;
  job_type: ProvisioningJobType;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'dead';
  attempts: number;
}

/**
 * Enqueue a set of provisioning jobs for a newly admitted student.
 */
export async function enqueueProvisioningJobs(db: D1Database, uid: string): Promise<void> {
  const jobs: ProvisioningJobType[] = ['finance', 'library', 'lms', 'portal', 'email', 'id_card'];
  const now = new Date().toISOString();
  
  const batchOps = jobs.map(jobType => 
    db.prepare(
      `INSERT INTO provisioning_jobs (id, uid, job_type, created_at)
       VALUES (lower(hex(randomblob(16))), ?, ?, ?)`
    ).bind(uid, jobType, now)
  );

  await db.batch(batchOps);
}

/** Move a failed job to dead status and send ops alert. */
async function deadLetterJob(env: Env, job: ProvisioningJob, lastError: string): Promise<void> {
  await env.DB.prepare(
    `UPDATE provisioning_jobs SET status='dead', last_error=?, completed_at=datetime('now') WHERE id=?`
  ).bind(lastError, job.id).run();

  // Send ops alert
  if (env.OPS_ALERT_EMAIL && env.RESEND_API_KEY) {
    await sendEmail(env, {
      to: env.OPS_ALERT_EMAIL,
      subject: `[BMI Portal] Provisioning Dead-Letter: ${job.job_type}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#dc2626;">⚠ Provisioning Dead-Letter Alert</h2>
          <p><strong>Job Type:</strong> ${job.job_type}</p>
          <p><strong>UID:</strong> ${job.uid}</p>
          <p><strong>Job ID:</strong> ${job.id}</p>
          <p><strong>Last Error:</strong> ${lastError}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <hr/>
          <p style="color:#64748b;font-size:13px;">
            Review and retry at: Admin → Infrastructure → Provisioning
          </p>
        </div>`
    }).catch(() => { /* Suppress alert failure */ });
  }
}

/** Stub external API call for provisioning (Simulates HTTP failures and successes) */
async function executeJob(env: Env, job: ProvisioningJob): Promise<void> {
  // In a real system, this would branch per job_type and call external APIs:
  // e.g., if (job.job_type === 'lms') await fetch('https://lms.bmi.edu/api/provision', ...)
  
  // Simulated workload
  await new Promise(r => setTimeout(r, 200));

  // Simulate ~10% transient failure rate
  if (Math.random() < 0.1) {
    throw new Error('Simulated external service timeout');
  }
}

/**
 * Process a single job with up to 3 retry attempts and exponential backoff.
 * Non-throwing — handles all internal state updates.
 */
export async function processProvisioningJob(env: Env, job: ProvisioningJob): Promise<void> {
  const delays = [1000, 4000, 16000]; // ms
  
  // Mark as processing
  await env.DB.prepare(`UPDATE provisioning_jobs SET status='processing' WHERE id=?`)
    .bind(job.id).run();

  for (let attempt = job.attempts; attempt < 3; attempt++) {
    if (attempt > job.attempts) {
      await new Promise(r => setTimeout(r, delays[attempt - 1]));
    }

    let lastError = '';
    try {
      await executeJob(env, job);
      
      // Success
      await env.DB.prepare(
        `UPDATE provisioning_jobs SET status='completed', attempts=?, completed_at=datetime('now') WHERE id=?`
      ).bind(attempt + 1, job.id).run();
      return;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
    }

    // Update attempts
    await env.DB.prepare(
      `UPDATE provisioning_jobs SET attempts=?, last_error=?, status='failed' WHERE id=?`
    ).bind(attempt + 1, lastError, job.id).run().catch(() => {});

    if (attempt === 2) {
      await deadLetterJob(env, job, lastError);
    }
  }
}

/**
 * Dispatch all pending jobs asynchronously in the background.
 * Safe to call via ctx.waitUntil().
 */
export async function dispatchPendingJobs(env: Env): Promise<void> {
  const { results } = await env.DB.prepare(
    `SELECT * FROM provisioning_jobs WHERE status IN ('pending', 'failed') AND attempts < 3 LIMIT 20`
  ).all<ProvisioningJob>();

  // Process concurrently in the background
  const promises = results.map(job => processProvisioningJob(env, job));
  await Promise.allSettled(promises);
}
