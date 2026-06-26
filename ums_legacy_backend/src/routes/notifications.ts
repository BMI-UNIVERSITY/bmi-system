// BMI UMS - Notification Routes
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { getPocketBase } from "../services/pocketbase.js";
import { authMiddleware, getUser } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";
import { errorMessage } from "../utils/helpers.js";
import type { AppEnv } from "../types/hono.js";
import { ApiResponseSchema, ErrorResponseSchema } from "../openapi/common.js";

const notificationRouter = new OpenAPIHono<AppEnv>();
notificationRouter.use("*", authMiddleware);

// Route definitions
const listNotificationsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Notifications"],
  summary: "List notifications",
  description: "Get notifications for the current authenticated user",
  responses: {
    200: {
      content: { "application/json": { schema: ApiResponseSchema(z.array(z.any())) } },
      description: "List of notifications",
    },
    401: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "Unauthorized",
    },
  },
});

const markReadRoute = createRoute({
  method: "patch",
  path: "/{id}/read",
  tags: ["Notifications"],
  summary: "Mark as read",
  description: "Mark a specific notification as read",
  request: {
    params: z.object({
      id: z.string().openapi({ example: "NOTIF001" }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: ApiResponseSchema(z.any()) } },
      description: "Notification updated",
    },
    404: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "Notification not found",
    },
  },
});

const deleteNotificationRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Notifications"],
  summary: "Delete notification",
  description: "Remove a notification permanently",
  request: {
    params: z.object({
      id: z.string().openapi({ example: "NOTIF001" }),
    }),
  },
  responses: {
    204: {
      description: "Notification deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "Notification not found",
    },
  },
});

// Implement routes
notificationRouter.openapi(listNotificationsRoute, async (c) => {
  const user = getUser(c as any);
  if (!user) return c.json({ success: false, error: "Unauthorized" }, 401) as any;

  try {
    const pb = getPocketBase();
    const records = await pb.collection("notifications").getFullList({
      filter: `user_id = "${user.sub || user.id}"`,
      sort: "-created",
    });

    return c.json({
      success: true,
      data: records,
    }, 200) as any;
  } catch (error) {
    logger.error(`List notifications error: ${errorMessage(error)}`);
    return c.json({ success: false, error: "Failed to fetch notifications" }, 500) as any;
  }
});

notificationRouter.openapi(markReadRoute, async (c) => {
  const user = getUser(c as any);
  const { id } = c.req.valid("param");
  const pb = getPocketBase();

  try {
    const record = await pb.collection("notifications").getOne(id);
    if (record.user_id !== (user?.sub || user?.id)) {
      return c.json({ success: false, error: "Forbidden" }, 403) as any;
    }

    const updated = await pb.collection("notifications").update(id, { is_read: true });
    return c.json({ success: true, data: updated }, 200) as any;
  } catch (error) {
    logger.error(`Mark notification read error: ${errorMessage(error)}`);
    return c.json({ success: false, error: "Notification not found" }, 404) as any;
  }
});

notificationRouter.openapi(deleteNotificationRoute, async (c) => {
  const user = getUser(c as any);
  const { id } = c.req.valid("param");
  const pb = getPocketBase();

  try {
    const record = await pb.collection("notifications").getOne(id);
    if (record.user_id !== (user?.sub || user?.id)) {
      return c.json({ success: false, error: "Forbidden" }, 403) as any;
    }

    await pb.collection("notifications").delete(id);
    return c.body(null, 204);
  } catch (error) {
    logger.error(`Delete notification error: ${errorMessage(error)}`);
    return c.json({ success: false, error: "Notification not found" }, 404) as any;
  }
});

export default notificationRouter;






