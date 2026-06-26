/**
 * BMI UMS - Grading Scales API Routes
 * Manages grading scale configurations
 */

import { Hono } from "hono";
import { z } from "zod";
import { getPocketBase } from "../services/pocketbase.js";
import { logger } from "../utils/logger.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { errorMessage } from "../utils/helpers.js";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const gradingScalesRouter = new Hono();
gradingScalesRouter.use("*", authMiddleware);

const gradeBoundarySchema = z.object({
  grade: z.string(),
  minScore: z.number().min(0).max(100),
  maxScore: z.number().min(0).max(100),
  gradePoints: z.number().min(0).max(4),
  isPassing: z.boolean(),
});

const gradingScaleSchema = z.object({
  type: z.enum(["US_4_0", "ECTS", "PERCENTAGE", "CUSTOM"]),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  boundaries: z.array(gradeBoundarySchema),
  gradePointMap: z.record(z.string(), z.number()),
  isActive: z.boolean(),
});

/**
 * GET /api/v1/grading-scales
 * Get all grading scales
 */
gradingScalesRouter.get(
  "/",
  requireRole("admin", "registrar", "faculty", "staff", "student"),
  async (c) => {
    try {
      const pb = getPocketBase();
      const query = c.req.query();

      const page = parseInt(query.page || "1");
      const perPage = Math.min(parseInt(query.perPage || "50"), 500);
      const isActive = query.isActive;

      let filter = "";
      if (isActive !== undefined) {
        filter = `isActive=${isActive === "true"}`;
      }

      const result = await pb
        .collection("grading_scales")
        .getList(page, perPage, {
          filter,
          sort: "-created",
        });

      return c.json<ApiResponse<typeof result>>({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error(`Grading scales fetch error: ${errorMessage(error)}`);
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: errorMessage(error) || "Failed to fetch grading scales",
        },
        500,
      );
    }
  },
);

/**
 * GET /api/v1/grading-scales/:id
 * Get a specific grading scale by ID
 */
gradingScalesRouter.get(
  "/:id",
  requireRole("admin", "registrar", "faculty", "staff", "student"),
  async (c) => {
    try {
      const id = c.req.param("id")!;
      const pb = getPocketBase();

      const scale = await pb.collection("grading_scales").getOne(id);

      return c.json<ApiResponse<typeof scale>>({
        success: true,
        data: scale,
      });
    } catch (error) {
      logger.error(`Grading scale fetch error: ${errorMessage(error)}`);
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: errorMessage(error) || "Grading scale not found",
        },
        404,
      );
    }
  },
);

/**
 * POST /api/v1/grading-scales
 * Create a new grading scale
 */
gradingScalesRouter.post("/", requireRole("admin", "registrar"), async (c) => {
  try {
    const body = await c.req.json();
    const parsed = gradingScaleSchema.safeParse(body);

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
    const created = await pb.collection("grading_scales").create(parsed.data);

    logger.info({
      scaleId: created.id,
      type: parsed.data.type,
      name: parsed.data.name,
    }, "Grading scale created successfully");

    return c.json<ApiResponse<typeof created>>({
      success: true,
      data: created,
      message: "Grading scale created successfully",
    });
  } catch (error) {
    logger.error(`Grading scale creation error: ${errorMessage(error)}`);
    return c.json<ApiResponse<never>>(
      {
        success: false,
        error: errorMessage(error) || "Failed to create grading scale",
      },
      500,
    );
  }
});

/**
 * PUT /api/v1/grading-scales/:id
 * Update an existing grading scale
 */
gradingScalesRouter.put(
  "/:id",
  requireRole("admin", "registrar"),
  async (c) => {
    try {
      const id = c.req.param("id")!;
      const body = await c.req.json();
      const parsed = gradingScaleSchema.partial().safeParse(body);

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
      const updated = await pb
        .collection("grading_scales")
        .update(id, parsed.data);

      logger.info({ scaleId: id }, "Grading scale updated successfully");

      return c.json<ApiResponse<typeof updated>>({
        success: true,
        data: updated,
        message: "Grading scale updated successfully",
      });
    } catch (error) {
      logger.error(`Grading scale update error: ${errorMessage(error)}`);
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: errorMessage(error) || "Failed to update grading scale",
        },
        500,
      );
    }
  },
);

/**
 * DELETE /api/v1/grading-scales/:id
 * Delete a grading scale
 */
gradingScalesRouter.delete("/:id", requireRole("admin"), async (c) => {
  try {
    const id = c.req.param("id")!;
    const pb = getPocketBase();

    await pb.collection("grading_scales").delete(id);

    logger.info({ scaleId: id }, "Grading scale deleted successfully");

    return c.json<ApiResponse<{ id: string }>>({
      success: true,
      data: { id },
      message: "Grading scale deleted successfully",
    });
  } catch (error) {
    logger.error(`Grading scale deletion error: ${errorMessage(error)}`);
    return c.json<ApiResponse<never>>(
      {
        success: false,
        error: errorMessage(error) || "Failed to delete grading scale",
      },
      500,
    );
  }
});

export { gradingScalesRouter };






