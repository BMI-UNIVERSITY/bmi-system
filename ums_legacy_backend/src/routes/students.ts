/**
 * BMI UMS - Optimized Students Routes
 * Implements eager loading, caching, and query optimization
 */

import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { auditMiddleware } from "../middleware/audit.js";
import { logger } from "../utils/logger.js";
import { errorMessage } from '../utils/helpers.js';
import { StudentQueries, CacheManager } from "../services/queryOptimizer.js";
import { withPocketBase } from "../services/pocketbasePool.js";
import { isPbError, sanitizeString } from "../utils/helpers.js";
import { sheetsSyncQueue } from "../services/sheetsSyncQueue.js";
import type { AppEnv } from "../types/hono.js";
import { ApiResponseSchema, ErrorResponseSchema } from "../openapi/common.js";

const studentsRouter = new OpenAPIHono<AppEnv>();

// Apply middleware
studentsRouter.use("*", authMiddleware);
studentsRouter.use("*", auditMiddleware);

studentsRouter.use("/", async (c, next) => {
  if (c.req.method === "POST") {
    return requireRole("admin", "registrar")(c, next);
  }
  await next();
});

studentsRouter.use("/stats/overview", requireRole("admin", "registrar"));

studentsRouter.use("/campus/:campusId", requireRole("admin", "registrar", "faculty", "staff"));

studentsRouter.use("/:id", async (c, next) => {
  const method = c.req.method;
  if (method === "PATCH") {
    return requireRole("admin", "registrar")(c, next);
  }
  if (method === "DELETE") {
    return requireRole("admin")(c, next);
  }
  await next();
});

// Validation schemas
const StudentSchema = z
  .object({
    id: z.string().openapi({ example: "123" }),
    student_code: z.string().min(1).openapi({ example: "STU001" }),
    reg_no: z.string().optional().openapi({ example: "REG/2024/001" }),
    full_name: z.string().min(1).openapi({ example: "John Doe" }),
    first_name: z.string().optional().openapi({ example: "John" }),
    last_name: z.string().optional().openapi({ example: "Doe" }),
    email: z
      .string()
      .email()
      .optional()
      .or(z.literal(""))
      .openapi({ example: "john@example.com" }),
    phone: z.string().optional().or(z.literal("")).openapi({ example: "+123456789" }),
    gender: z.enum(["Male", "Female"]).openapi({ example: "Male" }),
    programme: z.string().min(1).openapi({ example: "Diploma in Christian Ministry and Theology" }),
    admission_date: z.string().openapi({ example: "2024-05-19" }),
    status: z
      .enum(["Active", "Inactive", "Applicant", "On Leave", "Graduated", "Suspended"])
      .default("Active")
      .openapi({ example: "Active" }),
    study_center_id: z.string().optional().openapi({ example: "CAMP001" }),
    photo: z.string().optional().openapi({ example: "data:image/jpeg;base64,..." }),
    photo_zoom: z.number().optional().openapi({ example: 1 }),
    photo_position: z.any().optional(),
    mode_of_study: z.string().optional().openapi({ example: "Full-Time" }),
    admissionYear: z.string().optional().openapi({ example: "2024" }),
    year_of_study: z.number().optional().openapi({ example: 1 }),
    graduation_date: z.string().optional().openapi({ example: "2026-05-19" }),
  })
  .openapi("Student");

const StudentInputSchema = StudentSchema.omit({ id: true }).extend({
  student_code: z.string().optional(),
  full_name: z.string().optional(),
  programme: z.string().optional(),
  program_code: z.string().optional(),
});

// Route definitions
const listStudentsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Students"],
  summary: "List students",
  description: "List students with optimized eager loading and pagination",
  request: {
    query: z.object({
      page: z.string().optional().openapi({ example: "1" }),
      perPage: z.string().optional().openapi({ example: "50" }),
      status: z.string().optional().openapi({ example: "Active" }),
      search: z.string().optional().openapi({ example: "John" }),
      study_center_id: z.string().optional().openapi({ example: "CAMP001" }),
      programme: z.string().optional().openapi({ example: "Theology" }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(z.array(StudentSchema)),
        },
      },
      description: "List of students",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Server error",
    },
  },
});

const getStudentRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Students"],
  summary: "Get student by ID",
  description: "Get single student with full academic history",
  request: {
    params: z.object({
      id: z.string().openapi({ example: "123" }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(z.any()), // Use any for full academic history for now
        },
      },
      description: "Student details",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Student not found",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Server error",
    },
  },
});

const createStudentRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Students"],
  summary: "Create student",
  description: "Create a new student record",
  request: {
    body: {
      content: {
        "application/json": {
          schema: StudentInputSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(StudentSchema),
        },
      },
      description: "Student created successfully",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Server error",
    },
  },
});

