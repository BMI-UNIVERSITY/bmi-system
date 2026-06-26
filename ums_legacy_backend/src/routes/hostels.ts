/**
 * BMI UMS - Hostels Routes
 * API-backed CRUD for hostel management (previously localStorage-only).
 */
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { getPocketBase } from "../services/pocketbase.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";
import { errorMessage } from '../utils/helpers.js';
import { HostelQueries, CacheManager } from "../services/queryOptimizer.js";
import { ApiResponseSchema, ErrorResponseSchema } from "../openapi/common.js";
import type { AppEnv } from "../types/hono.js";

const hostelRouter = new OpenAPIHono<AppEnv>();
hostelRouter.use("*", authMiddleware);

hostelRouter.use("/", async (c, next) => {
  if (c.req.method === "POST") {
    return requireRole("admin", "registrar", "staff")(c, next);
  }
  await next();
});

hostelRouter.use("/:id", async (c, next) => {
  const method = c.req.method;
  if (method === "PATCH") {
    return requireRole("admin", "registrar", "staff")(c, next);
  }
  if (method === "DELETE") {
    return requireRole("admin", "registrar")(c, next);
  }
  await next();
});

hostelRouter.use("/assignments", async (c, next) => {
  if (c.req.method === "POST") {
    return requireRole("admin", "registrar", "staff")(c, next);
  }
  await next();
});

hostelRouter.use("/assignments/:id", async (c, next) => {
  if (c.req.method === "DELETE") {
    return requireRole("admin", "registrar")(c, next);
  }
  await next();
});

// Validation schemas
const HostelSchema = z
  .object({
    id: z.string().openapi({ example: "123" }),
    name: z.string().openapi({ example: "Mount Zion Hostel" }),
    type: z.enum(["Male", "Female"]).openapi({ example: "Male" }),
    capacity: z.number().int().positive().openapi({ example: 100 }),
    location: z.string().openapi({ example: "North Wing" }),
    status: z
      .enum(["Available", "Near Capacity", "Full"])
      .openapi({ example: "Available" }),
    created: z.string().openapi({ example: "2024-05-19T03:15:05Z" }),
    updated: z.string().openapi({ example: "2024-05-19T03:15:05Z" }),
  })
  .openapi("Hostel");

const RoomAssignmentSchema = z
  .object({
    id: z.string().openapi({ example: "assignment1" }),
    studentId: z.string().openapi({ example: "STU001" }),
    studentName: z.string().openapi({ example: "John Doe" }),
    hostelId: z.string().openapi({ example: "hostel1" }),
    roomNumber: z.string().openapi({ example: "101" }),
    checkInDate: z.string().openapi({ example: "2024-05-19" }),
    status: z.enum(["Active", "Revoked"]).openapi({ example: "Active" }),
    created: z.string().openapi({ example: "2024-05-19T03:15:05Z" }),
    updated: z.string().openapi({ example: "2024-05-19T03:15:05Z" }),
  })
  .openapi("RoomAssignment");

const HostelInputSchema = HostelSchema.omit({
  id: true,
  created: true,
  updated: true,
});
const RoomAssignmentInputSchema = RoomAssignmentSchema.omit({
  id: true,
  created: true,
  updated: true,
});

// Route definitions
const listHostelsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Hostels"],
  summary: "List all hostels",
  description: "Get a full list of all hostels",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(z.array(HostelSchema)),
        },
      },
      description: "List of hostels",
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

const createHostelRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Hostels"],
  summary: "Create a hostel",
  description: "Create a new hostel record",
  request: {
    body: {
      content: {
        "application/json": {
          schema: HostelInputSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(HostelSchema),
        },
      },
      description: "Hostel created successfully",
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

const updateHostelRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["Hostels"],
  summary: "Update a hostel",
  description: "Update an existing hostel record",
  request: {
    params: z.object({
      id: z.string().openapi({ example: "123" }),
    }),
    body: {
      content: {
        "application/json": {
          schema: HostelInputSchema.partial(),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(HostelSchema),
        },
      },
      description: "Hostel updated successfully",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Hostel not found",
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

const deleteHostelRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Hostels"],
  summary: "Delete a hostel",
  description: "Delete a hostel record",
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
      description: "Hostel deleted successfully",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Hostel not found",
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

const listAssignmentsRoute = createRoute({
  method: "get",
  path: "/assignments",
  tags: ["Hostels"],
  summary: "List room assignments",
  description: "Get a full list of all room assignments",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(z.array(RoomAssignmentSchema)),
        },
      },
      description: "List of room assignments",
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

const createAssignmentRoute = createRoute({
  method: "post",
  path: "/assignments",
  tags: ["Hostels"],
  summary: "Create a room assignment",
  description: "Create a new room assignment record",
  request: {
    body: {
      content: {
        "application/json": {
          schema: RoomAssignmentInputSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(RoomAssignmentSchema),
        },
      },
      description: "Room assignment created successfully",
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

const deleteAssignmentRoute = createRoute({
  method: "delete",
  path: "/assignments/{id}",
  tags: ["Hostels"],
  summary: "Delete a room assignment",
  description: "Delete an existing room assignment record",
  request: {
    params: z.object({
      id: z.string().openapi({ example: "assignment1" }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(z.null()),
        },
      },
      description: "Room assignment deleted successfully",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Room assignment not found",
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
hostelRouter.openapi(listHostelsRoute, async (c) => {
  try {
    const result = await HostelQueries.getHostels();
    return c.json({ success: true, data: result.items as any }, 200);
  } catch (error) {
    logger.error(`List hostels error: ${errorMessage(error)}`);
    return c.json({ success: false, error: "Failed to fetch hostels" }, 500);
  }
});

hostelRouter.openapi(
  createHostelRoute,
  async (c) => {
    try {
      const data = c.req.valid("json");
      const pb = getPocketBase();
      const record = await pb.collection("hostels").create(data);
      CacheManager.invalidate("hostels");
      return c.json({ success: true, data: record as any }, 201);
    } catch (error) {
      logger.error(`Create hostel error: ${errorMessage(error)}`);
      return c.json({ success: false, error: "Failed to create hostel" }, 500);
    }
  },
);

hostelRouter.openapi(
  updateHostelRoute,
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const data = c.req.valid("json");
      const pb = getPocketBase();
      const record = await pb.collection("hostels").update(id, data);
      CacheManager.invalidate("hostels");
      return c.json({ success: true, data: record as any }, 200);
    } catch (error) {
      logger.error(`Update hostel error: ${errorMessage(error)}`);
      return c.json({ success: false, error: "Failed to update hostel" }, 500);
    }
  },
);

hostelRouter.openapi(
  deleteHostelRoute,
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const pb = getPocketBase();
      await pb.collection("hostels").delete(id);
      CacheManager.invalidate("hostels");
      return c.json({ success: true, data: null }, 200);
    } catch (error) {
      logger.error(`Delete hostel error: ${errorMessage(error)}`);
      return c.json({ success: false, error: "Failed to delete hostel" }, 500);
    }
  },
);

hostelRouter.openapi(listAssignmentsRoute, async (c) => {
  try {
    const result = await HostelQueries.getAssignments();
    return c.json({ success: true, data: result.items as any }, 200);
  } catch (error) {
    logger.error(`List room assignments error: ${errorMessage(error)}`);
    return c.json(
      { success: false, error: "Failed to fetch room assignments" },
      500,
    );
  }
});

hostelRouter.openapi(
  createAssignmentRoute,
  async (c) => {
    try {
      const data = c.req.valid("json");
      const pb = getPocketBase();
      const record = await pb.collection("room_assignments").create(data);
      CacheManager.invalidate("room_assignments");
      return c.json({ success: true, data: record as any }, 201);
    } catch (error) {
      logger.error(`Create room assignment error: ${errorMessage(error)}`);
      return c.json(
        { success: false, error: "Failed to create room assignment" },
        500,
      );
    }
  },
);

hostelRouter.openapi(
  deleteAssignmentRoute,
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const pb = getPocketBase();
      await pb.collection("room_assignments").delete(id);
      CacheManager.invalidate("room_assignments");
      return c.json({ success: true, data: null }, 200);
    } catch (error) {
      logger.error(`Delete room assignment error: ${errorMessage(error)}`);
      return c.json(
        { success: false, error: "Failed to delete room assignment" },
        500,
      );
    }
  },
);

export default hostelRouter;






