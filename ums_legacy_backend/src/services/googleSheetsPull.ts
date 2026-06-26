/**
 * BMI UMS — Google Sheets Pull Service
 * Direction: Google Sheets → PocketBase (Source of Truth for master data)
 *
 * Runs on a schedule (every 5 minutes) and on manual trigger.
 * Uses upsert logic: insert if new, update if changed (keyed by code/number).
 */

import { getGoogleSheetRange } from "./googleAuth.js";
import { getPocketBase } from "./pocketbase.js";
import { logger } from "../utils/logger.js";
import { errorMessage } from "../utils/helpers.js";

const SPREADSHEET_ID =
  process.env.GOOGLE_SPREADSHEET_ID ||
  "1Y0oxI5QUpncZ9m5T48czz4F-vi04vTEWSZVz-PW_mzg";

// ── Sync State (in-memory, survives restarts via DB log) ─────────────────────
export interface SyncStatus {
  lastSyncAt: string | null;
  lastSyncResult: "success" | "partial" | "error" | null;
  rowsSynced: number;
  rowsFailed: number;
  errors: string[];
  isRunning: boolean;
  sheets: Record<string, { rows: number; status: "ok" | "error" | "skipped"; error?: string }>;
}

let syncState: SyncStatus = {
  lastSyncAt: null,
  lastSyncResult: null,
  rowsSynced: 0,
  rowsFailed: 0,
  errors: [],
  isRunning: false,
  sheets: {},
};

export function getSyncStatus(): SyncStatus {
  return { ...syncState };
}

// ── Column normalizer ─────────────────────────────────────────────────────────
function parseRows(raw: string[][]): Record<string, string>[] {
  if (!raw || raw.length < 2) return [];
  const headers = raw[0].map((h) => String(h || "").trim().toLowerCase().replace(/\s+/g, "_"));
  return raw.slice(1).filter((row) => row.some((c) => c?.trim())).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { if (h) obj[h] = String(row[i] ?? "").trim(); });
    return obj;
  });
}

// ── Upsert helper ─────────────────────────────────────────────────────────────
async function upsert(
  pb: any,
  collection: string,
  keyField: string,
  keyValue: string,
  data: Record<string, any>
): Promise<"created" | "updated" | "skipped"> {
  if (!keyValue) return "skipped";
  try {
    const existing = await pb.collection(collection).getFirstListItem(`${keyField}="${keyValue}"`).catch(() => null);
    if (existing) {
      await pb.collection(collection).update(existing.id, data);
      return "updated";
    } else {
      await pb.collection(collection).create({ ...data, [keyField]: keyValue });
      return "created";
    }
  } catch (err) {
    throw new Error(`Upsert ${collection}[${keyValue}]: ${errorMessage(err)}`);
  }
}

// ── Sheet Pull Handlers ───────────────────────────────────────────────────────

async function pullFaculties(pb: any) {
  const raw = await getGoogleSheetRange(SPREADSHEET_ID, "'01_FACULTIES'!A1:B100");
  const rows = parseRows(raw);
  let synced = 0;
  for (const row of rows) {
    const code = row["faculty_code"];
    if (!code) continue;
    await upsert(pb, "faculties", "code", code, { code, name: row["name"] || code });
    synced++;
  }
  return synced;
}

async function pullDepartments(pb: any) {
  const raw = await getGoogleSheetRange(SPREADSHEET_ID, "'02_DEPARTMENTS'!A1:C200");
  const rows = parseRows(raw);
  let synced = 0;
  for (const row of rows) {
    const code = row["dept_code"];
    if (!code) continue;
    await upsert(pb, "departments", "code", code, {
      code,
      name: row["name"] || code,
      faculty_code: row["faculty_code"] || "",
    });
    synced++;
  }
  return synced;
}

async function pullPrograms(pb: any) {
  const raw = await getGoogleSheetRange(SPREADSHEET_ID, "'03_PROGRAMS'!A1:E200");
  const rows = parseRows(raw);
  let synced = 0;
  for (const row of rows) {
    const code = row["program_code"];
    if (!code) continue;
    await upsert(pb, "programs", "code", code, {
      code,
      name: row["name"] || code,
      degree_type: row["degree_level"] || "",
      dept_code: row["dept_code"] || "",
      total_credit_hours: parseInt(row["total_credits"] || "0") || 0,
    });
    synced++;
  }
  return synced;
}

