// BMI UMS - Grade Routes
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  🔒 LOCKED FILE — DO NOT MODIFY THE DUAL-COLLECTION FETCH LOGIC        ║
// ║                                                                          ║
// ║  This file intentionally queries BOTH the 'grades' AND                  ║
// ║  'academic_records' PocketBase collections on every read request.        ║
// ║  This is by design: imported data lives in 'academic_records' while     ║
// ║  faculty-submitted grades live in 'grades'. Removing either query will  ║
// ║  cause grade data to silently disappear from the frontend.              ║
// ║                                                                          ║
// ║  Last locked: 2026-06-02  |  Author: BMI UMS System                    ║
// ╚══════════════════════════════════════════════════════════════════════════╝
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { getPocketBase } from "../services/pocketbase.js";
import { authMiddleware, requireRole, getUser } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";
import { errorMessage } from '../utils/helpers.js';
import { sheetsSyncQueue } from "../services/sheetsSyncQueue.js";
import { ApiResponseSchema, ErrorResponseSchema } from "../openapi/common.js";
import type { AppEnv } from "../types/hono.js";

const gradeRouter = new OpenAPIHono<AppEnv>();
gradeRouter.use("*", authMiddleware);

gradeRouter.use("/", async (c, next) => {
  if (c.req.method === "POST") {
    return requireRole("admin", "registrar", "faculty")(c, next);
  }
  await next();
});

gradeRouter.use("/:id", async (c, next) => {
  if (c.req.method === "PUT") {
    return requireRole("admin", "registrar", "faculty")(c, next);
  }
  await next();
});

const GRADE_SCALE = [
  { min: 70, letter: "A", points: 4.0 },
  { min: 65, letter: "B+", points: 3.5 },
  { min: 60, letter: "B", points: 3.0 },
  { min: 55, letter: "C+", points: 2.5 },
  { min: 50, letter: "C", points: 2.0 },
  { min: 45, letter: "D", points: 1.0 },
  { min: 0, letter: "F", points: 0.0 },
];

function computeGrade(totalScore: number, maxScore = 100) {
  const pct = (totalScore / maxScore) * 100;
  const grade =
    GRADE_SCALE.find((g) => pct >= g.min) ?? GRADE_SCALE[GRADE_SCALE.length - 1];
  return { percentage: pct, letterGrade: grade.letter, gradePoints: grade.points };
}

/**
 * 🔒 [LOCKED] mapGradeToFrontend
 * ─────────────────────────────────────────────────────────────────────────────
 * Normalises a raw PocketBase record from EITHER the 'grades' OR the
 * 'academic_records' collection into the single flat shape expected by all
 * frontend components (Grades.tsx, Transcripts.tsx, StudentPortal.tsx, etc.).
 *
 * Field-resolution order is intentional:
 *   - g.grade_letter  → 'grades' collection field
 *   - g.letter_grade  → 'grades' legacy alias
 *   - g.grade         → 'academic_records' field  ← DO NOT REMOVE
 *   - g.gpa           → 'grades' collection field
 *   - g.grade_points  → 'grades' legacy alias
 *   - g.grade_point   → 'academic_records' field  ← DO NOT REMOVE
 *   - g.total_score   → shared field (both collections)
 *   - g.percentage    → 'grades' collection field
 *
 * DO NOT simplify this function by removing any fallback chains.
 */
function mapGradeToFrontend(g: any, _options: any = {}) {
  const enrollment = g.expand?.enrollment_id;
  const student = g.expand?.student_id || enrollment?.expand?.student_number;
  const course = g.expand?.course_id || enrollment?.expand?.course_code;
  const term = g.expand?.term_id;

  // 🔒 LOCKED: totalScore must check both collection field names
  const totalScore = g.percentage ?? g.total_score ?? 0;

  return {
    id: g.id,
    studentId: student?.id || g.student_id || '',
    studentName: student ? `${student.first_name || ''} ${student.last_name || ''}`.trim() : 'Unknown',
    studentCode: student?.student_number ?? student?.student_code ?? '',
    courseId: course?.id || g.course_id || '',
    courseCode: course?.course_code ?? course?.code ?? '',
    courseName: course?.title || 'Unknown',
    numericGrade: totalScore,
    // 🔒 LOCKED: all three aliases must be checked — they come from different collections
    letterGrade: g.grade_letter ?? g.letter_grade ?? g.grade ?? '',
    gradePoints: g.gpa ?? g.grade_points ?? g.grade_point ?? 0,
    academicYear: enrollment?.academic_year ?? g.academic_year ?? '2025',
    semester: enrollment?.semester ?? term?.name ?? g.semester ?? '',
    status: g.status || 'submitted',
    createdAt: g.created,
    updatedAt: g.updated,
    credits: course?.credits ?? course?.credit_hours ?? 0,
    components: g.components ?? [],
  };
}

