import { error, json, logAdminAction } from '../lib/types';
import type { Env } from '../lib/types';
import { runUnifiedProvisioning, type ProvisionInput } from '../lib/unified-provisioner';
import { normalizeImportRows } from '../lib/intelligent-import';
import { dispatchPendingJobs } from '../lib/provisioning';
import { parseBody, ImportPayloadSchema } from '../lib/schemas';

export async function handleImportV2(request: Request, env: Env, userId: string): Promise<Response> {
  if (request.method !== 'POST') return error('Method not allowed', 405);

  const parsed = await parseBody(request, ImportPayloadSchema);
  if (parsed instanceof Response) return parsed;

  const { students, headers: explicitHeaders } = parsed;

  const db = env.PLATFORM_CONTEXT!.db;

  const headers = explicitHeaders || (students.length > 0 ? Object.keys(students[0]) : []);

  const normalized = normalizeImportRows(students as Record<string, string>[], headers);

  const results: Array<{
    row: string;
    status: 'imported' | 'skipped' | 'error';
    uid?: string;
    regNo?: string | null;
    error?: string;
    warnings?: string[];
  }> = [];

  let importedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const row of normalized.valid) {
    const rowNum = row._original._rowNumber || '';
    const warnings: string[] = [];

    if (row._unmatchedColumns.length > 0) {
      warnings.push(`Unrecognized columns: ${row._unmatchedColumns.join(', ')}`);
    }

    try {
      let targetUserId: string | undefined;

      if (row.email) {
        const existingUser = await db.prepare(
          `SELECT id FROM users WHERE email = ?`
        ).bind(row.email.toLowerCase().trim()).first<{ id: string }>();

        if (existingUser) {
          targetUserId = existingUser.id;
        }
      }

      if (!targetUserId && row.reg_no) {
        const existingStudent = await db.prepare(
          `SELECT s.user_id, u.email FROM students s
           JOIN users u ON s.user_id = u.id
           WHERE s.reg_no = ?`
        ).bind(row.reg_no).first<{ user_id: string; email: string }>();

        if (existingStudent) {
          targetUserId = existingStudent.user_id;
        }
      }

      if (!targetUserId) {
        const newUserId = crypto.randomUUID().replace(/-/g, '');
        const tempEmail = row.email || `${row.first_name.toLowerCase()}.${row.last_name.toLowerCase()}${Date.now()}@import.bmi.edu`;

        await db.prepare(
          `INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role)
           VALUES (?, ?, 'IMPORT_RESET_REQUIRED', ?, ?, ?, 'student')`
        ).bind(newUserId, tempEmail, row.first_name, row.last_name, row.phone || null).run();

        targetUserId = newUserId;
      }

      let matchedProgramId: string | undefined;
      let matchedProgramCode: string | undefined;
      let matchedProgramLevel: string | undefined;

      if (row.program_code) {
        const prog = await db.prepare(
          `SELECT id, code, level FROM programs WHERE code = ? LIMIT 1`
        ).bind(row.program_code).first<{ id: string; code: string; level: string }>();
        if (prog) {
          matchedProgramId = prog.id;
          matchedProgramCode = prog.code;
          matchedProgramLevel = prog.level;
        }
      }

      if (!matchedProgramId && row.program_name) {
        const prog = await db.prepare(
          `SELECT id, code, level FROM programs
           WHERE lower(trim(name)) = lower(trim(?))
              OR lower(trim(code)) = lower(trim(?))
           LIMIT 1`
        ).bind(row.program_name, row.program_name).first<{ id: string; code: string; level: string }>();
        if (prog) {
          matchedProgramId = prog.id;
          matchedProgramCode = prog.code;
          matchedProgramLevel = prog.level;
        } else {
          warnings.push(`Program "${row.program_name}" not found in system — linking deferred`);
        }
      }

      const input: ProvisionInput = {
        source: 'import',
        userId: targetUserId,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        phone: row.phone,
        gender: row.gender,
        dateOfBirth: row.date_of_birth,
        nationality: row.nationality,
        programId: matchedProgramId,
        programName: row.program_name,
        programCode: matchedProgramCode,
        programLevel: matchedProgramLevel,
        admissionDate: row.admission_date,
        existingUid: row.uid,
        existingRegNo: row.reg_no,
        photo: row.photo,
        actorId: userId,
      };

      const result = await runUnifiedProvisioning(db, input, env.PLATFORM_CONTEXT!.document);

      await logAdminAction(env, userId, 'import_student', 'student', targetUserId, {
        uid: result.uid,
        regNo: result.regNo,
        source: 'import_v2',
      }, request);

      importedCount++;
      results.push({
        row: rowNum,
        status: 'imported',
        uid: result.uid,
        regNo: result.regNo,
        warnings: warnings.length > 0 ? warnings : undefined,
      });
    } catch (e) {
      errorCount++;
      results.push({
        row: rowNum,
        status: 'error',
        error: e instanceof Error ? e.message : 'Unknown error',
      });
    }
  }

  for (const err of normalized.errors) {
    skippedCount++;
    results.push({
      row: String(err.row),
      status: 'skipped',
      error: err.message,
    });
  }

  if (importedCount > 0) {
    try {
      await dispatchPendingJobs(env);
    } catch (e) {
      console.warn('[import] Failed to dispatch pending jobs:', e);
    }
  }

  return json({
    success: true,
    data: {
      total: normalized.valid.length + normalized.errors.length,
      imported: importedCount,
      skipped: skippedCount,
      errors: errorCount,
      validationErrors: normalized.errors.length,
      warnings: normalized.warnings.length,
      columnMapping: normalized.columnMapping,
      unmatchedColumns: normalized.unmatchedColumns,
      details: results,
    },
  }, 201);
}
