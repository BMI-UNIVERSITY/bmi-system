// BMI UMS - Staff Routes
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { getPocketBase } from "../services/pocketbase.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { auditMiddleware } from "../middleware/audit.js";
import { logger } from "../utils/logger.js";
import { errorMessage } from '../utils/helpers.js';
import { parsePagination, parseName } from "../utils/helpers.js";
import { StaffQueries } from "../services/queryOptimizer.js";
import { ApiResponseSchema, ErrorResponseSchema } from "../openapi/common.js";
import { sheetsSyncQueue } from "../services/sheetsSyncQueue.js";
import type { StaffMember } from "../types/index.js";
import type { AppEnv } from "../types/hono.js";

function mapStaffRecord(record: Record<string, unknown>): StaffMember {
  const names = parseName(String(record.full_name || record.name || ""));
  const fn = String((record.first_name ?? names.first) || "");
  const ln = String((record.last_name ?? names.last) || "");
  const full = `${fn} ${ln}`.trim();
  return {
    id: String(record.id),
    staff_number: String(record.staff_number ?? record.id),
    first_name: fn,
    last_name: ln,
    name:
      full ||
      (names.first
        ? `${names.first} ${names.last}`.trim()
        : String(record.name ?? "Staff")),
    role: String(record.role ?? ""),
    department: String(record.department ?? ""),
    email: String(record.email ?? ""),
    phone: String(record.phone ?? ""),
    status: (record.status as StaffMember["status"]) || "Full-time",
    category: (record.category as StaffMember["category"]) || "Academic",
    specialization: String(record.specialization ?? ""),
    office: String(record.office ?? ""),
    officeHours: String(record.office_hours ?? record.officeHours ?? ""),
    avatarColor: String(
      record.avatar_color ?? record.avatarColor ?? "bg-purple-700",
    ),
    joinDate: String(record.join_date ?? record.joinDate ?? ""),
    created: String(record.created ?? ""),
    updated: String(record.updated ?? ""),
  } as StaffMember;
}

const staffRouter = new OpenAPIHono<AppEnv>();

// Apply middleware
staffRouter.use("*", authMiddleware);
staffRouter.use("*", auditMiddleware);

staffRouter.use("/", async (c, next) => {
  if (c.req.method === "POST") {
    return requireRole("admin")(c, next);
  }
  await next();
});

staffRouter.use("/:id", async (c, next) => {
  const method = c.req.method;
  if (method === "PATCH" || method === "DELETE") {
    return requireRole("admin")(c, next);
  }
  await next();
});

// Validation schemas
const StaffMemberSchema = z
  .object({
    id: z.string().openapi({ example: "123" }),
    staff_number: z.string().openapi({ example: "STF001" }),
    first_name: z.string().openapi({ example: "Jane" }),
    last_name: z.string().openapi({ example: "Smith" }),
    name: z.string().openapi({ example: "Jane Smith" }),
    role: z.string().openapi({ example: "Senior Lecturer" }),
    department: z.string().openapi({ example: "Theology" }),
    email: z.string().email().openapi({ example: "jane.smith@bmiuniversity.org" }),
    phone: z.string().openapi({ example: "+123456789" }),
    status: z
      .enum(["Full-time", "Part-time", "On Leave"])
      .openapi({ example: "Full-time" }),
    category: z
      .enum(["Academic", "Administrative", "Management"])
      .openapi({ example: "Academic" }),
    specialization: z.string().openapi({ example: "Systematic Theology" }),
    office: z.string().openapi({ example: "Room 302" }),
    officeHours: z.string().openapi({ example: "Mon-Fri 9am-5pm" }),
    avatarColor: z.string().openapi({ example: "bg-purple-700" }),
    joinDate: z.string().openapi({ example: "2023-01-15" }),
    created: z.string().openapi({ example: "2024-05-19T03:15:05Z" }),
    updated: z.string().openapi({ example: "2024-05-19T03:15:05Z" }),
  })
  .openapi("StaffMember");

const StaffInputSchema = z
  .object({
    name: z.string().min(2).openapi({ example: "Jane Smith" }),
    role: z.string().min(1).openapi({ example: "Senior Lecturer" }),
    department: z.string().min(1).openapi({ example: "Theology" }),
    email: z.string().email().openapi({ example: "jane.smith@bmiuniversity.org" }),
    phone: z.string().min(10).openapi({ example: "1234567890" }),
    status: z
      .enum(["Full-time", "Part-time", "On Leave"])
      .default("Full-time")
      .openapi({ example: "Full-time" }),
    category: z
      .enum(["Academic", "Administrative", "Management"])
      .default("Academic")
      .openapi({ example: "Academic" }),
    specialization: z.string().min(1).openapi({ example: "Systematic Theology" }),
    office: z.string().min(1).openapi({ example: "Room 302" }),
    officeHours: z.string().min(1).openapi({ example: "Mon-Fri 9am-5pm" }),
    joinDate: z.string().min(1).openapi({ example: "2023-01-15" }),
  })
  .openapi("StaffInput");