/**
 * 🔒 [LOCKED] fetchAllRecords
 * ─────────────────────────────────────────────────────────────────────────────
 * Abstracts over PocketBase SDK vs Vitest mocks so both production and test
 * environments work. Called for EACH collection (grades + academic_records)
 * inside the list handler. Do not collapse these into a single call.
 */
async function fetchAllRecords(collectionObj: any, options: any) {
  if (typeof collectionObj.getFullList === 'function') {
    return await collectionObj.getFullList(options);
  } else {
    const res = await collectionObj.getList(1, 100, options);
    return res.items || [];
  }
}

const GradeSubmitSchema = z.object({
  enrollmentId: z.string().min(1),
  cat1Score: z.number().min(0).max(100).optional(),
  cat2Score: z.number().min(0).max(100).optional(),
  assignmentScore: z.number().min(0).max(100).optional(),
  examScore: z.number().min(0).max(100),
  remarks: z.string().optional(),
}).openapi("GradeSubmit");

const GradeUpdateSchema = z.object({
  components: z.array(z.object({
    componentId: z.string().optional(),
    componentType: z.string().optional(),
    score: z.number().min(0),
    maxScore: z.number().min(1).optional(),
    weight: z.number().min(0).optional(),
    gradedAt: z.string().optional(),
  })).optional(),
  status: z.string().optional(),
  gradingScaleType: z.string().optional(),
}).openapi("GradeUpdate");

// Route definitions
/**
 * 🔒 [LOCKED] Core Grade Listing API Route Contract
 * ─────────────────────────────────────────────────────────────────────────────
 * This endpoint serves as the primary data fetcher for all frontend grade listings,
 * transcripts, GPA calculations, and certificates.
 * 
 * It MUST query, unify, and deduplicate records from BOTH the "grades" and
 * "academic_records" collections to support both faculty entry and imported data.
 */
const listGradesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Grades"],
  summary: "List grades",
  description: "Get grades with optional student/course filters",
  request: {
    query: z.object({
      student_id: z.string().optional(),
      course_id: z.string().optional(),
      term_id: z.string().optional(),
      study_center_id: z.string().optional(),
      academic_year: z.string().optional(),
      semester: z.string().optional(),
      grade: z.string().optional(),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: ApiResponseSchema(z.any()) } },
      description: "List of grades",
    },
    500: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "Server error",
    },
  },
});

const getGradeRoute = createRoute({
  method: "get",
  path: "/:id",
  tags: ["Grades"],
  summary: "Get grade by ID",
  description: "Retrieve a specific grade record by its ID",
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: ApiResponseSchema(z.any()) } },
      description: "Grade details",
    },
    404: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "Grade not found",
    },
    500: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "Server error",
    },
  },
});

const submitGradeRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Grades"],
  summary: "Submit grade",
  description: "Submit a new grade record (Faculty/Admin only)",
  request: {
    body: {
      content: { "application/json": { schema: GradeSubmitSchema } },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: ApiResponseSchema(z.any()) } },
      description: "Grade submitted",
    },
    404: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "Enrollment not found",
    },
    500: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "Server error",
    },
  },
});

const updateGradeRoute = createRoute({
  method: "put",
  path: "/:id",
  tags: ["Grades"],
  summary: "Update grade",
  description: "Update a grade record and recalculate final scores (Faculty/Admin only)",
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: {
      content: { "application/json": { schema: GradeUpdateSchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: ApiResponseSchema(z.any()) } },
      description: "Grade updated",
    },
    404: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "Grade not found",
    },
    500: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "Server error",
    },
  },
});

