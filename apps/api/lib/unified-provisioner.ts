import type { IDatabase, IDocumentGenerator } from '@bmi/ports';
import { generateUID } from './uid';
import { generateRegNo } from './reg_number';
import { enqueueProvisioningJobs } from './provisioning';
import { appendLifecycleEvent, isStageComplete, STAGES } from './lifecycle';

export type RegistrationSource = 'portal' | 'ums_direct' | 'import' | 'batch' | 'lifecycle';

export interface ProvisionInput {
  source: RegistrationSource;
  userId: string;
  firstName: string;
  lastName: string;
  email?: string;
  programId?: string;
  programName?: string;
  programCode?: string;
  programLevel?: string;
  studyCenterId?: string;
  admissionDate?: string;
  photo?: string;
  gender?: string;
  dateOfBirth?: string;
  nationality?: string;
  phone?: string;
  existingUid?: string;
  existingRegNo?: string;
  applicationId?: string;
  actorId?: string;
}

export interface ProvisionResult {
  uid: string;
  regNo: string | null;
  userId: string;
  personId: string | null;
  studentExists: boolean;
  programLinked: boolean;
  documentsGenerated: boolean;
  provisioningQueued: boolean;
  lifecycleKeys: string[];
}

function buildId(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

export async function runUnifiedProvisioning(
  db: IDatabase,
  input: ProvisionInput,
  document?: IDocumentGenerator
): Promise<ProvisionResult> {
  const baseKey = input.applicationId
    ? `prov:${input.applicationId}`
    : `prov:${input.source}:${input.userId}`;

  const lifecycleKeys: string[] = [];
  const year = new Date().getUTCFullYear();
  const now = new Date().toISOString();

  let uid: string | null = input.existingUid || null;
  let personId: string | null = null;
  let studentExists = false;
  let regNo: string | null = input.existingRegNo || null;
  let programLinked = false;
  let documentsGenerated = false;
  let provisioningQueued = false;

  // ─── Step 1: UID / Person Record ──────────────────────────────────────
  const uidKey = `${baseKey}:uid_generated`;
  lifecycleKeys.push(uidKey);

  if (!uid) {
    const existingPerson = await db.prepare(
      `SELECT p.uid, p.id FROM users u
       JOIN persons p ON u.person_id = p.id
       WHERE u.id = ?`
    ).bind(input.userId).first<{ uid: string; id: string }>();

    if (existingPerson) {
      uid = existingPerson.uid;
      personId = existingPerson.id;
    } else {
      const existingV2 = await db.prepare(
        `SELECT p.uid, p.id FROM users u
         LEFT JOIN persons p ON u.person_id = p.id
         WHERE u.id = ?`
      ).bind(input.userId).first<{ uid: string | null; id: string | null }>();

      if (existingV2?.uid) {
        uid = existingV2.uid;
        personId = existingV2.id;
      }
    }
  }

  if (!uid) {
    try {
      uid = await generateUID(db);
      personId = buildId();
      await db.transaction(async (tx) => {
        await tx.prepare(
          `INSERT INTO persons (id, uid, first_name, last_name, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(personId, uid, input.firstName, input.lastName, now, now).run();
        await tx.prepare(
          `UPDATE users SET person_id = ?, updated_at = ? WHERE id = ?`
        ).bind(personId, now, input.userId).run();
      });

      if (!(await isStageComplete(db, uidKey))) {
        await appendLifecycleEvent(db, {
          idempotencyKey: uidKey,
          stage: STAGES.UID_GENERATED,
          status: 'completed',
          uid,
          applicationId: input.applicationId || null,
          actorId: input.actorId || null,
          notes: `UID assigned: ${uid} via ${input.source}`,
        });
      }
    } catch (e) {
      await appendLifecycleEvent(db, {
        idempotencyKey: uidKey,
        stage: STAGES.UID_GENERATED,
        status: 'failed',
        uid: null,
        applicationId: input.applicationId || null,
        actorId: input.actorId || null,
        errorDetail: String(e),
      });
      throw e;
    }
  }

  // ─── Step 2: Student Record ──────────────────────────────────────────
  const studentKey = `${baseKey}:student_record_created`;
  lifecycleKeys.push(studentKey);

  if (!(await isStageComplete(db, studentKey))) {
    try {
      const existing = await db.prepare(
        `SELECT user_id FROM students WHERE user_id = ?`
      ).bind(input.userId).first<{ user_id: string }>();

      if (existing) {
        studentExists = true;
        if (regNo && (regNo.startsWith('PENDING') || regNo.startsWith('STD'))) {
          regNo = null;
        }
      } else {
        const placeholderRegNo = (regNo && !regNo.startsWith('STD')) ? regNo : `PENDING-${input.userId.slice(0, 8).toUpperCase()}`;
        const admissionDate = input.admissionDate || now.split('T')[0];

        await db.prepare(
          `INSERT INTO students (user_id, reg_no, admission_date, program, status, gender, date_of_birth, nationality, photo, study_center_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'Active', ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          input.userId,
          placeholderRegNo,
          admissionDate,
          input.programName || '',
          input.gender || null,
          input.dateOfBirth || null,
          input.nationality || null,
          input.photo || null,
          input.studyCenterId || null,
          now,
          now
        ).run();
      }

      await appendLifecycleEvent(db, {
        idempotencyKey: studentKey,
        stage: STAGES.STUDENT_RECORD_CREATED,
        status: 'completed',
        uid,
        applicationId: input.applicationId || null,
        actorId: input.actorId || null,
        notes: studentExists ? 'Student record already existed' : `Student record created via ${input.source}`,
      });
    } catch (e) {
      await appendLifecycleEvent(db, {
        idempotencyKey: studentKey,
        stage: STAGES.STUDENT_RECORD_CREATED,
        status: 'failed',
        uid,
        applicationId: input.applicationId || null,
        actorId: input.actorId || null,
        errorDetail: String(e),
      });
    }
  }

  // ─── Step 2.5: Hold Assignment ────────────────────────────────────────
  const holdKey = `${baseKey}:holds_assigned`;
  lifecycleKeys.push(holdKey);

  if (uid && !(await isStageComplete(db, holdKey))) {
    try {
      const holdTypes = [
        { hold_type: 'document', reason: 'Upload your student ID photo to verify your identity.' },
        { hold_type: 'orientation', reason: 'Complete the online orientation to learn about campus policies and resources.' },
        { hold_type: 'course_selection', reason: 'Complete course registration (mandatory auto-enrollment + elective selection).' },
        { hold_type: 'payment', reason: 'Pay your program tuition and fees to complete registration.' },
      ];

      await db.transaction(async (tx) => {
        for (const h of holdTypes) {
          const existing = await tx.prepare(
            `SELECT id FROM student_holds WHERE student_id = ? AND hold_type = ?`
          ).bind(input.userId, h.hold_type).first();

          if (!existing) {
            await tx.prepare(
              `INSERT INTO student_holds (id, student_id, hold_type, reason) VALUES (?, ?, ?, ?)`
            ).bind(crypto.randomUUID(), input.userId, h.hold_type, h.reason).run();
          }
        }
      });

      await appendLifecycleEvent(db, {
        idempotencyKey: holdKey,
        stage: STAGES.HOLDS_ASSIGNED,
        status: 'completed',
        uid,
        applicationId: input.applicationId || null,
        actorId: input.actorId || null,
        notes: `Onboarding holds assigned via ${input.source}`,
      });
    } catch (e) {
      await appendLifecycleEvent(db, {
        idempotencyKey: holdKey,
        stage: STAGES.HOLDS_ASSIGNED,
        status: 'failed',
        uid,
        applicationId: input.applicationId || null,
        actorId: input.actorId || null,
        errorDetail: String(e),
      });
    }
  }

  // ─── Step 3: Program Enrollment ──────────────────────────────────────
  const progKey = `${baseKey}:program_enrolled`;
  lifecycleKeys.push(progKey);

  if (uid && !(await isStageComplete(db, progKey))) {
    try {
      let matchedProgId = input.programId;
      let matchedCode = input.programCode || '';

      if (!matchedProgId && input.programName) {
        const progInfo = await db.prepare(
          `SELECT id, code, level FROM programs
           WHERE lower(trim(name)) = lower(trim(?))
              OR lower(trim(code)) = lower(trim(?))
           LIMIT 1`
        ).bind(input.programName, input.programName).first<{ id: string; code: string; level: string }>();

        if (progInfo) {
          matchedProgId = progInfo.id;
          matchedCode = progInfo.code;
        }
      }

      if (matchedProgId) {
        const existingEnroll = await db.prepare(
          `SELECT id FROM student_programs WHERE uid = ? AND current_flag = 1`
        ).bind(uid).first<{ id: string }>();

        if (!existingEnroll) {
          const rowId = buildId();
          await db.transaction(async (tx) => {
            await tx.prepare(
              `INSERT OR IGNORE INTO student_programs
                 (id, uid, program_id, admission_year, enrollment_date, status, current_flag, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, 'active', 1, ?, ?)`
            ).bind(rowId, uid, matchedProgId, year, now.split('T')[0], now, now).run();

            await tx.prepare(
              `UPDATE students SET program_id = ?, updated_at = ? WHERE user_id = ?`
            ).bind(matchedProgId, now, input.userId).run();
          });
        }

        programLinked = true;

        await appendLifecycleEvent(db, {
          idempotencyKey: progKey,
          stage: STAGES.PROGRAM_ENROLLED,
          status: 'completed',
          uid,
          applicationId: input.applicationId || null,
          actorId: input.actorId || null,
          notes:           `Program linked: ${input.programName || matchedCode || matchedProgId} via ${input.source}`,
        });
      } else {
        await appendLifecycleEvent(db, {
          idempotencyKey: progKey,
          stage: STAGES.PROGRAM_ENROLLED,
          status: 'skipped',
          uid,
          applicationId: input.applicationId || null,
          actorId: input.actorId || null,
          notes: `No program match — defer reg_no. Source: ${input.source}`,
        });
      }
    } catch (e) {
      await appendLifecycleEvent(db, {
        idempotencyKey: progKey,
        stage: STAGES.PROGRAM_ENROLLED,
        status: 'failed',
        uid,
        applicationId: input.applicationId || null,
        actorId: input.actorId || null,
        errorDetail: String(e),
      });
    }
  }

  // ─── Step 4: Registration Number ──────────────────────────────────────
  const regKey = `${baseKey}:registration_number_generated`;
  lifecycleKeys.push(regKey);

  if (uid && !(await isStageComplete(db, regKey))) {
    try {
      const regNeedsGeneration = !regNo || regNo.startsWith('PENDING') || regNo.startsWith('STD');
      if (regNeedsGeneration) {
        const progInfo = await db.prepare(
          `SELECT sp.program_id, pr.code, pr.level
           FROM student_programs sp
           JOIN programs pr ON sp.program_id = pr.id
           WHERE sp.uid = ? AND sp.current_flag = 1`
        ).bind(uid).first<{ program_id: string; code: string; level: string }>();

        if (progInfo) {
          // Preserve the old reg_no before overwriting (best practice: never destroy identifiers)
          await db.prepare(
            `UPDATE students SET previous_reg_no = reg_no, updated_at = ?
             WHERE user_id = ? AND reg_no IS NOT NULL AND reg_no != '' AND previous_reg_no IS NULL`
          ).bind(now, input.userId).run();

          regNo = await generateRegNo(db, progInfo.program_id, progInfo.code, year, progInfo.level);

          await db.transaction(async (tx) => {
            await tx.prepare(
              `UPDATE students SET reg_no = ?, updated_at = ?
               WHERE user_id = ? AND (reg_no IS NULL OR reg_no LIKE 'PENDING%' OR reg_no LIKE 'STD%')`
            ).bind(regNo, now, input.userId).run();

            await tx.prepare(
              `UPDATE student_programs
               SET registration_number = ?, updated_at = ?
               WHERE uid = ? AND current_flag = 1 AND registration_number IS NULL`
            ).bind(regNo, now, uid).run();
          });

          await appendLifecycleEvent(db, {
            idempotencyKey: regKey,
            stage: STAGES.REGISTRATION_NUMBER_GENERATED,
            status: 'completed',
            uid,
            applicationId: input.applicationId || null,
            actorId: input.actorId || null,
            notes: `Reg No: ${regNo} via ${input.source}`,
          });
        } else {
          await appendLifecycleEvent(db, {
            idempotencyKey: regKey,
            stage: STAGES.REGISTRATION_NUMBER_GENERATED,
            status: 'skipped',
            uid,
            applicationId: input.applicationId || null,
            actorId: input.actorId || null,
            notes: `No program linked yet — reg_no deferred. Source: ${input.source}`,
          });
        }
      }
    } catch (e) {
      await appendLifecycleEvent(db, {
        idempotencyKey: regKey,
        stage: STAGES.REGISTRATION_NUMBER_GENERATED,
        status: 'failed',
        uid,
        applicationId: input.applicationId || null,
        actorId: input.actorId || null,
        errorDetail: String(e),
      });
    }
  }

  // ─── Step 5: Student Email Update ─────────────────────────────────────
  if (input.email && uid) {
    await db.prepare(
      `UPDATE users SET student_email = COALESCE(student_email, ?), updated_at = datetime('now') WHERE id = ? AND student_email IS NULL`
    ).bind(input.email, input.userId).run().catch(() => {});
  }

  // ─── Step 6: Documents Generation ─────────────────────────────────────
  const docKey = `${baseKey}:documents_generated`;
  lifecycleKeys.push(docKey);

  if (uid && document && !(await isStageComplete(db, docKey))) {
    try {
      const effectiveRegNo = regNo || input.existingRegNo || 'PENDING';
      const effectiveProgram = input.programName || '';
      const fullName = `${input.firstName} ${input.lastName}`;
      const meta = { name: fullName, program: effectiveProgram, regNo: effectiveRegNo, uid };

      await Promise.all([
        document.generateDocument({ type: 'admission_letter', userId: input.userId, metadata: meta })
          .catch(e => console.warn(`[provisioner] Admission letter failed for ${uid}:`, e)),
        document.generateDocument({ type: 'id_card', userId: input.userId, metadata: meta })
          .catch(e => console.warn(`[provisioner] ID card failed for ${uid}:`, e)),
      ]);

      documentsGenerated = true;

      await appendLifecycleEvent(db, {
        idempotencyKey: docKey,
        stage: STAGES.DOCUMENTS_GENERATED,
        status: 'completed',
        uid,
        applicationId: input.applicationId || null,
        actorId: input.actorId || null,
        notes: `Documents generated via ${input.source}`,
      });
    } catch (e) {
      await appendLifecycleEvent(db, {
        idempotencyKey: docKey,
        stage: STAGES.DOCUMENTS_GENERATED,
        status: 'failed',
        uid,
        applicationId: input.applicationId || null,
        actorId: input.actorId || null,
        errorDetail: String(e),
      });
    }
  }

  // ─── Step 7: Provisioning Jobs ────────────────────────────────────────
  const provKey = `${baseKey}:provisioning_queued`;
  lifecycleKeys.push(provKey);

  if (uid && !(await isStageComplete(db, provKey))) {
    try {
      await enqueueProvisioningJobs(db, uid);
      provisioningQueued = true;

      await appendLifecycleEvent(db, {
        idempotencyKey: provKey,
        stage: STAGES.PROVISIONING_QUEUED,
        status: 'completed',
        uid,
        applicationId: input.applicationId || null,
        actorId: input.actorId || null,
        notes: `Provisioning queued via ${input.source}`,
      });
    } catch (e) {
      await appendLifecycleEvent(db, {
        idempotencyKey: provKey,
        stage: STAGES.PROVISIONING_QUEUED,
        status: 'failed',
        uid,
        applicationId: input.applicationId || null,
        actorId: input.actorId || null,
        errorDetail: String(e),
      });
    }
  }

  // ─── Step 8: Mark Active ───────────────────────────────────────────────
  const activeKey = `${baseKey}:student_active`;
  if (!(await isStageComplete(db, activeKey))) {
    await appendLifecycleEvent(db, {
      idempotencyKey: activeKey,
      stage: STAGES.STUDENT_ACTIVE,
      status: 'completed',
      uid,
      applicationId: input.applicationId || null,
      actorId: input.actorId || null,
      notes: `Student activated via ${input.source}`,
    });
  }

  return {
    uid: uid!,
    regNo,
    userId: input.userId,
    personId,
    studentExists,
    programLinked,
    documentsGenerated,
    provisioningQueued,
    lifecycleKeys,
  };
}