// Route definitions
const listStaffRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Staff"],
  summary: "List staff members",
  description: "List staff with pagination and filtering",
  request: {
    query: z.object({
      page: z.string().optional().openapi({ example: "1" }),
      perPage: z.string().optional().openapi({ example: "20" }),
      department: z.string().optional().openapi({ example: "Theology" }),
      category: z.string().optional().openapi({ example: "Academic" }),
      search: z.string().optional().openapi({ example: "Jane" }),
      study_center_id: z.string().optional().openapi({ example: "CAMP001" }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(z.array(StaffMemberSchema)),
        },
      },
      description: "List of staff members",
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

const getStaffStatsRoute = createRoute({
  method: "get",
  path: "/stats/overview",
  tags: ["Staff"],
  summary: "Get staff statistics",
  description: "Get aggregated statistics for staff members",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(
            z.object({
              total: z.number(),
              byCategory: z.record(z.string(), z.number()),
              byStatus: z.record(z.string(), z.number()),
              byDepartment: z.record(z.string(), z.number()),
            }),
          ),
        },
      },
      description: "Staff statistics",
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

const getDepartmentsRoute = createRoute({
  method: "get",
  path: "/meta/departments",
  tags: ["Staff"],
  summary: "Get departments",
  description: "Get a list of all unique departments in the system",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(z.array(z.string())),
        },
      },
      description: "List of departments",
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

const getStaffRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Staff"],
  summary: "Get staff by ID",
  description: "Get details of a single staff member",
  request: {
    params: z.object({
      id: z.string().openapi({ example: "123" }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(StaffMemberSchema),
        },
      },
      description: "Staff member details",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Staff member not found",
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

const createStaffRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Staff"],
  summary: "Create staff member",
  description: "Create a new staff member record",
  request: {
    body: {
      content: {
        "application/json": {
          schema: StaffInputSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(StaffMemberSchema),
        },
      },
      description: "Staff member created",
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

const updateStaffRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["Staff"],
  summary: "Update staff member",
  description: "Update an existing staff member record",
  request: {
    params: z.object({
      id: z.string().openapi({ example: "123" }),
    }),
    body: {
      content: {
        "application/json": {
          schema: StaffInputSchema.partial(),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(StaffMemberSchema),
        },
      },
      description: "Staff member updated",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Staff member not found",
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

const deleteStaffRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Staff"],
  summary: "Delete staff member",
  description: "Delete a staff member record",
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
      description: "Staff member deleted",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Staff member not found",
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
function staffDtoToPb(data: any, id: string, avatarColor: string) {
  const parts = data.name.trim().split(/\s+/);
  const first_name = parts[0] || "Staff";
  const last_name = parts.slice(1).join(" ") || "Member";
  return {
    id,
    staff_number: id,
    first_name,
    last_name,
    email: data.email,
    phone: data.phone,
    role: data.role,
    department: data.department,
    category: data.category,
    specialization: data.specialization,
    office: data.office,
    office_hours: data.officeHours,
    status: data.status,
    join_date: data.joinDate,
    avatar_color: avatarColor,
  };
}

function patchDtoToPb(data: any): Record<string, unknown> {
  const out: Record<string, unknown> = { ...data };
  if (data.officeHours !== undefined) {
    out.office_hours = data.officeHours;
    delete out.officeHours;
  }
  if (data.joinDate !== undefined) {
    out.join_date = data.joinDate;
    delete out.joinDate;
  }
  if (data.name !== undefined) {
    const parts = data.name.trim().split(/\s+/);
    out.first_name = parts[0] || "Staff";
    out.last_name = parts.slice(1).join(" ") || "Member";
    delete out.name;
  }
  return out;
}

// Implement routes
staffRouter.openapi(listStaffRoute, async (c) => {
  try {
    const {
      page: p,
      perPage: pp,
      department,
      category,
      search,
      study_center_id,
    } = c.req.valid("query");
    const { page, perPage } = parsePagination(p, pp, {
      page: 1,
      perPage: 20,
      maxPerPage: 500,
    });

    const result = await StaffQueries.getWithDetails({
      page,
      perPage,
      campusId: study_center_id && study_center_id !== "all" ? study_center_id : undefined,
      department: department || undefined,
      category: category || undefined,
      search: search || undefined,
    });

    return c.json({
      success: true,
      data: result.items.map((r: any) =>
        mapStaffRecord(r as unknown as Record<string, unknown>),
      ),
      meta: {
        page: result.page,
        perPage: result.perPage,
        total: result.totalItems,
      },
    }, 200);
  } catch (error) {
    logger.error(`Get staff error: ${errorMessage(error)}`);
    return c.json(
      {
        success: false,
        error: "Failed to fetch staff",
      },
      500,
    );
  }
});

staffRouter.openapi(getStaffStatsRoute, async (c) => {
  try {
    const pb = getPocketBase();

    const [all, academic, admin, mgmt, fulltime, parttime, onleave] =
      await Promise.all([
        pb.collection("staff").getList(1, 1),
        pb
          .collection("staff")
          .getList(1, 1, { filter: 'category = "Academic"' }),
        pb
          .collection("staff")
          .getList(1, 1, { filter: 'category = "Administrative"' }),
        pb
          .collection("staff")
          .getList(1, 1, { filter: 'category = "Management"' }),
        pb
          .collection("staff")
          .getList(1, 1, { filter: 'status = "Full-time"' }),
        pb
          .collection("staff")
          .getList(1, 1, { filter: 'status = "Part-time"' }),
        pb.collection("staff").getList(1, 1, { filter: 'status = "On Leave"' }),
      ]);

    const deptRecords = await pb
      .collection("staff")
      .getList(1, 500, { fields: "department" });
    const byDepartment = deptRecords.items.reduce(
      (acc: Record<string, number>, s) => {
        const rec = s as unknown as { department?: string };
        const d = String(rec.department || "");
        if (d) acc[d] = (acc[d] || 0) + 1;
        return acc;
      },
      {},
    );

    const stats = {
      total: all.totalItems,
      byCategory: {
        Academic: academic.totalItems,
        Administrative: admin.totalItems,
        Management: mgmt.totalItems,
      },
      byStatus: {
        "Full-time": fulltime.totalItems,
        "Part-time": parttime.totalItems,
        "On Leave": onleave.totalItems,
      },
      byDepartment,
    };

    return c.json({ success: true, data: stats }, 200);
  } catch (error) {
    logger.error(`Get staff stats error: ${errorMessage(error)}`);
    return c.json(
      { success: false, error: "Failed to fetch statistics" },
      500,
    );
  }
});

staffRouter.openapi(getDepartmentsRoute, async (c) => {
  try {
    const pb = getPocketBase();
    const records = await pb
      .collection("staff")
      .getList(1, 500, { fields: "department" });
    const departments = [
      ...new Set(
        records.items
          .map((s) => String((s as { department?: string }).department || ""))
          .filter(Boolean),
      ),
    ].sort();
    return c.json({ success: true, data: departments }, 200);
  } catch (error) {
    logger.error(`Get departments error: ${errorMessage(error)}`);
    return c.json(
      { success: false, error: "Failed to fetch departments" },
      500,
    );
  }
});

staffRouter.openapi(getStaffRoute, async (c) => {
  try {
    const pb = getPocketBase();
    const { id } = c.req.valid("param");
    const staff = await pb.collection("staff").getOne(id);

    return c.json({
      success: true,
      data: mapStaffRecord(staff as unknown as Record<string, unknown>),
    }, 200);
  } catch (error) {
    logger.error(`Get staff member error: ${errorMessage(error)}`);
    return c.json(
      {
        success: false,
        error: "Staff member not found",
      },
      404,
    );
  }
});

staffRouter.openapi(createStaffRoute, async (c) => {
  try {
    const data = c.req.valid("json");
    const pb = getPocketBase();

    const id = Math.random().toString(36).substring(2, 17);
    const avatarColor = `bg-${["purple", "blue", "green", "yellow", "red", "pink"][Math.floor(Math.random() * 6)]}-700`;

    const pbData = staffDtoToPb(data, id, avatarColor);
    const record = await pb.collection("staff").create(pbData);

    sheetsSyncQueue.enqueueStaffSync("create", record.id);

    return c.json(
      {
        success: true,
        data: mapStaffRecord(record as unknown as Record<string, unknown>),
      },
      201,
    );
  } catch (error) {
    logger.error(`Create staff error: ${errorMessage(error)}`);
    return c.json(
      {
        success: false,
        error: "Failed to create staff member",
      },
      500,
    );
  }
});

staffRouter.openapi(updateStaffRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const pb = getPocketBase();

    const pbData = patchDtoToPb(data);
    const record = await pb.collection("staff").update(id, pbData);

    sheetsSyncQueue.enqueueStaffSync("update", record.id);

    return c.json({
      success: true,
      data: mapStaffRecord(record as unknown as Record<string, unknown>),
    }, 200);
  } catch (error) {
    logger.error(`Update staff error: ${errorMessage(error)}`);
    return c.json(
      {
        success: false,
        error: "Failed to update staff member",
      },
      500,
    );
  }
});

staffRouter.openapi(deleteStaffRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const pb = getPocketBase();

    await pb.collection("staff").delete(id);

    sheetsSyncQueue.enqueueStaffSync("delete", id);

    return c.json({
      success: true,
      data: null,
    }, 200);
  } catch (error) {
    logger.error(`Delete staff error: ${errorMessage(error)}`);
    return c.json(
      {
        success: false,
        error: "Failed to delete staff member",
      },
      500,
    );
  }
});

export default staffRouter;






