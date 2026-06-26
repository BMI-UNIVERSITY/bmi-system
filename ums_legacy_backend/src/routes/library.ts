// BMI UMS - Library Routes
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { getPocketBase } from "../services/pocketbase.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { auditMiddleware, logAction } from "../middleware/audit.js";
import { logger } from "../utils/logger.js";
import { errorMessage } from '../utils/helpers.js';
import { LibraryQueries, CacheManager } from "../services/queryOptimizer.js";
import {
  parsePagination,
} from "../utils/helpers.js";
import { ApiResponseSchema, ErrorResponseSchema } from "../openapi/common.js";
import type { LibraryItem } from "../types/index.js";
import type { AppEnv } from "../types/hono.js";

const libraryRouter = new OpenAPIHono<AppEnv>();

// Apply middleware
libraryRouter.use("*", authMiddleware);
libraryRouter.use("*", auditMiddleware);

libraryRouter.use("/", async (c, next) => {
  if (c.req.method === "POST") {
    return requireRole("admin", "registrar", "staff")(c, () => logAction("CREATE", "library")(c, next));
  }
  await next();
});

libraryRouter.use("/:id", async (c, next) => {
  const method = c.req.method;
  if (method === "PATCH") {
    return requireRole("admin", "registrar", "staff")(c, () => logAction("UPDATE", "library")(c, next));
  }
  if (method === "DELETE") {
    return requireRole("admin")(c, () => logAction("DELETE", "library")(c, next));
  }
  await next();
});

libraryRouter.use("/:id/borrow", async (c, next) => {
  if (c.req.method === "POST") {
    return requireRole("admin", "registrar", "staff")(c, () => logAction("UPDATE", "library")(c, next));
  }
  await next();
});

libraryRouter.use("/:id/return", async (c, next) => {
  if (c.req.method === "POST") {
    return requireRole("admin", "registrar", "staff")(c, () => logAction("UPDATE", "library")(c, next));
  }
  await next();
});

// Validation schemas
const LibraryItemSchema = z
  .object({
    id: z.string().openapi({ example: "LIB-2024-123" }),
    title: z.string().openapi({ example: "Introduction to Theology" }),
    author: z.string().openapi({ example: "John Smith" }),
    category: z
      .enum(["Theology", "ICT", "Business", "Education", "General"])
      .openapi({ example: "Theology" }),
    type: z
      .enum(["PDF", "E-Book", "Hardcopy", "Journal", "Video"])
      .openapi({ example: "PDF" }),
    status: z
      .enum(["Digital", "Available", "Borrowed", "Reserved"])
      .openapi({ example: "Digital" }),
    year: z.string().openapi({ example: "2023" }),
    description: z.string().openapi({ example: "A comprehensive guide..." }),
    downloadUrl: z.string().optional().openapi({ example: "https://..." }),
    location: z.string().optional().openapi({ example: "Shelf A1" }),
    isbn: z.string().optional().openapi({ example: "978-3-16-148410-0" }),
    created: z.string().openapi({ example: "2024-05-19T03:15:05Z" }),
    updated: z.string().openapi({ example: "2024-05-19T03:15:05Z" }),
  })
  .openapi("LibraryItem");

const LibraryItemInputSchema = z
  .object({
    title: z.string().min(2).openapi({ example: "Introduction to Theology" }),
    author: z.string().min(1).openapi({ example: "John Smith" }),
    category: z
      .enum(["Theology", "ICT", "Business", "Education", "General"])
      .openapi({ example: "Theology" }),
    type: z
      .enum(["PDF", "E-Book", "Hardcopy", "Journal", "Video"])
      .openapi({ example: "PDF" }),
    status: z
      .enum(["Digital", "Available", "Borrowed", "Reserved"])
      .default("Available"),
    year: z.string().min(4).openapi({ example: "2023" }),
    description: z.string().min(10).openapi({ example: "A comprehensive..." }),
    downloadUrl: z.string().url().optional().or(z.literal("")),
    location: z.string().optional().openapi({ example: "Shelf A1" }),
    isbn: z.string().optional().openapi({ example: "978-3-16-148410-0" }),
  })
  .openapi("LibraryItemInput");

