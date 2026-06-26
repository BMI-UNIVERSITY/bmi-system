// BMI UMS - Courses Routes
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { getPocketBase } from "../services/pocketbase.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { auditMiddleware, logAction } from "../middleware/audit.js";
import { logger } from "../utils/logger.js";
import { errorMessage } from '../utils/helpers.js';
import { parsePagination } from "../utils/helpers.js";
import { CourseQueries } from "../services/queryOptimizer.js";
import { sheetsSyncQueue } from "../services/sheetsSyncQueue.js";
import { ApiResponseSchema, ErrorResponseSchema } from "../openapi/common.js";
import type { Course } from "../types/index.js";
import type { AppEnv } from "../types/hono.js";

function mapCourseRecord(record: Record<string, unknown>): Course {
  return {
    id: String(record.id),
    title: String(record.title ?? record.name ?? ""),
    name: String(record.title ?? record.name ?? ""),
    code: String(record.course_code ?? record.code ?? ""),
    faculty: String(record.faculty ?? ""),
    department: String(record.department ?? ""),
    level: (record.level as Course["level"]) || "Undergraduate",
    credits: Number(record.credits ?? 0),
    credit_hours: Number(record.credits ?? record.credit_hours ?? 0),
    status: (record.status as Course["status"]) || "Published",
    description: String(record.description ?? ""),
    syllabus: String(record.syllabus ?? ""),
    created: String(record.created ?? ""),
    updated: String(record.updated ?? ""),
  } as Course;
}

const coursesRouter = new OpenAPIHono<AppEnv>();

// Apply middleware
coursesRouter.use("*", authMiddleware);
coursesRouter.use("*", auditMiddleware);

coursesRouter.use("/", async (c, next) => {
  if (c.req.method === "POST") {
    return requireRole("admin", "registrar", "staff")(c, () => logAction("CREATE", "courses")(c, next));
  }
  await next();
});

coursesRouter.use("/:id", async (c, next) => {
  const method = c.req.method;
  if (method === "PATCH") {
    return requireRole("admin", "registrar", "staff")(c, () => logAction("UPDATE", "courses")(c, next));
  }
  if (method === "DELETE") {
    return requireRole("admin")(c, () => logAction("DELETE", "courses")(c, next));
  }
  await next();
});

// Validation schemas
const CourseSchema = z
  .object({
    id: z.string().openapi({ example: "123" }),
    title: z.string().openapi({ example: "Systematic Theology" }),
    name: z.string().openapi({ example: "Systematic Theology" }),
    code: z.string().openapi({ example: "THEO101" }),
    faculty: z.string().openapi({ example: "Theology" }),
    department: z.string().openapi({ example: "Theology" }),
    level: z
      .enum(["Undergraduate", "Postgraduate", "Diploma", "Certificate"])
      .openapi({ example: "Undergraduate" }),
    credits: z.number().openapi({ example: 3 }),
    credit_hours: z.number().openapi({ example: 45 }),
    status: z
      .enum(["Published", "Draft", "Archived"])
      .openapi({ example: "Published" }),
    description: z.string().openapi({ example: "Introduction to theology..." }),
    syllabus: z.string().openapi({ example: "Week 1: Foundations..." }),
    created: z.string().openapi({ example: "2024-05-19T03:15:05Z" }),
    updated: z.string().openapi({ example: "2024-05-19T03:15:05Z" }),
  })
  .openapi("Course");

const CourseInputSchema = z
  .object({
    name: z.string().min(2).openapi({ example: "Systematic Theology" }),
    code: z.string().min(3).openapi({ example: "THEO101" }),
    faculty: z.string().min(1).openapi({ example: "Theology" }),
    department: z.string().min(1).openapi({ example: "Theology" }),
    level: z
      .enum(["Undergraduate", "Postgraduate", "Diploma", "Certificate"])
      .openapi({ example: "Undergraduate" }),
    credits: z.number().positive().openapi({ example: 3 }),
    status: z.enum(["Published", "Draft", "Archived"]).default("Draft"),
    description: z.string().min(10).openapi({ example: "Introduction to..." }),
    syllabus: z.string().min(10).openapi({ example: "Week 1: ..." }),
  })
  .openapi("CourseInput");