async function pullCourses(pb: any) {
  const raw = await getGoogleSheetRange(SPREADSHEET_ID, "'04_COURSES'!A1:E500");
  const rows = parseRows(raw);
  let synced = 0;
  for (const row of rows) {
    // Column header is "Course Code" → normalized to "course_code"
    const code = row["course_code"] || row["course code"];
    if (!code) continue;
    await upsert(pb, "courses", "code", code, {
      code,
      title: row["title"] || code,
      name: row["title"] || code,
      category: row["category"] || "",
      credit_hours: parseInt(row["credit_hours"] || row["credits"] || "3") || 3,
    });
    synced++;
  }
  return synced;
}

async function pullStudyCenters(pb: any) {
  const raw = await getGoogleSheetRange(SPREADSHEET_ID, "'STUDY CENTERS'!A1:C50");
  const rows = parseRows(raw);
  let synced = 0;
  for (const row of rows) {
    const name = row["name"];
    if (!name) continue;
    await upsert(pb, "study_centers", "name", name, {
      name,
      location: row["location"] || name,
      status: row["status"] || "active",
    });
    synced++;
  }
  return synced;
}

async function pullStudents(pb: any) {
  const raw = await getGoogleSheetRange(SPREADSHEET_ID, "'07_STUDENTS'!A1:P5000");
  const rows = parseRows(raw);
  let synced = 0;
  for (const row of rows) {
    const studentCode = row["student_code"] || row["student code"];
    const admissionNo = row["admission_no"] || row["admission no"];
    const key = studentCode || admissionNo;
    if (!key) continue;

    await upsert(pb, "students", "student_code", key, {
      student_code: key,
      reg_no: row["reg_no"] || row["reg no"] || "",
      full_name: row["full_name"] || row["full name"] || "",
      first_name: (row["full_name"] || row["full name"] || "").split(" ")[0] || "",
      last_name: (row["full_name"] || row["full name"] || "").split(" ").slice(1).join(" ") || "",
      gender: row["gender"] || "Male",
      date_of_birth: row["date_of_birth"] || row["date of birth"] || "",
      nationality: row["nationality"] || "Kenyan",
      phone: row["phone"] || "",
      email: row["email"] || "",
      admission_no: admissionNo || key,
      admission_date: row["admission_date"] || row["admission date"] || "",
      programme: row["programme"] || "",
      status: row["status"] || "Active",
      graduation_date: row["graduation_date"] || row["graduation date"] || "",
    });
    synced++;
  }
  return synced;
}

async function pullEnrollments(pb: any) {
  const raw = await getGoogleSheetRange(SPREADSHEET_ID, "'08_ENROLLMENTS'!A1:D10000");
  const rows = parseRows(raw);
  let synced = 0;
  for (const row of rows) {
    const studentNum = row["student_number"] || row["student number"];
    const courseCode = row["course_code"] || row["course code"];
    if (!studentNum || !courseCode) continue;

    // Use composite key pattern for enrollment lookup
    try {
      const existing = await getPocketBase()
        .collection("enrollments")
        .getFirstListItem(`student_number="${studentNum}" && course_code="${courseCode}"`)
        .catch(() => null);

      const data = {
        student_number: studentNum,
        course_code: courseCode,
        academic_year: row["academic_year"] || row["academic year"] || "",
        semester: row["semester"] || "",
        status: "enrolled",
      };

      if (existing) {
        await pb.collection("enrollments").update(existing.id, data);
      } else {
        await pb.collection("enrollments").create(data);
      }
      synced++;
    } catch (err) {
      logger.warn(`[PullService] Enrollment skip (${studentNum}/${courseCode}): ${errorMessage(err)}`);
    }
  }
  return synced;
}