// Implement routes
studentsRouter.openapi(listStudentsRoute, async (c) => {
  try {
    const { page: p, perPage: pp, status, search, study_center_id, programme } = c.req.valid("query");
    const page = parseInt(p || "1", 10);
    const perPage = Math.min(parseInt(pp || "50", 10), 100);

    const result = await StudentQueries.getWithRelations({
      page,
      perPage,
      campusId: study_center_id && study_center_id !== "all" ? study_center_id : undefined,
      status: status || undefined,
      search: search || undefined,
      programme: programme || undefined,
    });

    return c.json({
      success: true,
      data: result.items as any,
      meta: {
        page: result.page,
        perPage: result.perPage,
        total: result.totalItems,
      },
    }) as any;
  } catch (error) {
    logger.error(`Failed to fetch students: ${errorMessage(error)}`);
    return c.json(
      {
        success: false,
        error: "Failed to fetch students",
      },
      500,
    ) as any;
  }
});

studentsRouter.openapi(getStudentRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");

    const student = await StudentQueries.getWithAcademicHistory(id);

    return c.json({
      success: true,
      data: student,
    }) as any;
  } catch (error) {
    logger.error(`Failed to fetch student: ${errorMessage(error)}`);
    return c.json(
      {
        success: false,
        error:
          isPbError(error) && error.status === 404
            ? "Student not found"
            : "Failed to fetch student",
      },
      (isPbError(error) && error.status === 404 ? 404 : 500) as any,
    ) as any;
  }
});

studentsRouter.openapi(createStudentRoute, async (c) => {
  try {
    const data = c.req.valid("json");

    const student = await withPocketBase(async (pb) => {
      // 1. Resolve student_code
      let student_code = data.student_code;
      if (!student_code) {
        const year = new Date().getFullYear();
        try {
          const lastStudents = await pb.collection("students").getList(1, 1, {
            filter: `student_code ~ "${year}-"`,
            sort: "-student_code",
          });
          if (lastStudents.items.length > 0) {
            const lastCode = lastStudents.items[0].student_code;
            const parts = lastCode.split("-");
            const seq = parseInt(parts[1], 10);
            if (!isNaN(seq)) {
              student_code = `${year}-${String(seq + 1).padStart(4, "0")}`;
            } else {
              student_code = `${year}-0001`;
            }
          } else {
            student_code = `${year}-0001`;
          }
        } catch (error) {
          logger.error(`Failed to query last student code, using fallback generation: ${errorMessage(error)}`);
          const randomPart = String(Math.floor(Math.random() * 9000) + 1000);
          student_code = `${year}-${randomPart}`;
        }
      }

      // 2. Resolve reg_no
      let reg_no = data.reg_no;
      if (!reg_no) {
        const year = new Date().getFullYear();
        const seqPart = student_code.split("-")[1] || "0001";
        reg_no = `THS/${year}/225-${seqPart}`;
      }

      // 3. Resolve full_name — sanitize to prevent stored XSS
      let full_name = data.full_name ? sanitizeString(data.full_name) : undefined;
      const first_name = data.first_name ? sanitizeString(data.first_name) : data.first_name;
      const last_name = data.last_name ? sanitizeString(data.last_name) : data.last_name;
      if (!full_name) {
        full_name = `${first_name || ''} ${last_name || ''}`.trim();
      }

      // 4. Resolve programme text
      let programme = data.programme;
      if (!programme && data.program_code) {
        try {
          const prog = await pb.collection("programs").getOne(data.program_code);
          if (prog) {
            programme = prog.name;
          }
        } catch (error) {
          logger.error(`Failed to query program name: ${errorMessage(error)}`);
        }
      }
      if (!programme) {
        programme = "Diploma in Christian Ministry and Theology";
      }

      return pb.collection("students").create({
        ...data,
        first_name,
        last_name,
        student_code,
        reg_no,
        full_name,
        programme,
        avatar_color: `bg-${["purple", "blue", "green", "yellow", "red", "pink"][Math.floor(Math.random() * 6)]}-600`,
        photo_zoom: 1,
        photo_position: { x: 0, y: 0 },
      });
    });

    CacheManager.invalidate("students");
    sheetsSyncQueue.enqueueStudentSync("create", student.id);

    return c.json(
      {
        success: true,
        data: student as any,
        message: "Student created successfully",
      },
      201,
    ) as any;
  } catch (error) {
    logger.error(`Failed to create student: ${errorMessage(error)}`);
    return c.json(
      {
        success: false,
        error: "Failed to create student",
      },
      500,
    );
  }
});

const updateStudentRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["Students"],
  summary: "Update student",
  description: "Update an existing student record",
  request: {
    params: z.object({
      id: z.string().openapi({ example: "123" }),
    }),
    body: {
      content: {
        "application/json": {
          schema: StudentInputSchema.partial(),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(StudentSchema),
        },
      },
      description: "Student updated successfully",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Student not found",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Server error",
    },
  },
});

const deleteStudentRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Students"],
  summary: "Delete student",
  description: "Delete a student record and cascade delete academic records",
  request: {
    params: z.object({
      id: z.string().openapi({ example: "123" }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(z.null()),
        },
      },
      description: "Student deleted successfully",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Student not found",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Server error",
    },
  },
});

const getStatsRoute = createRoute({
  method: "get",
  path: "/stats/overview",
  tags: ["Students"],
  summary: "Get student statistics",
  description: "Get aggregated statistics for students by status",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(
            z.object({
              total: z.number().openapi({ example: 100 }),
              active: z.number().openapi({ example: 80 }),
              graduated: z.number().openapi({ example: 15 }),
              suspended: z.number().openapi({ example: 5 }),
            }),
          ),
        },
      },
      description: "Student statistics",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Server error",
    },
  },
});

const listByCampusRoute = createRoute({
  method: "get",
  path: "/campus/{campusId}",
  tags: ["Students"],
  summary: "List students by campus",
  description: "List students belonging to a specific campus (cached)",
  request: {
    params: z.object({
      campusId: z.string().openapi({ example: "CAMP001" }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(z.array(StudentSchema)),
        },
      },
      description: "List of students by campus",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Server error",
    },
  },
});

// Implement routes
// ... (existing list, get, create implementation)

studentsRouter.openapi(updateStudentRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const raw = c.req.valid("json");

    // Sanitize name fields to prevent stored XSS
    const data = {
      ...raw,
      ...(raw.full_name !== undefined && { full_name: sanitizeString(raw.full_name) }),
      ...(raw.first_name !== undefined && { first_name: sanitizeString(raw.first_name) }),
      ...(raw.last_name !== undefined && { last_name: sanitizeString(raw.last_name) }),
    };

    const student = await withPocketBase(async (pb) => {
      return pb.collection("students").update(id, data);
    });

    CacheManager.invalidate("students");
    sheetsSyncQueue.enqueueStudentSync("update", student.id);

    return c.json({
      success: true,
      data: student as any,
      message: "Student updated successfully",
    }) as any;
  } catch (error) {
    logger.error(`Failed to update student: ${errorMessage(error)}`);
    return c.json(
      {
        success: false,
        error:
          isPbError(error) && error.status === 404
            ? "Student not found"
            : "Failed to update student",
      },
      (isPbError(error) && error.status === 404 ? 404 : 500) as any,
    ) as any;
  }
});

studentsRouter.openapi(deleteStudentRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");

    await withPocketBase(async (pb) => {
      return pb.collection("students").delete(id);
    });

    CacheManager.invalidate("students");
    sheetsSyncQueue.enqueueStudentSync("delete", id);
    CacheManager.invalidate("grades");
    CacheManager.invalidate("enrollments");

    return c.json({
      success: true,
      data: null,
      message: "Student deleted successfully",
    }) as any;
  } catch (error) {
    logger.error(`Failed to delete student: ${errorMessage(error)}`);
    return c.json(
      {
        success: false,
        error:
          isPbError(error) && error.status === 404
            ? "Student not found"
            : "Failed to delete student",
      },
      (isPbError(error) && error.status === 404 ? 404 : 500) as any,
    ) as any;
  }
});

studentsRouter.openapi(getStatsRoute, async (c) => {
  try {
    const stats = await withPocketBase(async (pb) => {
      const [total, active, graduated, suspended] = await Promise.all([
        pb.collection("students").getList(1, 1),
        pb.collection("students").getList(1, 1, { filter: 'status="Active"' }),
        pb.collection("students").getList(1, 1, { filter: 'status="Graduated"' }),
        pb.collection("students").getList(1, 1, { filter: 'status="Suspended"' }),
      ]);

      return {
        total: total.totalItems,
        active: active.totalItems,
        graduated: graduated.totalItems,
        suspended: suspended.totalItems,
      };
    });

    return c.json({
      success: true,
      data: stats,
    }) as any;
  } catch (error) {
    logger.error(`Failed to fetch student stats: ${errorMessage(error)}`);
    return c.json(
      {
        success: false,
        error: "Failed to fetch statistics",
      },
      500,
    ) as any;
  }
});

studentsRouter.openapi(listByCampusRoute, async (c) => {
  try {
    const { campusId } = c.req.valid("param");

    const result = await StudentQueries.getByCampus(campusId);

    return c.json({
      success: true,
      data: result.items as any,
      meta: {
        page: result.page,
        perPage: result.perPage,
        total: result.totalItems,
      },
    }) as any;
  } catch (error) {
    logger.error(`Failed to fetch students by campus: ${errorMessage(error)}`);
    return c.json(
      {
        success: false,
        error: "Failed to fetch students",
      },
      500,
    ) as any;
  }
});

export default studentsRouter;






