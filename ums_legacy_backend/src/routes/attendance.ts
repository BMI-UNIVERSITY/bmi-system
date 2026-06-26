// BMI UMS - Attendance Routes
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { getPocketBase } from "../services/pocketbase.js";
import { authMiddleware, getUser } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";
import { errorMessage } from '../utils/helpers.js';
import type { AppEnv } from "../types/hono.js";
import { ApiResponseSchema, ErrorResponseSchema } from "../openapi/common.js";

const attendanceRouter = new OpenAPIHono<AppEnv>();
attendanceRouter.use("*", authMiddleware);

const bulkAttendanceSchema = z.object({
  course_id: z.string().min(1).openapi({ example: "COURSE001" }),
  term_id: z.string().min(1).openapi({ example: "TERM001" }),
  session_date: z.string().min(1).openapi({ example: "2024-05-19T09:00:00Z" }),
  week_number: z.number().int().positive().optional().openapi({ example: 5 }),
  session_type: z.enum(['lecture', 'seminar', 'lab', 'practicum', 'field_education', 'thesis', 'intensive', 'online']).optional().default('lecture').openapi({ example: "lecture" }),
  records: z.array(z.object({
    enrollment_id: z.string().min(1),
    student_id: z.string().min(1),
    status: z.enum(['present', 'absent', 'excused', 'late']),
    notes: z.string().optional(),
  })).min(1),
}).openapi("BulkAttendanceRequest");

// Route definitions
const listAttendanceRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Attendance"],
  summary: "List attendance records",
  description: "Get attendance records with optional filtering by course and date",
  request: {
    query: z.object({
      course_id: z.string().optional().openapi({ example: "COURSE001" }),
      date: z.string().optional().openapi({ example: "2024-05-19" }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: ApiResponseSchema(z.array(z.any())) } },
      description: "List of attendance records",
    },
    500: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "Server error",
    },
  },
});

const studentAttendanceRoute = createRoute({
  method: "get",
  path: "/student/{id}",
  tags: ["Attendance"],
  summary: "Get student attendance",
  description: "Get summary and history for a specific student",
  request: {
    params: z.object({
      id: z.string().openapi({ example: "STUD001" }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: ApiResponseSchema(z.any()) } },
      description: "Student attendance summary",
    },
    500: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "Server error",
    },
  },
});

const bulkAttendanceRoute = createRoute({
  method: "post",
  path: "/bulk",
  tags: ["Attendance"],
  summary: "Bulk record attendance",
  description: "Record or update attendance for a full session in bulk",
  request: {
    body: {
      content: { "application/json": { schema: bulkAttendanceSchema } },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: ApiResponseSchema(z.array(z.any())) } },
      description: "Attendance recorded successfully",
    },
    500: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "Server error",
    },
  },
});

// Implement routes
attendanceRouter.openapi(listAttendanceRoute, async (c) => {
  try {
    const pb = getPocketBase();
    const { course_id: courseId, date } = c.req.valid("query");

    const filters: string[] = [];
    if (courseId) filters.push(`course_id = "${courseId}"`);
    if (date) filters.push(`session_date ~ "${date}"`);

    const filterString = filters.length > 0 ? filters.join(' && ') : '';

    const records = await pb.collection('attendance_records').getFullList({
      sort: '-session_date',
      ...(filterString ? { filter: filterString } : {}),
      expand: 'student_id,course_id,enrollment_id,term_id',
    });

    return c.json({
      success: true,
      data: records,
    }, 200);
  } catch (error) {
    logger.error(`List attendance error: ${errorMessage(error)}`);
    return c.json({
      success: false,
      error: "Failed to fetch attendance records",
    }, 500);
  }
});

attendanceRouter.openapi(studentAttendanceRoute, async (c) => {
  try {
    const { id: studentId } = c.req.valid("param");
    const pb = getPocketBase();

    const records = await pb.collection('attendance_records').getFullList({
      filter: `student_id = "${studentId}"`,
      sort: '-session_date',
      expand: 'course_id',
    });

    // Compute summary
    const summary = {
      total: records.length,
      present: records.filter(r => r.status === 'present').length,
      absent: records.filter(r => r.status === 'absent').length,
      excused: records.filter(r => r.status === 'excused').length,
      late: records.filter(r => r.status === 'late').length,
      rate: 0,
    };

    if (summary.total > 0) {
      const attended = summary.present + summary.late;
      summary.rate = Math.round((attended / (summary.total - summary.excused)) * 100);
    }

    return c.json({
      success: true,
      data: {
        summary,
        history: records,
      },
    }, 200);
  } catch (error) {
    logger.error(`Student attendance error: ${errorMessage(error)}`);
    return c.json({
      success: false,
      error: "Failed to fetch student attendance summary",
    }, 500);
  }
});

attendanceRouter.openapi(bulkAttendanceRoute, async (c) => {
  try {
    const data = c.req.valid("json");
    const pb = getPocketBase();
    const user = getUser(c);

    const createdRecords: any[] = [];

    for (const record of data.records) {
      let existingRecord;
      try {
        existingRecord = await pb.collection('attendance_records').getFirstListItem(
          `student_id = "${record.student_id}" && course_id = "${data.course_id}" && session_date ~ "${data.session_date.split('T')[0]}"`
        );
      } catch (error) { existingRecord = null;
      }

      const payload = {
        enrollment_id: record.enrollment_id,
        student_id: record.student_id,
        course_id: data.course_id,
        term_id: data.term_id,
        session_date: data.session_date,
        week_number: data.week_number,
        session_type: data.session_type,
        status: record.status,
        notes: record.notes,
        recorded_by: user?.id,
      };

      if (existingRecord) {
        const updated = await pb.collection('attendance_records').update(existingRecord.id, payload);
        createdRecords.push(updated);
      } else {
        const created = await pb.collection('attendance_records').create(payload);
        createdRecords.push(created);
      }
    }

    return c.json({
      success: true,
      data: createdRecords,
    }, 201);
  } catch (error) {
    logger.error(`Bulk attendance error: ${errorMessage(error)}`);
    return c.json({
      success: false,
      error: "Failed to record session attendance",
     }, 500);
  }
});

export default attendanceRouter;






