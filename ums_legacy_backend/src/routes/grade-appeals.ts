/**
 * BMI UMS - Grade Appeals API Routes
 * Manages grade appeal workflow
 */

import { Hono } from "hono";
import { z } from "zod";
import { getPocketBase } from "../services/pocketbase.js";
import { logger } from "../utils/logger.js";
import { errorMessage } from '../utils/helpers.js';
import { authMiddleware, requireRole } from "../middleware/auth.js";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const gradeAppealsRouter = new Hono();
gradeAppealsRouter.use("*", authMiddleware);

const appealSchema = z.object({
  gradeId: z.string().min(1),
  studentId: z.string().min(1),
  courseId: z.string().min(1),
  courseCode: z.string().min(1),
  reason: z.string().min(10).max(500),
  explanation: z.string().min(20).max(5000),
  supportingDocuments: z.array(z.string()).optional(),
  originalGrade: z.string().min(1).max(10),
});

const updateAppealSchema = z.object({
  status: z
    .enum(["Submitted", "Under_Review", "Approved", "Denied", "Withdrawn"])
    .optional(),
  reviewedBy: z.string().optional(),
  reviewNotes: z.string().max(5000).optional(),
  revisedGrade: z.string().max(10).optional(),
});

/**
 * POST /api/v1/grade-appeals
 * Submit a new grade appeal
 */
gradeAppealsRouter.post(
  "/",
  requireRole("admin", "registrar", "faculty", "student"),
  async (c) => {
    try {
      const body = await c.req.json();
      const parsed = appealSchema.safeParse(body);

      if (!parsed.success) {
        return c.json<ApiResponse<never>>(
          {
            success: false,
            error: `Validation error: ${parsed.error.issues.map((e) => e.message).join(", ")}`,
          },
          400,
        );
      }

      const pb = getPocketBase();

      // Check if appeal already exists for this grade
      try {
        const existing = await pb
          .collection("grade_appeals")
          .getFirstListItem(
            `gradeId="${parsed.data.gradeId}" && status!="Denied" && status!="Withdrawn"`,
          );

        if (existing) {
          return c.json<ApiResponse<never>>(
            {
              success: false,
              error: "An active appeal already exists for this grade",
            },
            409,
          );
        }
      } catch (error) {
        // No existing appeal found, continue
      }

      const appealRecord = {
        ...parsed.data,
        status: "Submitted",
        submittedAt: new Date().toISOString(),
      };

      const created = await pb.collection("grade_appeals").create(appealRecord);

      logger.info({
        appealId: created.id,
        gradeId: parsed.data.gradeId,
        studentId: parsed.data.studentId,
      }, "Grade appeal submitted");

      // TODO: Send notification to instructor

      return c.json<ApiResponse<typeof created>>({
        success: true,
        data: created,
        message: "Grade appeal submitted successfully",
      });
    } catch (error) {
      logger.error(`Grade appeal submission error: ${errorMessage(error)}`);
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: "Failed to submit grade appeal",
        },
        500,
      );
    }
  },
);

/**
 * GET /api/v1/grade-appeals
 * Get all grade appeals with optional filtering
 */
gradeAppealsRouter.get(
  "/",
  requireRole("admin", "registrar", "faculty", "staff", "student"),
  async (c) => {
    try {
      const pb = getPocketBase();
      const query = c.req.query();

      const page = parseInt(query.page || "1");
      const perPage = Math.min(parseInt(query.perPage || "50"), 500);
      const studentId = query.studentId;
      const status = query.status;

      let filter = "";
      const filters = [];

      if (studentId) filters.push(`studentId="${studentId}"`);
      if (status) filters.push(`status="${status}"`);

      if (filters.length > 0) {
        filter = filters.join(" && ");
      }

      const result = await pb
        .collection("grade_appeals")
        .getList(page, perPage, {
          filter,
          sort: "-submittedAt",
        });

      return c.json<ApiResponse<typeof result>>({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error(`Grade appeals fetch error: ${errorMessage(error)}`);
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: "Failed to fetch grade appeals",
        },
        500,
      );
    }
  },
);

/**
 * GET /api/v1/grade-appeals/:id
 * Get a specific grade appeal by ID
 */
gradeAppealsRouter.get(
  "/:id",
  requireRole("admin", "registrar", "faculty", "staff", "student"),
  async (c) => {
    try {
      const id = c.req.param("id")!;
      const pb = getPocketBase();

      const appeal = await pb.collection("grade_appeals").getOne(id);

      return c.json<ApiResponse<typeof appeal>>({
        success: true,
        data: appeal,
      });
    } catch (error) {
      logger.error(`Grade appeal fetch error: ${errorMessage(error)}`);
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: "Grade appeal not found",
        },
        404,
      );
    }
  },
);

/**
 * PUT /api/v1/grade-appeals/:id
 * Update a grade appeal (review, approve, deny)
 */
gradeAppealsRouter.put(
  "/:id",
  requireRole("admin", "registrar", "faculty"),
  async (c) => {
    try {
      const id = c.req.param("id")!;
      const body = await c.req.json();
      const parsed = updateAppealSchema.safeParse(body);

      if (!parsed.success) {
        return c.json<ApiResponse<never>>(
          {
            success: false,
            error: `Validation error: ${parsed.error.issues.map((e) => e.message).join(", ")}`,
          },
          400,
        );
      }

      const pb = getPocketBase();

      const updateData: Record<string, unknown> = { ...parsed.data };

      // Set timestamps based on status changes
      if (parsed.data.status === "Under_Review" && !updateData.reviewedAt) {
        updateData.reviewedAt = new Date().toISOString();
      }

      if (
        parsed.data.status === "Approved" ||
        parsed.data.status === "Denied"
      ) {
        updateData.resolvedAt = new Date().toISOString();
      }

      const updated = await pb
        .collection("grade_appeals")
        .update(id, updateData);

      logger.info({
        appealId: id,
        status: parsed.data.status,
      }, "Grade appeal updated");

      // TODO: Send notification to student

      return c.json<ApiResponse<typeof updated>>({
        success: true,
        data: updated,
        message: "Grade appeal updated successfully",
      });
    } catch (error) {
      logger.error(`Grade appeal update error: ${errorMessage(error)}`);
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: "Failed to update grade appeal",
        },
        500,
      );
    }
  },
);

/**
 * DELETE /api/v1/grade-appeals/:id
 * Delete a grade appeal (withdraw)
 */
gradeAppealsRouter.delete(
  "/:id",
  requireRole("admin", "registrar", "faculty", "student"),
  async (c) => {
    try {
      const id = c.req.param("id")!;
      const pb = getPocketBase();

      // Instead of deleting, mark as withdrawn
      await pb.collection("grade_appeals").update(id, {
        status: "Withdrawn",
        resolvedAt: new Date().toISOString(),
      });

      logger.info({ appealId: id }, "Grade appeal withdrawn");

      return c.json<ApiResponse<{ id: string }>>({
        success: true,
        data: { id },
        message: "Grade appeal withdrawn successfully",
      });
    } catch (error) {
      logger.error(`Grade appeal withdrawal error: ${errorMessage(error)}`);
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: "Failed to withdraw grade appeal",
        },
        500,
      );
    }
  },
);

export { gradeAppealsRouter };






