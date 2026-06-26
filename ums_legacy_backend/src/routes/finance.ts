// BMI UMS - Finance Routes
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { getPocketBase } from "../services/pocketbase.js";
import { authMiddleware, requireRole, getUser } from "../middleware/auth.js";
import { auditMiddleware, logAction } from "../middleware/audit.js";
import { logger } from "../utils/logger.js";
import { errorMessage } from '../utils/helpers.js';
import { FinanceQueries, CacheManager } from "../services/queryOptimizer.js";
import {
  parsePagination,
  pbRecord,
} from "../utils/helpers.js";
import { ApiResponseSchema, ErrorResponseSchema } from "../openapi/common.js";
import type { Transaction } from "../types/index.js";
import type { AppEnv } from "../types/hono.js";

const financeRouter = new OpenAPIHono<AppEnv>();

// Apply middleware
financeRouter.use("*", authMiddleware);
financeRouter.use("*", auditMiddleware);

financeRouter.use("/transactions", async (c, next) => {
  const method = c.req.method;
  if (method === "GET") {
    return requireRole("admin", "registrar", "student")(c, next);
  }
  if (method === "POST") {
    return requireRole("admin", "registrar", "staff")(c, async () => {
      return logAction("CREATE", "transactions")(c, next);
    });
  }
  await next();
});

financeRouter.use("/transactions/:id", async (c, next) => {
  const method = c.req.method;
  if (method === "GET") {
    return requireRole("admin", "registrar", "student")(c, next);
  }
  if (method === "PATCH") {
    return requireRole("admin", "registrar", "staff")(c, async () => {
      return logAction("UPDATE", "transactions")(c, next);
    });
  }
  if (method === "DELETE") {
    return requireRole("admin")(c, async () => {
      return logAction("DELETE", "transactions")(c, next);
    });
  }
  await next();
});

// Validation schemas
const TransactionSchema = z
  .object({
    id: z.string().openapi({ example: "123" }),
    ref: z.string().min(1).max(50).openapi({ example: "TXN-001" }),
    name: z.string().min(1).max(200).openapi({ example: "Tuition Fee" }),
    desc: z.string().min(1).max(500).openapi({ example: "First semester tuition" }),
    amt: z.number().positive().max(10_000_000).openapi({ example: 1500.0 }),
    status: z.enum(["Paid", "Pending", "Failed"]).openapi({ example: "Paid" }),
    date: z.string().openapi({ example: "2024-05-19" }),
    student_id: z.string().optional().openapi({ example: "STU001" }),
    created: z.string().openapi({ example: "2024-05-19T03:15:05Z" }),
    updated: z.string().openapi({ example: "2024-05-19T03:15:05Z" }),
  })
  .openapi("Transaction");

const TransactionInputSchema = z
  .object({
    ref: z.string().min(1).max(50).openapi({ example: "TXN-001" }),
    name: z.string().min(1).max(200).openapi({ example: "Tuition Fee" }),
    desc: z.string().min(1).max(500).openapi({ example: "First semester tuition" }),
    amt: z.number().positive().max(10_000_000).openapi({ example: 1500.0 }),
    status: z.enum(["Paid", "Pending", "Failed"]).default("Pending"),
    date: z.string().openapi({ example: "2024-05-19" }),
    studentId: z.string().optional().openapi({ example: "STU001" }),
  })
  .openapi("TransactionInput");

