// BMI UMS - Study Centers Routes
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { getPocketBase, authenticateAdmin } from "../services/pocketbase.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { auditMiddleware } from "../middleware/audit.js";
import { logger } from "../utils/logger.js";
import { errorMessage } from '../utils/helpers.js';
import { parsePagination, sanitizeFilter } from "../utils/helpers.js";
import { ApiResponseSchema, ErrorResponseSchema } from "../openapi/common.js";
import { sheetsSyncQueue } from "../services/sheetsSyncQueue.js";
import type { AppEnv } from "../types/hono.js";

const studyCentersRouter = new OpenAPIHono<AppEnv>();

// Apply middleware
studyCentersRouter.use("*", authMiddleware);
studyCentersRouter.use("*", auditMiddleware);

studyCentersRouter.use("/", async (c, next) => {
  if (c.req.method === "POST") {
    return requireRole("admin")(c, next);
  }
  await next();
});

studyCentersRouter.use("/:id", async (c, next) => {
  const method = c.req.method;
  if (method === "PATCH" || method === "DELETE") {
    return requireRole("admin")(c, next);
  }
  await next();
});

// Validation schemas
const StudyCenterSchema = z
  .object({
    id: z.string().openapi({ example: "123" }),
    name: z.string().openapi({ example: "Main Study Center" }),
    code: z.string().openapi({ example: "MAIN" }),
    location: z.string().openapi({ example: "Nairobi, Kenya" }),
    status: z.enum(["active", "inactive"]).openapi({ example: "active" }),
    created: z.string().openapi({ example: "2024-05-19T03:15:05Z" }),
    updated: z.string().openapi({ example: "2024-05-19T03:15:05Z" }),
  })
  .openapi("StudyCenter");

const StudyCenterInputSchema = z
  .object({
    name: z.string().min(1).max(100).openapi({ example: "Main Study Center" }),
    code: z.string().min(1).max(50).openapi({ example: "MAIN" }),
    location: z.string().min(1).max(100).openapi({ example: "Nairobi, Kenya" }),
    status: z.enum(["active", "inactive"]).default("active"),
  })
  .openapi("StudyCenterInput");