// Route definitions
const listLibraryItemsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Library"],
  summary: "List library items",
  description: "List library items with pagination and filtering",
  request: {
    query: z.object({
      page: z.string().optional().openapi({ example: "1" }),
      perPage: z.string().optional().openapi({ example: "20" }),
      category: z.string().optional().openapi({ example: "Theology" }),
      type: z.string().optional().openapi({ example: "PDF" }),
      status: z.string().optional().openapi({ example: "Available" }),
      search: z.string().optional().openapi({ example: "Theology" }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(z.array(LibraryItemSchema)),
        },
      },
      description: "List of library items",
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

const getLibraryItemRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Library"],
  summary: "Get library item by ID",
  description: "Get details of a single library item",
  request: {
    params: z.object({
      id: z.string().openapi({ example: "LIB-2024-123" }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(LibraryItemSchema),
        },
      },
      description: "Library item details",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Library item not found",
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

const createLibraryItemRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Library"],
  summary: "Create library item",
  description: "Create a new library item record",
  request: {
    body: {
      content: {
        "application/json": {
          schema: LibraryItemInputSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(LibraryItemSchema),
        },
      },
      description: "Library item created successfully",
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

const updateLibraryItemRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["Library"],
  summary: "Update library item",
  description: "Update an existing library item record",
  request: {
    params: z.object({
      id: z.string().openapi({ example: "LIB-2024-123" }),
    }),
    body: {
      content: {
        "application/json": {
          schema: LibraryItemInputSchema.partial(),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(LibraryItemSchema),
        },
      },
      description: "Library item updated successfully",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Library item not found",
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

const deleteLibraryItemRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Library"],
  summary: "Delete library item",
  description: "Delete a library item record",
  request: {
    params: z.object({
      id: z.string().openapi({ example: "LIB-2024-123" }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(z.null()),
        },
      },
      description: "Library item deleted successfully",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Library item not found",
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

const borrowItemRoute = createRoute({
  method: "post",
  path: "/{id}/borrow",
  tags: ["Library"],
  summary: "Borrow library item",
  description: "Mark a library item as borrowed",
  request: {
    params: z.object({
      id: z.string().openapi({ example: "LIB-2024-123" }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(LibraryItemSchema),
        },
      },
      description: "Item marked as borrowed",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Item not available",
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

const returnItemRoute = createRoute({
  method: "post",
  path: "/{id}/return",
  tags: ["Library"],
  summary: "Return library item",
  description: "Mark a library item as available",
  request: {
    params: z.object({
      id: z.string().openapi({ example: "LIB-2024-123" }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(LibraryItemSchema),
        },
      },
      description: "Item marked as available",
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
libraryRouter.openapi(listLibraryItemsRoute, async (c) => {
  try {
    const {
      page: p,
      perPage: pp,
      category,
      type,
      status,
      search,
    } = c.req.valid("query");
    const { page, perPage } = parsePagination(p, pp, {
      page: 1,
      perPage: 20,
      maxPerPage: 500,
    });

    const result = await LibraryQueries.getWithDetails({
      page,
      perPage,
      category: category || undefined,
      type: type || undefined,
      status: status || undefined,
      search: search || undefined,
    });

    return c.json({
      success: true,
      data: result.items as unknown as LibraryItem[],
      meta: {
        page: result.page,
        perPage: result.perPage,
        total: result.totalItems,
      },
    }, 200);
  } catch (error) {
    logger.error(`Get library items error: ${errorMessage(error)}`);
    return c.json(
      {
        success: false,
        error: "Failed to fetch library items",
      },
      500,
    );
  }
});

libraryRouter.openapi(getLibraryItemRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const pb = getPocketBase();

    const item = await pb.collection("library_items").getOne(id);

    return c.json({
      success: true,
      data: item as unknown as LibraryItem,
    }, 200);
  } catch (error) {
    logger.error(`Get library item error: ${errorMessage(error)}`);
    return c.json(
      {
        success: false,
        error: "Library item not found",
      },
      404,
    );
  }
});

libraryRouter.openapi(
  createLibraryItemRoute,
  async (c) => {
    try {
      const data = c.req.valid("json");
      const pb = getPocketBase();

      // Generate item ID
      const year = new Date().getFullYear();
      const randomSuffix = Math.floor(Math.random() * 900) + 100;
      const itemId = `LIB-${year}-${randomSuffix}`;

      const newItem = await pb.collection("library_items").create({
        id: itemId,
        ...data,
      });

      CacheManager.invalidate("library_items");
      logger.info({ itemId: newItem.id }, "Library item created");

      return c.json(
        {
          success: true,
          data: newItem as unknown as LibraryItem,
          message: "Library item added successfully",
        },
        201,
      );
    } catch (error) {
      logger.error(`Create library item error: ${errorMessage(error)}`);
      return c.json(
        {
          success: false,
          error: "Failed to add library item",
        },
        500,
      );
    }
  },
);

libraryRouter.openapi(
  updateLibraryItemRoute,
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const data = c.req.valid("json");
      const pb = getPocketBase();

      const updated = await pb.collection("library_items").update(id, data);

      CacheManager.invalidate("library_items");
      logger.info({ itemId: id }, "Library item updated");

      return c.json({
        success: true,
        data: updated as unknown as LibraryItem,
        message: "Library item updated successfully",
      }, 200);
    } catch (error) {
      logger.error(`Update library item error: ${errorMessage(error)}`);
      return c.json(
        {
          success: false,
          error: "Failed to update library item",
        },
        500,
      );
    }
  },
);

libraryRouter.openapi(
  deleteLibraryItemRoute,
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const pb = getPocketBase();

      await pb.collection("library_items").delete(id);

      CacheManager.invalidate("library_items");
      logger.info({ itemId: id }, "Library item deleted");

      return c.json({
        success: true,
        data: null,
        message: "Library item deleted successfully",
      }, 200);
    } catch (error) {
      logger.error(`Delete library item error: ${errorMessage(error)}`);
      return c.json(
        {
          success: false,
          error: "Failed to delete library item",
        },
        500,
      );
    }
  },
);

libraryRouter.openapi(
  borrowItemRoute,
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const pb = getPocketBase();

      const item = (await pb
        .collection("library_items")
        .getOne(id)) as unknown as LibraryItem;

      if (item.status !== "Available" && item.status !== "Digital") {
        return c.json(
          {
            success: false,
            error: `Item is currently ${item.status.toLowerCase()}`,
          },
          400,
        );
      }

      const updated = await pb.collection("library_items").update(id, {
        status: "Borrowed",
      });

      CacheManager.invalidate("library_items");
      logger.info({ itemId: id }, "Library item borrowed");

      return c.json({
        success: true,
        data: updated as unknown as LibraryItem,
        message: "Item marked as borrowed",
      }, 200);
    } catch (error) {
      logger.error(`Borrow item error: ${errorMessage(error)}`);
      return c.json(
        {
          success: false,
          error: "Failed to process borrow request",
        },
        500,
      );
    }
  },
);

libraryRouter.openapi(
  returnItemRoute,
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const pb = getPocketBase();

      const item = (await pb
        .collection("library_items")
        .getOne(id)) as unknown as LibraryItem;

      const newStatus = item.type === "PDF" ? "Digital" : "Available";

      const updated = await pb.collection("library_items").update(id, {
        status: newStatus,
      });

      CacheManager.invalidate("library_items");
      logger.info({ itemId: id }, "Library item returned");

      return c.json({
        success: true,
        data: updated as unknown as LibraryItem,
        message: "Item marked as available",
      }, 200);
    } catch (error) {
      logger.error(`Return item error: ${errorMessage(error)}`);
      return c.json(
        {
          success: false,
          error: "Failed to process return request",
        },
        500,
      );
    }
  },
);

export default libraryRouter;