// ─── Route Implementations ───────────────────────────────────────────────────
//
// 🔒 PERSISTENT LOCK — DUAL COLLECTION MERGE
// ─────────────────────────────────────────────────────────────────────────────
// All grade READ operations below MUST query both 'grades' AND 'academic_records'.
// This is not optional. The two collections coexist permanently:
//
//   • 'academic_records'  — populated by CSV/Excel bulk import scripts
//                           Contains 640+ real student scores imported from the
//                           institution's spreadsheet system.
//
//   • 'grades'            — populated by faculty using the grade-entry UI
//                           Contains scores submitted after system go-live.
//
// Both are the canonical source of truth for their respective records.
// A restart, migration, or refactor must never remove either fetch.
gradeRouter.openapi(listGradesRoute, async (c) => {
  try {
    const pb = getPocketBase();
    const { student_id, course_id, term_id, study_center_id, academic_year, semester, grade } = c.req.valid("query");

    const gradesFilters: string[] = [];
    if (student_id) gradesFilters.push(`student_id = "${student_id}"`);
    if (course_id) gradesFilters.push(`course_id = "${course_id}"`);
    if (term_id) gradesFilters.push(`term_id = "${term_id}"`);
    if (academic_year) gradesFilters.push(`academic_year = "${academic_year}"`);
    if (semester) gradesFilters.push(`(semester = "${semester}" || semester_number = "${semester}")`);
    if (grade) gradesFilters.push(`(letter_grade = "${grade}" || grade_letter = "${grade}")`);
    if (study_center_id) gradesFilters.push(`student_id.study_center_id = "${study_center_id}"`);
    const gradesFilterString = gradesFilters.join(" && ");

    const arFilters: string[] = [];
    if (student_id) arFilters.push(`student_id = "${student_id}"`);
    if (course_id) arFilters.push(`course_id = "${course_id}"`);
    if (academic_year) arFilters.push(`academic_year = "${academic_year}"`);
    if (semester) arFilters.push(`semester = "${semester}"`);
    if (grade) arFilters.push(`grade = "${grade}"`);
    if (study_center_id) arFilters.push(`student_id.study_center_id = "${study_center_id}"`);
    const arFilterString = arFilters.join(" && ");

    let grades: any[] = [];
    let ar: any[] = [];

    try {
      grades = await fetchAllRecords(pb.collection("grades"), {
        sort: "-created",
        ...(gradesFilterString ? { filter: gradesFilterString } : {}),
        expand: "student_id,student_id.study_center_id,course_id,course_id.module_id,enrollment_id,enrollment_id.student_number,enrollment_id.course_code,term_id",
      });
    } catch (err) {
      logger.warn(`Failed to fetch from grades collection: ${errorMessage(err)}`);
    }

    try {
      ar = await fetchAllRecords(pb.collection("academic_records"), {
        sort: "-created",
        ...(arFilterString ? { filter: arFilterString } : {}),
        expand: "student_id,student_id.study_center_id,course_id,course_id.module_id",
      });
    } catch (err) {
      logger.warn(`Failed to fetch from academic_records collection: ${errorMessage(err)}`);
    }

    const gradeItems = grades.map((g: any) => mapGradeToFrontend(g));
    const arItems = ar.map((g: any) => mapGradeToFrontend(g));

    // Merge and deduplicate by studentId + courseCode
    const merged = new Map<string, any>();
    for (const item of arItems) {
      const key = `${item.studentId}_${item.courseCode || item.courseId}`;
      merged.set(key, item);
    }
    for (const item of gradeItems) {
      const key = `${item.studentId}_${item.courseCode || item.courseId}`;
      merged.set(key, item);
    }

    const items = Array.from(merged.values());

    // ─────────────────────────────────────────────────────────────────────────
    // 🔒 LOCKED: Runtime Health Guard
    // If BOTH collections are empty when querying for a specific student,
    // loudly warn the console. This helps catch accidental deletions or
    // misconfigured environments.
    // ─────────────────────────────────────────────────────────────────────────
    if (items.length === 0 && student_id) {
      logger.warn(`[HEALTH GUARD] ZERO grade records found for student ${student_id} across BOTH 'grades' and 'academic_records' collections. This is highly unusual and may indicate data loss or a misconfigured database connection.`);
    }

    items.sort((a: any, b: any) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return c.json({ success: true, data: { items } }, 200);
  } catch (error) {
    logger.error(`List grades error: ${errorMessage(error)}`);
    return c.json({ success: false, error: "Failed to fetch grades" }, 500);
  }
});

gradeRouter.openapi(getGradeRoute, async (c) => {
  try {
    const pb = getPocketBase();
    const id = c.req.param("id");

    let record: any = null;
    try {
      record = await pb.collection("grades").getOne(id, {
        expand: "student_id,student_id.study_center_id,course_id,course_id.module_id,enrollment_id,enrollment_id.student_number,enrollment_id.course_code,term_id",
      });
    } catch (error) {
      try {
        record = await pb.collection("academic_records").getOne(id, {
          expand: "student_id,student_id.study_center_id,course_id,course_id.module_id",
        });
      } catch (error2) {
        return c.json({ success: false, error: "Grade not found" }, 404);
      }
    }

    if (!record) {
      return c.json({ success: false, error: "Grade not found" }, 404);
    }

    return c.json({ success: true, data: mapGradeToFrontend(record) }, 200);
  } catch (error) {
    if ((error as any).status === 404) {
      return c.json({ success: false, error: "Grade not found" }, 404);
    }
    logger.error(`Get grade error: ${errorMessage(error)}`);
    return c.json({ success: false, error: "Failed to fetch grade" }, 500);
  }
});

gradeRouter.openapi(submitGradeRoute, async (c) => {
  try {
    const data = c.req.valid("json");
    const pb = getPocketBase();
    const user = getUser(c);

    const enrollment = await pb.collection("enrollments").getOne(data.enrollmentId);
    if (!enrollment) return c.json({ success: false, error: "Enrollment not found" }, 404);

    const total = (data.cat1Score ?? 0) + (data.cat2Score ?? 0) + (data.assignmentScore ?? 0) + data.examScore;
    const { letterGrade, gradePoints } = computeGrade(total);

    const gradeRecord = await pb.collection("grades").create({
      enrollment_id: enrollment.id,
      student_id: enrollment.student_id,
      course_id: enrollment.course_id,
      term_id: enrollment.term_id,
      academic_year: enrollment.academic_year || "2024/2025",
      semester_number: enrollment.semester_number || 1,
      cat_1_score: data.cat1Score,
      cat_2_score: data.cat2Score,
      assignment_score: data.assignmentScore,
      exam_score: data.examScore,
      total_score: total,
      letter_grade: letterGrade,
      grade_points: gradePoints,
      status: "submitted",
      remarks: data.remarks,
      graded_by: user?.id,
      graded_at: new Date().toISOString(),
    });

    try {
      sheetsSyncQueue.enqueueGradeSync(gradeRecord.id);
    } catch (error) {
      logger.warn(`Failed to enqueue sheets sync: ${errorMessage(error)}`);
    }

    return c.json({ success: true, data: gradeRecord }, 201);
  } catch (error) {
    logger.error(`Submit grade error: ${errorMessage(error)}`);
    return c.json({ success: false, error: "Failed to submit grade" }, 500);
  }
});

gradeRouter.openapi(updateGradeRoute, async (c) => {
  try {
    const id = c.req.param("id");
    const data = c.req.valid("json");
    const pb = getPocketBase();

    // Fetch existing grade
    let existing: any = null;
    let isAcademicRecord = false;
    try {
      existing = await pb.collection("grades").getOne(id, {
        expand: "student_id,student_id.study_center_id,course_id,course_id.module_id,enrollment_id,enrollment_id.student_number,enrollment_id.course_code,term_id",
      });
    } catch (error) {
      try {
        existing = await pb.collection("academic_records").getOne(id, {
          expand: "student_id,student_id.study_center_id,course_id,course_id.module_id",
        });
        isAcademicRecord = true;
      } catch (error2) {
        return c.json({ success: false, error: "Grade not found" }, 404);
      }
    }

    if (!existing) {
      return c.json({ success: false, error: "Grade not found" }, 404);
    }

    let totalScore = existing.percentage ?? existing.total_score ?? 0;
    let letterGrade = existing.grade_letter ?? existing.letter_grade ?? existing.grade ?? "";
    let gradePoints = existing.gpa ?? existing.grade_points ?? existing.grade_point ?? 0;

    if (data.components && data.components.length > 0) {
      let totalWeight = 0;
      let weightedSum = 0;
      for (const comp of data.components) {
        const score = comp.score ?? 0;
        const maxScore = comp.maxScore ?? 100;
        const weight = comp.weight ?? 100;
        weightedSum += (score / maxScore) * weight;
        totalWeight += weight;
      }
      totalScore = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
      
      const computed = computeGrade(totalScore);
      letterGrade = computed.letterGrade;
      gradePoints = computed.gradePoints;
    }

    const updatePayload: any = isAcademicRecord
      ? {
          total_score: totalScore,
          grade: letterGrade,
          grade_point: gradePoints,
        }
      : {
          total_score: totalScore,
          percentage: totalScore,
          letter_grade: letterGrade,
          grade_letter: letterGrade,
          grade_points: gradePoints,
          gpa: gradePoints,
        };

    if (data.status && !isAcademicRecord) {
      updatePayload.status = data.status;
    }

    const targetCollection = isAcademicRecord ? "academic_records" : "grades";
    const updatedRecord = await pb.collection(targetCollection).update(id, updatePayload);
    
    // Merge components into returned object
    const responseData = mapGradeToFrontend({
      ...updatedRecord,
      expand: existing.expand,
      components: data.components || existing.components || [],
    });

    try {
      sheetsSyncQueue.enqueueGradeSync(id);
    } catch (error) {
      logger.warn(`Failed to enqueue sheets sync: ${errorMessage(error)}`);
    }

    return c.json({ success: true, data: responseData }, 200);
  } catch (error) {
    if ((error as any).status === 404) {
      return c.json({ success: false, error: "Grade not found" }, 404);
    }
    logger.error(`Update grade error: ${errorMessage(error)}`);
    return c.json({ success: false, error: "Failed to update grade" }, 500);
  }
});

export default gradeRouter;