async function pullGrades(pb: any) {
  const raw = await getGoogleSheetRange(SPREADSHEET_ID, "'09_GRADES'!A1:I10000");
  const rows = parseRows(raw);
  let synced = 0;
  for (const row of rows) {
    const studentCode = row["student_code"] || row["student code"];
    const courseCode = row["course_code"] || row["course code"];
    if (!studentCode || !courseCode) continue;

    try {
      const existing = await pb
        .collection("grades")
        .getFirstListItem(`student_code="${studentCode}" && course_code="${courseCode}"`)
        .catch(() => null);

      const totalScore = parseFloat(row["total_score"] || row["total score"] || "0") || 0;
      const data = {
        student_code: studentCode,
        course_code: courseCode,
        total_score: totalScore,
        ca_score: parseFloat(row["ca_score"] || row["ca score"] || "0") || 0,
        exam_score: parseFloat(row["exam_score"] || row["exam score"] || "0") || 0,
        letter_grade: row["grade"] || "",
        grade_points: parseFloat(row["grade_point"] || row["grade point"] || "0") || 0,
        remarks: row["remarks"] || (totalScore >= 50 ? "Pass" : "Fail"),
        academic_year: row["academic_year"] || row["academic year"] || "",
      };

      if (existing) {
        await pb.collection("grades").update(existing.id, data);
      } else {
        await pb.collection("grades").create(data);
      }
      synced++;
    } catch (err) {
      logger.warn(`[PullService] Grade skip (${studentCode}/${courseCode}): ${errorMessage(err)}`);
    }
  }
  return synced;
}

// ── Main Pull Orchestrator ────────────────────────────────────────────────────

const PULL_TASKS: Array<{
  name: string;
  sheetLabel: string;
  fn: (pb: any) => Promise<number>;
}> = [
  { name: "pullFaculties",    sheetLabel: "01_FACULTIES",    fn: pullFaculties    },
  { name: "pullDepartments",  sheetLabel: "02_DEPARTMENTS",  fn: pullDepartments  },
  { name: "pullPrograms",     sheetLabel: "03_PROGRAMS",     fn: pullPrograms     },
  { name: "pullCourses",      sheetLabel: "04_COURSES",      fn: pullCourses      },
  { name: "pullStudyCenters", sheetLabel: "STUDY_CENTERS",   fn: pullStudyCenters },
  { name: "pullStudents",     sheetLabel: "07_STUDENTS",     fn: pullStudents     },
  { name: "pullEnrollments",  sheetLabel: "08_ENROLLMENTS",  fn: pullEnrollments  },
  { name: "pullGrades",       sheetLabel: "09_GRADES",       fn: pullGrades       },
];

export async function runFullPull(): Promise<SyncStatus> {
  if (syncState.isRunning) {
    logger.warn("[PullService] Sync already running, skipping duplicate trigger.");
    return getSyncStatus();
  }

  syncState.isRunning = true;
  syncState.errors = [];
  syncState.sheets = {};
  syncState.rowsSynced = 0;
  syncState.rowsFailed = 0;

  const pb = getPocketBase();
  logger.info("[PullService] Starting full Google Sheets pull...");

  for (const task of PULL_TASKS) {
    try {
      const count = await task.fn(pb);
      syncState.sheets[task.sheetLabel] = { rows: count, status: "ok" };
      syncState.rowsSynced += count;
      logger.info(`[PullService] ✓ ${task.sheetLabel}: ${count} rows synced`);
    } catch (err) {
      const msg = errorMessage(err);
      syncState.sheets[task.sheetLabel] = { rows: 0, status: "error", error: msg };
      syncState.errors.push(`${task.sheetLabel}: ${msg}`);
      syncState.rowsFailed++;
      logger.error(`[PullService] ✗ ${task.sheetLabel}: ${msg}`);
    }
  }

  syncState.lastSyncAt = new Date().toISOString();
  syncState.lastSyncResult = syncState.errors.length === 0
    ? "success"
    : syncState.rowsSynced > 0 ? "partial" : "error";
  syncState.isRunning = false;

  logger.info(
    `[PullService] Pull complete. Synced: ${syncState.rowsSynced} rows. Failed: ${syncState.errors.length} sheets.`
  );

  return getSyncStatus();
}
