// BMI UMS - Marking Rubrics Routes
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { getPocketBase } from "../services/pocketbase.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";
import { errorMessage } from '../utils/helpers.js';
import type { AppEnv } from "../types/hono.js";
import { ApiResponseSchema, ErrorResponseSchema } from "../openapi/common.js";

const rubricsRouter = new OpenAPIHono<AppEnv>();
rubricsRouter.use("*", authMiddleware);

const rubricCriterionSchema = z.object({
  id: z.string(),
  description: z.string(),
  max_points: z.number().positive(),
  weight: z.number().min(0).max(100),
}).openapi("RubricCriterion");

const rubricSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  course_id: z.string(),
  criteria: z.array(rubricCriterionSchema),
  total_points: z.number().positive(),
}).openapi("Rubric");

// Route definitions
const listRubricsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Academic"],
  summary: "List rubrics",
  description: "Get marking rubrics for courses",
  request: {
    query: z.object({
      course_id: z.string().optional(),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: ApiResponseSchema(z.array(z.any())) } },
      description: "List of rubrics",
    },
    500: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "Server error",
    },
  },
});

const createRubricRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Academic"],
  summary: "Create rubric",
  description: "Define a new marking rubric (Faculty/Admin only)",
  middleware: [requireRole("admin", "faculty")],
  request: {
    body: {
      content: { "application/json": { schema: rubricSchema.omit({ id: true }) } },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: ApiResponseSchema(z.any()) } },
      description: "Rubric created",
    },
    500: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "Server error",
    },
  },
});

// Implement routes
rubricsRouter.openapi(listRubricsRoute, async (c) => {
  try {
    const pb = getPocketBase();
    const { course_id } = c.req.valid("query");

    const filter = course_id ? `course_id = "${course_id}"` : "";
    const records = await pb.collection("rubrics").getFullList({
      filter,
      expand: "course_id",
    });

    return c.json({ success: true, data: records }, 200) as any;
  } catch (error) {
    logger.error(`List rubrics error: ${errorMessage(error)}`);
    return c.json({ success: false, error: "Failed to fetch rubrics" }, 500) as any;
  }
});

rubricsRouter.openapi(createRubricRoute, async (c) => {
  try {
    const data = c.req.valid("json");
    const pb = getPocketBase();

    const record = await pb.collection("rubrics").create(data);
    return c.json({ success: true, data: record }, 201) as any;
  } catch (error) {
    logger.error(`Create rubric error: ${errorMessage(error)}`);
    return c.json({ success: false, error: "Failed to create rubric" }, 500) as any;
  }
});

export default rubricsRouter;






