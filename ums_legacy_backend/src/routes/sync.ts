import { Hono } from "hono";
import { logger } from "../utils/logger.js";
import { errorMessage } from "../utils/helpers.js";
import { sheetsSyncQueue } from "../services/sheetsSyncQueue.js";
import { runFullPull, getSyncStatus } from "../services/googleSheetsPull.js";

const syncRouter = new Hono();

// ── Webhook (PocketBase → Sheets push, existing) ──────────────────────────────
/**
 * POST /api/v1/sync/:collection/:action/:recordId
 * Webhook endpoint called by PocketBase hooks
 */
syncRouter.post("/:collection/:action/:recordId", async (c) => {
  const incomingToken = c.req.header("X-BMI-Webhook-Token");
  const configuredSecret = process.env.BMI_WEBHOOK_SECRET || "default_test_secret";

  if (!incomingToken || incomingToken !== configuredSecret) {
    logger.warn("Blocked unauthorized sync webhook attempt");
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  const { collection, action, recordId } = c.req.param();

  try {
    logger.info(`Sync webhook: ${collection} ${action} ${recordId}`);

    if (collection === "students") {
      sheetsSyncQueue.enqueueStudentSync(action as any, recordId);
    } else if (collection === "academic_records" || collection === "grades") {
      sheetsSyncQueue.enqueueGradeSync(recordId);
    } else if (collection === "staff") {
      sheetsSyncQueue.enqueueStaffSync(action as any, recordId);
    } else if (collection === "courses") {
      sheetsSyncQueue.enqueueCourseSync(action as any, recordId);
    } else if (collection === "study_centers" || collection === "campuses") {
      sheetsSyncQueue.enqueueCampusSync(action as any, recordId);
    } else {
      logger.info(`Sync for ${collection} not yet implemented, skipping`);
    }

    return c.json({ success: true, message: "Sync enqueued" });
  } catch (error) {
    logger.error(`Sync webhook error: ${errorMessage(error)}`);
    return c.json({ success: false, error: errorMessage(error) }, 500);
  }
});

// ── NEW: GET /api/v1/sync/status ──────────────────────────────────────────────
/**
 * Returns the current sync status (last run time, rows synced, errors).
 * Used by the frontend Sync Dashboard in Settings.
 */
syncRouter.get("/status", async (c) => {
  try {
    const status = getSyncStatus();
    return c.json({ success: true, data: status });
  } catch (error) {
    return c.json({ success: false, error: errorMessage(error) }, 500);
  }
});

// ── NEW: POST /api/v1/sync/pull ───────────────────────────────────────────────
/**
 * Manually trigger a full pull from Google Sheets → PocketBase.
 * Admin-only. Can be triggered from the Settings UI.
 */
syncRouter.post("/pull", async (c) => {
  const incomingToken = c.req.header("X-BMI-Webhook-Token");
  const configuredSecret = process.env.BMI_WEBHOOK_SECRET || "default_test_secret";
  // Also allow Authorization Bearer token (for admin users via frontend)
  const authHeader = c.req.header("Authorization");

  const isWebhookAuth = incomingToken && incomingToken === configuredSecret;
  const isBearerAuth = authHeader && authHeader.startsWith("Bearer ");

  if (!isWebhookAuth && !isBearerAuth) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  logger.info("[SyncRouter] Manual pull triggered");

  // Run in background — don't block the HTTP response
  runFullPull().then((status) => {
    logger.info(`[SyncRouter] Manual pull finished: ${status.lastSyncResult}`);
  }).catch((err) => {
    logger.error(`[SyncRouter] Manual pull error: ${errorMessage(err)}`);
  });

  return c.json({
    success: true,
    message: "Pull sync started in background. Check /sync/status for progress.",
  });
});

// ── NEW: POST /api/v1/sync/push-grades ───────────────────────────────────────
/**
 * Push ALL grades from PocketBase → Google Sheets (bulk re-sync).
 * Useful after bulk grade entry in the portal.
 */
syncRouter.post("/push-grades", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  try {
    const { getPocketBase } = await import("../services/pocketbase.js");
    const pb = getPocketBase();
    const grades = await pb.collection("grades").getFullList({ batch: 500 });

    let enqueued = 0;
    for (const grade of grades) {
      sheetsSyncQueue.enqueueGradeSync(grade.id);
      enqueued++;
    }

    return c.json({
      success: true,
      message: `Enqueued ${enqueued} grade push jobs to Google Sheets.`,
    });
  } catch (error) {
    logger.error(`[SyncRouter] Push grades error: ${errorMessage(error)}`);
    return c.json({ success: false, error: errorMessage(error) }, 500);
  }
});

export default syncRouter;