// Route definitions
const listStudyCentersRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Study Centers"],
  summary: "List study centers",
  description: "List all study centers with pagination and filtering",
  request: {
    query: z.object({
      page: z.string().optional().openapi({ example: "1" }),
      perPage: z.string().optional().openapi({ example: "50" }),
      status: z.string().optional().openapi({ example: "active" }),
      search: z.string().optional().openapi({ example: "Main" }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(z.array(StudyCenterSchema)),
        },
      },
      description: "List of study centers",
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

const listAllStudyCentersRoute = createRoute({
  method: "get",
  path: "/all",
  tags: ["Study Centers"],
  summary: "List all study centers (no pagination)",
  description: "Get a full list of all active study centers for dropdowns",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(z.array(StudyCenterSchema)),
        },
      },
      description: "All active study centers",
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

const getStudyCenterRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Study Centers"],
  summary: "Get study center by ID",
  description: "Get details of a single study center",
  request: {
    params: z.object({
      id: z.string().openapi({ example: "123" }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(StudyCenterSchema),
        },
      },
      description: "Study center details",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Study center not found",
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

const createStudyCenterRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Study Centers"],
  summary: "Create study center",
  description: "Create a new study center record",
  request: {
    body: {
      content: {
        "application/json": {
          schema: StudyCenterInputSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(StudyCenterSchema),
        },
      },
      description: "Study center created successfully",
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

const updateStudyCenterRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["Study Centers"],
  summary: "Update study center",
  description: "Update an existing study center record",
  request: {
    params: z.object({
      id: z.string().openapi({ example: "123" }),
    }),
    body: {
      content: {
        "application/json": {
          schema: StudyCenterInputSchema.partial(),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(StudyCenterSchema),
        },
      },
      description: "Study center updated successfully",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Study center not found",
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

const deleteStudyCenterRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Study Centers"],
  summary: "Delete study center",
  description: "Delete a study center record",
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
      description: "Study center deleted successfully",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Study center not found",
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
studyCentersRouter.openapi(listStudyCentersRoute, async (c) => {
  try {
    const pb = getPocketBase();
    if (!pb.authStore.isValid) {
      await authenticateAdmin();
    }

    const { page: p, perPage: pp, status, search } = c.req.valid("query");
    const { page, perPage } = parsePagination(p, pp, {
      page: 1,
      perPage: 50,
      maxPerPage: 100,
    });

    const filters: string[] = [];
    if (status) filters.push(`status = "${sanitizeFilter(status)}"`);
    if (search) {
      const s = sanitizeFilter(search);
      filters.push(`(name ~ "${s}" || code ~ "${s}" || location ~ "${s}")`);
    }

    const filterString = filters.length > 0 ? filters.join(" && ") : "";

    const result = await pb.collection("study_centers").getList(page, perPage, {
      sort: "name",
      ...(filterString ? { filter: filterString } : {}),
    });

    return c.json({
      success: true,
      data: result.items as any,
      meta: {
        page: result.page,
        perPage: result.perPage,
        total: result.totalItems,
      },
    }, 200);
  } catch (error) {
    logger.error(`Get study centers error: ${errorMessage(error)}`);
    return c.json(
      {
        success: false,
        error: "Failed to fetch study centers",
      },
      500,
    );
  }
});

studyCentersRouter.openapi(listAllStudyCentersRoute, async (c) => {
  try {
    const pb = getPocketBase();
    const result = await pb.collection("study_centers").getFullList({
      filter: 'status = "active"',
      sort: "name",
    });

    return c.json({
      success: true,
      data: result as any,
    }, 200);
  } catch (error) {
    logger.error(`Get all study centers error: ${errorMessage(error)}`);
    return c.json(
      {
        success: false,
        error: "Failed to fetch all study centers",
      },
      500,
    );
  }
});

studyCentersRouter.openapi(getStudyCenterRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const pb = getPocketBase();
    const study_center = await pb.collection("study_centers").getOne(id);

    return c.json({
      success: true,
      data: study_center as any,
    }, 200);
  } catch (error) {
    logger.error(`Get study center error: ${errorMessage(error)}`);
    return c.json(
      {
        success: false,
        error: "Study center not found",
      },
      404,
    );
  }
});

studyCentersRouter.openapi(createStudyCenterRoute, async (c) => {
  try {
    const data = c.req.valid("json");
    const pb = getPocketBase();
    const study_center = await pb.collection("study_centers").create(data);

    sheetsSyncQueue.enqueueCampusSync("create", study_center.id);

    return c.json(
      {
        success: true,
        data: study_center as any,
        message: "Study center created successfully",
      },
      201,
    );
  } catch (error) {
    logger.error(`Create study center error: ${errorMessage(error)}`);
    return c.json(
      {
        success: false,
        error: "Failed to create study center",
      },
      500,
    );
  }
});

studyCentersRouter.openapi(updateStudyCenterRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const pb = getPocketBase();
    const study_center = await pb.collection("study_centers").update(id, data);

    sheetsSyncQueue.enqueueCampusSync("update", study_center.id);

    return c.json({
      success: true,
      data: study_center as any,
      message: "Study center updated successfully",
    }, 200);
  } catch (error) {
    logger.error(`Update study center error: ${errorMessage(error)}`);
    return c.json(
      {
        success: false,
        error: "Failed to update study center",
      },
      500,
    );
  }
});

studyCentersRouter.openapi(deleteStudyCenterRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const pb = getPocketBase();
    await pb.collection("study_centers").delete(id);

    sheetsSyncQueue.enqueueCampusSync("delete", id);

    return c.json({
      success: true,
      data: null,
      message: "Study center deleted successfully",
    }, 200);
  } catch (error) {
    logger.error(`Delete study center error: ${errorMessage(error)}`);
    return c.json(
      {
        success: false,
        error: "Failed to delete study center",
      },
      500,
    );
  }
});

export default studyCentersRouter;






