// BMI UMS - Timetabling & Scheduling Routes
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { getPocketBase } from "../services/pocketbase.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";
import { errorMessage } from '../utils/helpers.js';
import type { AppEnv } from "../types/hono.js";
import { ApiResponseSchema, ErrorResponseSchema } from "../openapi/common.js";

const scheduleRouter = new OpenAPIHono<AppEnv>();
scheduleRouter.use("*", authMiddleware);

const scheduleSchema = z.object({
  id: z.string(),
  course_id: z.string(),
  instructor_id: z.string(),
  classroom_id: z.string(),
  term_id: z.string(),
  day_of_week: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  recurrence: z.enum(["weekly", "once", "bi-weekly"]).default("weekly"),
}).openapi("Schedule");

const createScheduleSchema = scheduleSchema.omit({ id: true });

// Route definitions
const listSchedulesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Timetabling"],
  summary: "List schedules",
  description: "Get all class schedules with filters",
  request: {
    query: z.object({
      course_id: z.string().optional(),
      instructor_id: z.string().optional(),
      classroom_id: z.string().optional(),
      term_id: z.string().optional(),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: ApiResponseSchema(z.array(z.any())) } },
      description: "List of schedules",
    },
    500: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "Server error",
    },
  },
});

const createScheduleRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Timetabling"],
  summary: "Create schedule",
  description: "Add a new class schedule (Admin/Registrar only)",
  middleware: [requireRole("admin", "registrar")],
  request: {
    body: {
      content: { "application/json": { schema: createScheduleSchema } },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: ApiResponseSchema(z.any()) } },
      description: "Schedule created",
    },
    400: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "Validation error or conflict",
    },
  },
});

// Implement routes
scheduleRouter.openapi(listSchedulesRoute, async (c) => {
  try {
    const pb = getPocketBase();
    const query = c.req.valid("query");

    const filters: string[] = [];
    if (query.course_id) filters.push(`course_id = "${query.course_id}"`);
    if (query.instructor_id) filters.push(`instructor_id = "${query.instructor_id}"`);
    if (query.classroom_id) filters.push(`classroom_id = "${query.classroom_id}"`);
    if (query.term_id) filters.push(`term_id = "${query.term_id}"`);

    const records = await pb.collection("schedules").getFullList({
      filter: filters.join(" && "),
      expand: "course_id,instructor_id,classroom_id,term_id",
      sort: "day_of_week,start_time",
    });

    return c.json({ success: true, data: records }, 200) as any;
  } catch (error) {
    logger.error(`List schedules error: ${errorMessage(error)}`);
    return c.json({ success: false, error: "Failed to fetch schedules" }, 500) as any;
  }
});

scheduleRouter.openapi(createScheduleRoute, async (c) => {
  try {
    const data = c.req.valid("json");
    const pb = getPocketBase();

    // Basic collision detection
    const existing = await pb.collection("schedules").getFullList({
      filter: `classroom_id = "${data.classroom_id}" && day_of_week = "${data.day_of_week}" && term_id = "${data.term_id}"`,
    });

    const hasConflict = existing.some(s => {
      return (data.start_time < s.end_time && data.end_time > s.start_time);
    });

    if (hasConflict) {
      return c.json({ success: false, error: "Classroom conflict detected for this time slot" }, 400) as any;
    }

    const record = await pb.collection("schedules").create(data);
    return c.json({ success: true, data: record }, 201) as any;
  } catch (error) {
    logger.error(`Create schedule error: ${errorMessage(error)}`);
    return c.json({ success: false, error: "Failed to create schedule" }, 500) as any;
  }
});

export default scheduleRouter;