// Route definitions
const listTransactionsRoute = createRoute({
  method: "get",
  path: "/transactions",
  tags: ["Finance"],
  summary: "List transactions",
  description: "List financial transactions with pagination and filtering",
  request: {
    query: z.object({
      page: z.string().optional().openapi({ example: "1" }),
      perPage: z.string().optional().openapi({ example: "20" }),
      status: z.string().optional().openapi({ example: "Paid" }),
      search: z.string().optional().openapi({ example: "Tuition" }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(z.array(TransactionSchema)),
        },
      },
      description: "List of transactions",
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

const getTransactionRoute = createRoute({
  method: "get",
  path: "/transactions/{id}",
  tags: ["Finance"],
  summary: "Get transaction by ID",
  description: "Get details of a single financial transaction",
  request: {
    params: z.object({
      id: z.string().openapi({ example: "123" }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(TransactionSchema),
        },
      },
      description: "Transaction details",
    },
    403: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Forbidden",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Transaction not found",
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

const createTransactionRoute = createRoute({
  method: "post",
  path: "/transactions",
  tags: ["Finance"],
  summary: "Create transaction",
  description: "Create a new financial transaction record",
  request: {
    body: {
      content: {
        "application/json": {
          schema: TransactionInputSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(TransactionSchema),
        },
      },
      description: "Transaction created successfully",
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

const updateTransactionRoute = createRoute({
  method: "patch",
  path: "/transactions/{id}",
  tags: ["Finance"],
  summary: "Update transaction",
  description: "Update an existing financial transaction record",
  request: {
    params: z.object({
      id: z.string().openapi({ example: "123" }),
    }),
    body: {
      content: {
        "application/json": {
          schema: TransactionInputSchema.partial(),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(TransactionSchema),
        },
      },
      description: "Transaction updated successfully",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Transaction not found",
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

const deleteTransactionRoute = createRoute({
  method: "delete",
  path: "/transactions/{id}",
  tags: ["Finance"],
  summary: "Delete transaction",
  description: "Delete a financial transaction record",
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
      description: "Transaction deleted successfully",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Transaction not found",
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
financeRouter.openapi(
  listTransactionsRoute,
  async (c) => {
    try {
      const user = getUser(c);
      const { page: p, perPage: pp, status, search } = c.req.valid("query");
      const { page, perPage } = parsePagination(p, pp, {
        page: 1,
        perPage: 20,
        maxPerPage: 500,
      });

      const result = await FinanceQueries.getWithDetails({
        page,
        perPage,
        studentId: user?.role === "student" ? user?.studentId : undefined,
        status: status || undefined,
        search: search || undefined,
      });

      return c.json({
        success: true,
        data: result.items as unknown as Transaction[],
        meta: {
          page: result.page,
          perPage: result.perPage,
          total: result.totalItems,
        },
      }, 200);
    } catch (error) {
      logger.error(`Get transactions error: ${errorMessage(error)}`);
      return c.json(
        {
          success: false,
          error: "Failed to fetch transactions",
        },
        500,
      );
    }
  },
);

financeRouter.openapi(
  getTransactionRoute,
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const user = getUser(c);
      const pb = getPocketBase();

      const transaction = await pb.collection("transactions").getOne(id);

      // Students can only access their own transaction
      const studentId = user?.studentId;
      const txStudent = pbRecord<Transaction>(transaction).student_id;
      if (user?.role === "student" && txStudent !== studentId) {
        return c.json({ success: false, error: "Forbidden" }, 403);
      }

      return c.json({
        success: true,
        data: transaction as unknown as Transaction,
      }, 200);
    } catch (error) {
      logger.error(`Get transaction error: ${errorMessage(error)}`);
      return c.json(
        {
          success: false,
          error: "Transaction not found",
        },
        404,
      );
    }
  },
);

financeRouter.openapi(
  createTransactionRoute,
  async (c) => {
    try {
      const data = c.req.valid("json");
      const pb = getPocketBase();

      const { studentId, ...rest } = data as any;
      const newTransaction = await pb.collection("transactions").create({
        ...rest,
        ...(studentId ? { student_id: studentId } : {}),
      });

      CacheManager.invalidate("transactions");
      logger.info({ transactionId: newTransaction.id }, "Transaction created");

      return c.json(
        {
          success: true,
          data: newTransaction as unknown as Transaction,
          message: "Transaction recorded successfully",
        },
        201,
      );
    } catch (error) {
      logger.error(`Create transaction error: ${errorMessage(error)}`);
      return c.json(
        {
          success: false,
          error: "Failed to create transaction",
        },
        500,
      );
    }
  },
);

financeRouter.openapi(
  updateTransactionRoute,
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const data = c.req.valid("json");
      const pb = getPocketBase();

      const { studentId, ...rest } = data as any;
      const payload: Record<string, unknown> = { ...rest };
      if (studentId !== undefined) payload.student_id = studentId;

      const updated = await pb.collection("transactions").update(id, payload);

      CacheManager.invalidate("transactions");
      logger.info({ transactionId: id }, "Transaction updated");

      return c.json({
        success: true,
        data: updated as unknown as Transaction,
        message: "Transaction updated successfully",
      }, 200);
    } catch (error) {
      logger.error(`Update transaction error: ${errorMessage(error)}`);
      return c.json(
        {
          success: false,
          error: "Failed to update transaction",
        },
        500,
      );
    }
  },
);

financeRouter.openapi(
  deleteTransactionRoute,
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const pb = getPocketBase();

      await pb.collection("transactions").delete(id);

      CacheManager.invalidate("transactions");
      logger.info({ transactionId: id }, "Transaction deleted");

      return c.json({
        success: true,
        data: null,
        message: "Transaction deleted successfully",
      }, 200);
    } catch (error) {
      logger.error(`Delete transaction error: ${errorMessage(error)}`);
      return c.json(
        {
          success: false,
          error: "Failed to delete transaction",
        },
        500,
      );
    }
  },
);

export default financeRouter;






