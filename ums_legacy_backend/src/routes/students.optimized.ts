/**
 * BMI UMS - Optimized Students Routes
 * Implements eager loading, caching, and query optimization
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { auditMiddleware } from "../middleware/audit.js";
import { logger } from "../utils/logger.js";
import { errorMessage } from '../utils/helpers.js';
import { StudentQueries, CacheManager } from "../services/queryOptimizer.js";
import { withPocketBase } from "../services/pocketbasePool.js";
import { isPbError } from "../utils/helpers.js";
import type { ApiResponse, Student } from "../types/index.js";

const studentsRouter = new Hono();

// Apply middleware
studentsRouter.use("*", authMiddleware);
studentsRouter.use("*", auditMiddleware);

// Validation schemas
const studentSchema = z.object({
  student_code: z.string().min(1),
  reg_no: z.string().optional(),
  full_name: z.string().min(1),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  gender: z.enum(["Male", "Female"]),
  programme: z.string().min(1),
  admission_date: z.string(),
  status: z
    .enum(["Active", "Inactive", "Graduated", "Suspended"])
    .default("Active"),
  campus_id: z.string().optional(),
});

/**
 * GET /api/v1/students
 * List students with optimized eager loading
 */
studentsRouter.get(
  "/",
  requireRole("admin", "registrar", "faculty", "staff"),
  async (c) => {
    try {
      const page = parseInt(c.req.query("page") || "1", 10);
      const perPage = Math.min(
        parseInt(c.req.query("perPage") || "50", 10),
        100,
      );
      const status = c.req.query("status");
      const search = c.req.query("search");
      const campusId = c.req.query("campus_id");

      // Use optimized query with eager loading
      const result = await StudentQueries.getWithRelations({
        page,
        perPage,
        campusId: campusId && campusId !== "all" ? campusId : undefined,
        status: status || undefined,
        search: search || undefined,
      });

      return c.json<ApiResponse<Student[]>>({
        success: true,
        data: result.items,
        meta: {
          page: result.page,
          perPage: result.perPage,
          total: result.totalItems,
        },
      });
    } catch (error) {
      logger.error(`Failed to fetch students: ${errorMessage(error)}`);
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: "Failed to fetch students",
        },
        500,
      );
    }
  },
);

/**
 * GET /api/v1/students/:id
 * Get single student with full academic history
 */
studentsRouter.get(
  "/:id",
  requireRole("admin", "registrar", "faculty", "staff"),
  async (c) => {
    try {
      const id = c.req.param("id")!;

      // Use optimized query with eager loading
      const student = await StudentQueries.getWithAcademicHistory(id);

      return c.json<ApiResponse<any>>({
        success: true,
        data: student,
      });
    } catch (error) {
      logger.error(`Failed to fetch student: ${errorMessage(error)}`);
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error:
            isPbError(error) && error.status === 404
              ? "Student not found"
              : "Failed to fetch student",
        },
        isPbError(error) && error.status === 404 ? 404 : 500,
      );
    }
  },
);

/**
 * POST /api/v1/students
 * Create new student
 */
studentsRouter.post(
  "/",
  requireRole("admin", "registrar"),
  zValidator("json", studentSchema),
  async (c) => {
    try {
      const data = c.req.valid("json");

      const student = await withPocketBase(async (pb) => {
        return pb.collection("students").create({
          ...data,
          avatar_color: `bg-${["purple", "blue", "green", "yellow", "red", "pink"][Math.floor(Math.random() * 6)]}-600`,
          photo_zoom: 1,
          photo_position: { x: 0, y: 0 },
        });
      });

      // Invalidate cache
      CacheManager.invalidate("students");

      return c.json<ApiResponse<Student>>(
        {
          success: true,
          data: student as unknown as Student,
          message: "Student created successfully",
        },
        201,
      );
    } catch (error) {
      logger.error(`Failed to create student: ${errorMessage(error)}`);
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: "Failed to create student",
        },
        500,
      );
    }
  },
);

/**
 * PATCH /api/v1/students/:id
 * Update student
 */
studentsRouter.patch(
  "/:id",
  requireRole("admin", "registrar"),
  zValidator("json", studentSchema.partial()),
  async (c) => {
    try {
      const id = c.req.param("id")!;
      const data = c.req.valid("json");

      const student = await withPocketBase(async (pb) => {
        return pb.collection("students").update(id, data);
      });

      // Invalidate cache
      CacheManager.invalidate("students");

      return c.json<ApiResponse<Student>>({
        success: true,
        data: student as unknown as Student,
        message: "Student updated successfully",
      });
    } catch (error) {
      logger.error(`Failed to update student: ${errorMessage(error)}`);
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error:
            isPbError(error) && error.status === 404
              ? "Student not found"
              : "Failed to update student",
        },
        isPbError(error) && error.status === 404 ? 404 : 500,
      );
    }
  },
);

/**
 * DELETE /api/v1/students/:id
 * Delete student (cascade deletes academic records)
 */
studentsRouter.delete("/:id", requireRole("admin"), async (c) => {
  try {
    const id = c.req.param("id")!;

    await withPocketBase(async (pb) => {
      return pb.collection("students").delete(id);
    });

    // Invalidate cache
    CacheManager.invalidate("students");
    CacheManager.invalidate("grades");
    CacheManager.invalidate("enrollments");

    return c.json<ApiResponse<null>>({
      success: true,
      data: null,
      message: "Student deleted successfully",
    });
  } catch (error) {
    logger.error(`Failed to delete student: ${errorMessage(error)}`);
    return c.json<ApiResponse<never>>(
      {
        success: false,
        error:
          isPbError(error) && error.status === 404
            ? "Student not found"
            : "Failed to delete student",
      },
      isPbError(error) && error.status === 404 ? 404 : 500,
    );
  }
});

/**
 * GET /api/v1/students/stats/overview
 * Get student statistics
 */
studentsRouter.get(
  "/stats/overview",
  requireRole("admin", "registrar"),
  async (c) => {
    try {
      const stats = await withPocketBase(async (pb) => {
        const [total, active, graduated, suspended] = await Promise.all([
          pb.collection("students").getList(1, 1),
          pb
            .collection("students")
            .getList(1, 1, { filter: 'status="Active"' }),
          pb
            .collection("students")
            .getList(1, 1, { filter: 'status="Graduated"' }),
          pb
            .collection("students")
            .getList(1, 1, { filter: 'status="Suspended"' }),
        ]);

        return {
          total: total.totalItems,
          active: active.totalItems,
          graduated: graduated.totalItems,
          suspended: suspended.totalItems,
        };
      });

      return c.json<ApiResponse<any>>({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error(`Failed to fetch student stats: ${errorMessage(error)}`);
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: "Failed to fetch statistics",
        },
        500,
      );
    }
  },
);

/**
 * GET /api/v1/students/campus/:campusId
 * Get students by campus (cached)
 */
studentsRouter.get(
  "/campus/:campusId",
  requireRole("admin", "registrar", "faculty", "staff"),
  async (c) => {
    try {
      const campusId = c.req.param("campusId")!;

      const result = await StudentQueries.getByCampus(campusId);

      return c.json<ApiResponse<Student[]>>({
        success: true,
        data: result.items,
        meta: {
          page: result.page,
          perPage: result.perPage,
          total: result.totalItems,
        },
      });
    } catch (error) {
      logger.error(`Failed to fetch students by campus: ${errorMessage(error)}`);
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: "Failed to fetch students",
        },
        500,
      );
    }
  },
);

export default studentsRouter;