// Route definitions
const listCoursesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Courses"],
  summary: "List courses",
  description: "List courses with pagination and filtering",
  request: {
    query: z.object({
      page: z.string().optional().openapi({ example: "1" }),
      perPage: z.string().optional().openapi({ example: "20" }),
      search: z.string().optional().openapi({ example: "Theology" }),
      status: z.string().optional().openapi({ example: "Published" }),
      study_center_id: z.string().optional().openapi({ example: "CAMP001" }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(z.array(CourseSchema)),
        },
      },
      description: "List of courses",
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

const getCourseStatsRoute = createRoute({
  method: "get",
  path: "/stats/overview",
  tags: ["Courses"],
  summary: "Get course statistics",
  description: "Get aggregated statistics for courses",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(
            z.object({
              total: z.number(),
              byLevel: z.record(z.string(), z.number()),
              byStatus: z.record(z.string(), z.number()),
              byFaculty: z.record(z.string(), z.number()),
              totalCredits: z.number(),
            }),
          ),
        },
      },
      description: "Course statistics",
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

const getCourseRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Courses"],
  summary: "Get course by ID",
  description: "Get details of a single course",
  request: {
    params: z.object({
      id: z.string().openapi({ example: "123" }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(CourseSchema),
        },
      },
      description: "Course details",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Course not found",
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

const createCourseRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Courses"],
  summary: "Create course",
  description: "Create a new course record",
  request: {
    body: {
      content: {
        "application/json": {
          schema: CourseInputSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(CourseSchema),
        },
      },
      description: "Course created successfully",
    },
    409: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Course code already exists",
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

const updateCourseRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["Courses"],
  summary: "Update course",
  description: "Update an existing course record",
  request: {
    params: z.object({
      id: z.string().openapi({ example: "123" }),
    }),
    body: {
      content: {
        "application/json": {
          schema: CourseInputSchema.partial(),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(CourseSchema),
        },
      },
      description: "Course updated successfully",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Course not found",
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

const deleteCourseRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Courses"],
  summary: "Delete course",
  description: "Delete a course record",
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
      description: "Course deleted successfully",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Course not found",
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

// Implementation helpers
function courseDtoToPb(data: any) {
  return {
    course_code: data.code,
    title: data.name,
    credits: data.credits,
    faculty: data.faculty,
    department: data.department,
    level: data.level,
    status: data.status,
    description: data.description,
    syllabus: data.syllabus,
    is_elective: false,
  };
}

function coursePatchToPb(data: any): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (data.name !== undefined) out.title = data.name;
  if (data.code !== undefined) out.course_code = data.code;
  if (data.faculty !== undefined) out.faculty = data.faculty;
  if (data.department !== undefined) out.department = data.department;
  if (data.level !== undefined) out.level = data.level;
  if (data.credits !== undefined) out.credits = data.credits;
  if (data.status !== undefined) out.status = data.status;
  if (data.description !== undefined) out.description = data.description;
  if (data.syllabus !== undefined) out.syllabus = data.syllabus;
  return out;
}

// Implement routes
coursesRouter.openapi(listCoursesRoute, async (c) => {
  try {
    const {
      page: p,
      perPage: pp,
      search,
      status,
      study_center_id,
    } = c.req.valid("query");
    const { page, perPage } = parsePagination(p, pp, {
      page: 1,
      perPage: 20,
      maxPerPage: 500,
    });

    const result = await CourseQueries.getWithDetails({
      page,
      perPage,
      campusId: study_center_id && study_center_id !== "all" ? study_center_id : undefined,
      status: status || undefined,
      search: search || undefined,
    });

    return c.json({
      success: true,
      data: result.items.map((r: any) =>
        mapCourseRecord(r as unknown as Record<string, unknown>),
      ),
      meta: {
        page: result.page,
        perPage: result.perPage,
        total: result.totalItems,
      },
    }, 200);
  } catch (error) {
    logger.error(`Get courses error: ${errorMessage(error)}`);
    return c.json(
      {
        success: false,
        error: "Failed to fetch courses",
      },
      500,
    );
  }
});

coursesRouter.openapi(getCourseStatsRoute, async (c) => {
  try {
    const pb = getPocketBase();

    const [all, ug, pg, dip, cert, published, draft, archived] =
      await Promise.all([
        pb.collection("courses").getList(1, 1),
        pb
          .collection("courses")
          .getList(1, 1, { filter: 'level = "Undergraduate"' }),
        pb
          .collection("courses")
          .getList(1, 1, { filter: 'level = "Postgraduate"' }),
        pb.collection("courses").getList(1, 1, { filter: 'level = "Diploma"' }),
        pb
          .collection("courses")
          .getList(1, 1, { filter: 'level = "Certificate"' }),
        pb
          .collection("courses")
          .getList(1, 1, { filter: 'status = "Published"' }),
        pb.collection("courses").getList(1, 1, { filter: 'status = "Draft"' }),
        pb
          .collection("courses")
          .getList(1, 1, { filter: 'status = "Archived"' }),
      ]);

    const creditRecords = await pb
      .collection("courses")
      .getList(1, 1000, { fields: "faculty,credits" });
    const courses = creditRecords.items.map(
      (r) => mapCourseRecord(r as unknown as Record<string, unknown>),
    );

    const stats = {
      total: all.totalItems,
      byLevel: {
        Undergraduate: ug.totalItems,
        Postgraduate: pg.totalItems,
        Diploma: dip.totalItems,
        Certificate: cert.totalItems,
      },
      byStatus: {
        Published: published.totalItems,
        Draft: draft.totalItems,
        Archived: archived.totalItems,
      },
      byFaculty: courses.reduce((acc: Record<string, number>, c: Course) => {
        const f = c.faculty || "Unknown";
        acc[f] = (acc[f] || 0) + 1;
        return acc;
      }, {}),
      totalCredits: courses.reduce(
        (sum: number, c: Course) => sum + (c.credits || 0),
        0,
      ),
    };

    return c.json({ success: true, data: stats }, 200);
  } catch (error) {
    logger.error(`Get course stats error: ${errorMessage(error)}`);
    return c.json(
      { success: false, error: "Failed to fetch statistics" },
      500,
    );
  }
});

coursesRouter.openapi(getCourseRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const pb = getPocketBase();
    const course = await pb.collection("courses").getOne(id);

    return c.json({
      success: true,
      data: mapCourseRecord(course as unknown as Record<string, unknown>),
    }, 200);
  } catch (error) {
    logger.error(`Get course error: ${errorMessage(error)}`);
    return c.json(
      {
        success: false,
        error: "Course not found",
      },
      404,
    );
  }
});

coursesRouter.openapi(
  createCourseRoute,
  async (c) => {
    try {
      const data = c.req.valid("json");
      const pb = getPocketBase();

      // Check for duplicate course code
      const existing = await pb.collection("courses").getList(1, 1, {
        filter: `course_code = "${data.code.replace(/["'\\]/g, "")}"`,
      });

      if (existing.items.length > 0) {
        return c.json(
          {
            success: false,
            error: "Course code already exists",
          },
          409,
        );
      }

      const newCourse = await pb
        .collection("courses")
        .create(courseDtoToPb(data));

      sheetsSyncQueue.enqueueCourseSync("create", newCourse.id);

      logger.info({ courseId: newCourse.id }, "Course created");

      return c.json(
        {
          success: true,
          data: mapCourseRecord(newCourse as unknown as Record<string, unknown>),
          message: "Course created successfully",
        },
        201,
      );
    } catch (error) {
      logger.error(`Create course error: ${errorMessage(error)}`);
      return c.json(
        {
          success: false,
          error: "Failed to create course",
        },
        500,
      );
    }
  },
);

coursesRouter.openapi(
  updateCourseRoute,
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const data = c.req.valid("json");
      const pb = getPocketBase();

      const updated = await pb
        .collection("courses")
        .update(id, coursePatchToPb(data));

      sheetsSyncQueue.enqueueCourseSync("update", updated.id);

      return c.json({
        success: true,
        data: mapCourseRecord(updated as unknown as Record<string, unknown>),
        message: "Course updated successfully",
      }, 200);
    } catch (error) {
      logger.error(`Update course error: ${errorMessage(error)}`);
      return c.json(
        {
          success: false,
          error: "Failed to update course",
        },
        500,
      );
    }
  },
);

coursesRouter.openapi(
  deleteCourseRoute,
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const pb = getPocketBase();

      await pb.collection("courses").delete(id);

      sheetsSyncQueue.enqueueCourseSync("delete", id);

      return c.json({
        success: true,
        data: null,
        message: "Course deleted successfully",
      }, 200);
    } catch (error) {
      logger.error(`Delete course error: ${errorMessage(error)}`);
      return c.json(
        {
          success: false,
          error: "Failed to delete course",
        },
        500,
      );
    }
  },
);

export default coursesRouter;






