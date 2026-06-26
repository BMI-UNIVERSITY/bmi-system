// BMI University Management System
// 100% Open Source Backend API
// License: MIT

import { serve } from "@hono/node-server";
import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { logger as httpLogger } from "hono/logger";
import { rateLimiter } from "hono-rate-limiter";
import { CONFIG, validateConfig } from "./config/index.js";
import { logger } from "./utils/logger.js";
import {
  getPocketBase,
  verifyCollections,
  healthCheck as pbHealthCheck,
  authenticateAdmin,
  createDefaultAdminIfNeeded,
  scheduleAdminTokenRefresh,
  scheduleAutoBackups,
  shutdownPocketBase,
} from "./services/pocketbase.js";
import { seedAcademicReferenceDataIfEmpty } from "./services/academicSeed.js";
import { checkOllamaHealth } from "./services/ollama.js";
import { initJWTKeys, authMiddleware, requireRole } from "./middleware/auth.js";
import { requestContextMiddleware } from "./middleware/context.js";
import { metricsMiddleware } from "./middleware/metrics.js";
import { getPoolStats } from "./services/pocketbasePool.js";
import { optimizeDatabase } from "./services/databaseOptimizer.js";
import { CacheManager, QueryMonitor } from "./services/queryOptimizer.js";
import { metrics } from "./services/metrics.js";
import { retentionService } from "./services/retentionService.js";
import cron from "node-cron";
import { runFullPull } from "./services/googleSheetsPull.js";

// OpenAPI docs
import { apiReference } from "@scalar/hono-api-reference";

// Import routes
import authRouter from "./routes/auth.js";
import aiRouter from "./routes/ai.js";
import studentsRouter from "./routes/students.js";
import staffRouter from "./routes/staff.js";
import coursesRouter from "./routes/courses.js";
import certificatesRouter from "./routes/certificates.js";
import financeRouter from "./routes/finance.js";
import libraryRouter from "./routes/library.js";
import dashboardRouter from "./routes/dashboard.js";
import importRouter from "./routes/import.js";
import sheetsRouter from "./routes/sheets.js";
import syncRouter from "./routes/sync.js";
import gradeRouter from "./routes/grades.js";
import { gradingScalesRouter } from "./routes/grading-scales.js";
import { gradeAppealsRouter } from "./routes/grade-appeals.js";
import catalogRouter from "./routes/catalog.js";
import batchRouter from "./routes/batch.js";
import hostelRouter from "./routes/hostels.js";
import medicalRouter from "./routes/medical.js";
import inventoryRouter from "./routes/inventory.js";
import visitorRouter from "./routes/visitors.js";
import attendanceRouter from "./routes/attendance.js";
import studyCentersRouter from "./routes/study_centers.js";
import transcriptsRouter from "./routes/transcripts.js";
import documentsRouter from "./routes/documents.js";
import programsRouter from "./routes/programs.js";
import enrollmentsRouter from "./routes/enrollments.js";
import notificationRouter from "./routes/notifications.js";
import timetablingRouter from "./routes/timetabling.js";
import rubricsRouter from "./routes/rubrics.js";
import ltiRouter from "./routes/lti.js";

// Validate configuration
validateConfig();

// Create Hono app
export const app = new OpenAPIHono();

// ── Context and Correlation ID (CRITICAL: Must be first for logging) ──────────
app.use("*", requestContextMiddleware);
app.use("*", metricsMiddleware);

// ── Body size limit middleware (must be first after context) ─────────────────
app.use("*", async (c, next) => {
  const contentLength = c.req.header("content-length");
  const MAX_BODY_SIZE = 5 * 1024 * 1024; // 5MB hard limit
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return c.json(
      { success: false, error: "Request body too large. Maximum 5MB." },
      413,
    );
  }
  return await next();
});

// Middleware
app.use("*", secureHeaders());
app.use("*", httpLogger());
app.use(
  "*",
  cors({
    origin: CONFIG.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// Rate limiting
app.use(
  "*",
  rateLimiter({
    windowMs: CONFIG.RATE_LIMIT_WINDOW_MS,
    limit:
      CONFIG.NODE_ENV === "development"
        ? 10000
        : CONFIG.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    keyGenerator: (c) =>
      c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown",
    message: {
      success: false,
      error: "Too many requests. Please try again later.",
      code: "RATE_LIMITED",
    },
    skip: (c) => c.req.path === "/health" || c.req.path === "/api/v1/health",
  }),
);

// Health check endpoint (no auth required)
app.get("/health", async (c) => {
  const [pbHealthy, ollamaHealth] = await Promise.all([
    pbHealthCheck(),
    checkOllamaHealth(),
  ]);

  const status = pbHealthy ? 200 : 503;

  // In production, return minimal info — don't expose internal topology
  if (CONFIG.NODE_ENV === "production") {
    return c.json(
      {
        status: pbHealthy ? "ok" : "degraded",
        timestamp: new Date().toISOString(),
      },
      status,
    );
  }

  return c.json(
    {
      success: pbHealthy,
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      services: {
        api: "healthy",
        database: pbHealthy ? "healthy" : "unhealthy",
        ai: ollamaHealth.running
          ? ollamaHealth.modelAvailable
            ? "healthy"
            : "model_missing"
          : "offline",
      },
      environment: CONFIG.NODE_ENV,
    },
    status,
  );
});

// Performance monitoring endpoints (Admin only)
app.get("/api/v1/health/pool", authMiddleware, requireRole("admin"), async (c) => {
  const stats = getPoolStats();
  return c.json({ success: true, data: stats });
});

app.get("/api/v1/health/performance", authMiddleware, requireRole("admin"), async (c) => {
  const stats = QueryMonitor.getStats();
  return c.json({ success: true, data: stats });
});

app.get("/api/v1/health/cache", authMiddleware, requireRole("admin"), async (c) => {
  const stats = CacheManager.getStats();
  return c.json({ success: true, data: stats });
});

app.get("/api/v1/health/metrics", authMiddleware, requireRole("admin"), async (c) => {
  const stats = metrics.getStats();
  return c.json({ success: true, data: stats });
});

app.get("/api/v1/health/diagnostics", authMiddleware, requireRole("admin"), async (c) => {
  // Diagnostic information for operators
  const stats = metrics.getStats();
  const history = metrics.getRecentHistory(20);
  const pool = getPoolStats();
  const performance = QueryMonitor.getStats();
  const cache = CacheManager.getStats();

  return c.json({
    success: true,
    data: {
      summary: stats,
      recent_requests: history,
      internal: {
        pool,
        performance,
        cache,
      },
      system: {
        platform: process.platform,
        arch: process.arch,
        node_version: process.version,
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
      }
    }
  });
});

// ── Deep Health Endpoint (Phase 1/2) ────────────────────────────────────────
// Checks connectivity to all core services
app.get("/api/v1/health/deep", async (c) => {
  const [pb, ollama] = await Promise.allSettled([
    pbHealthCheck(),
    checkOllamaHealth().then((h) => h.running && h.modelAvailable),
  ]);

  const services = {
    api: "ok",
    pocketbase: pb.status === "fulfilled" && pb.value ? "ok" : "degraded",
    ollama: ollama.status === "fulfilled" && ollama.value ? "ok" : "degraded",
  };

  const allOk = Object.values(services).every((s) => s === "ok");

  return c.json(
    {
      success: allOk,
      status: allOk ? "healthy" : "degraded",
      services,
      timestamp: new Date().toISOString(),
    },
    allOk ? 200 : 503,
  );
});

// ── API versioning headers ────────────────────────────────────────────────────
app.use("/api/v1/*", async (c, next) => {
  await next();
  c.res.headers.set("API-Version", "1.0.0");
  c.res.headers.set("API-Supported-Versions", "1.0.0");
  // When v2 is released, add: c.res.headers.set('Deprecation', 'true');
  // c.res.headers.set('Sunset', 'Sat, 01 Jan 2027 00:00:00 GMT');
  // c.res.headers.set('Link', '</api/v2>; rel="successor-version"');
});

// API routes
app.route("/api/v1/auth", authRouter);
app.route("/api/v1/ai", aiRouter);
app.route("/api/v1/students", studentsRouter);
app.route("/api/v1/staff", staffRouter);
app.route("/api/v1/courses", coursesRouter);
app.route("/api/v1/certificates", certificatesRouter);
app.route("/api/v1/finance", financeRouter);
app.route("/api/v1/library", libraryRouter);
app.route("/api/v1/dashboard", dashboardRouter);
app.route("/api/v1/import", importRouter);
app.route("/api/v1/import", sheetsRouter);
app.route("/api/v1/sync", syncRouter);
app.route("/api/v1/grades", gradeRouter);
app.route("/api/v1/grading-scales", gradingScalesRouter);
app.route("/api/v1/grade-appeals", gradeAppealsRouter);
app.route("/api/v1/catalog", catalogRouter);
app.route("/api/v1/batch", batchRouter);
app.route("/api/v1/hostels", hostelRouter);
app.route("/api/v1/medical", medicalRouter);
app.route("/api/v1/inventory", inventoryRouter);
app.route("/api/v1/visitors", visitorRouter);
app.route("/api/v1/attendance", attendanceRouter);
app.route("/api/v1/campuses", studyCentersRouter);
app.route("/api/v1/study-centers", studyCentersRouter);
app.route("/api/v1/transcripts", transcriptsRouter);
app.route("/api/v1/documents", documentsRouter);
app.route("/api/v1/programs", programsRouter);
app.route("/api/v1/enrollments", enrollmentsRouter);
app.route("/api/v1/notifications", notificationRouter);
app.route("/api/v1/timetabling", timetablingRouter);
app.route("/api/v1/rubrics", rubricsRouter);
app.route("/api/v1/lti", ltiRouter);

// ── OpenAPI Documentation ────────────────────────────────────────────────────
// Generate OpenAPI spec from routes
app.doc("/api/openapi.json", {
  openapi: "3.1.0",
  info: {
    title: "BMI University Management System API",
    version: "1.0.0",
    description: "REST API for the BMI University Management System.",
  },
  servers: [
    { url: "http://localhost:3001", description: "Local development" },
  ],
});

// GET /api/docs  — Scalar interactive API reference (MIT, self-hosted)
app.get(
  "/api/docs",
  apiReference({
    spec: { url: "/api/openapi.json" },
    theme: "purple",
    title: "BMI UMS API Reference",
  }),
);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: "Not Found",
      message: `Route ${c.req.method} ${c.req.path} not found`,
    },
    404,
  );
});

// Error handler
app.onError((error, c) => {
  logger.error({ err: error }, "Unhandled error");
  return c.json(
    {
      success: false,
      error: "Internal Server Error",
      message:
        CONFIG.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
    },
    500,
  );
});

// Start server
async function startServer() {
  try {
    logger.info("Initializing BMI UMS API Server...");
    logger.info(`Environment: ${CONFIG.NODE_ENV}`);

    // Initialize JWT keys (RS256 or HS256)
    await initJWTKeys();
    logger.info(
      `✓ JWT initialized (${process.env.JWT_PRIVATE_KEY ? "RS256" : "HS256"} mode)`,
    );

    // Initialize PocketBase
    logger.info("Connecting to PocketBase...");
    getPocketBase(); // Initialize connection

    // Check PocketBase health with a retry loop
    let pbHealthy = false;
    const maxRetries = 10;
    const retryDelayMs = 1000;

    logger.info("Checking PocketBase health...");
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      pbHealthy = await pbHealthCheck();
      if (pbHealthy) break;
      logger.warn(
        `PocketBase not ready (attempt ${attempt}/${maxRetries}), retrying in ${retryDelayMs}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }

    if (!pbHealthy) {
      logger.error("PocketBase is not available. Please ensure it is running.");
      logger.info("Start PocketBase: cd backend && ./pocketbase serve");
      process.exit(1);
    }
    logger.info("✓ PocketBase connected");

    // Authenticate as admin to allow collection/user management
    try {
      await authenticateAdmin();
      scheduleAdminTokenRefresh(); // keep token alive
      scheduleAutoBackups(); // Default: 24h interval
      retentionService.schedule();
      logger.info("✓ PocketBase admin authenticated, auto-backups & retention scheduled");
    } catch (error) {
      logger.warn(
        { err: error },
        "PocketBase admin auth failed (may need manual setup)",
      );
    }

    // Verify collections
    try {
      await verifyCollections();
      logger.info("✓ Database schema verified");
    } catch (error) {
      logger.warn({ err: error }, "Database schema verification failed");
    }

    if (CONFIG.NODE_ENV !== "production") {
      try {
        await seedAcademicReferenceDataIfEmpty();
        logger.info("✓ Academic reference seed checked");
      } catch (error) {
        logger.warn({ err: error }, "Academic seed skipped");
      }
    } else {
      logger.info("ℹ Skipping academic reference seed in production");
    }

    // Create default admin user if no users exist
    try {
      await createDefaultAdminIfNeeded();
      logger.info("✓ User initialization complete");
    } catch (error) {
      logger.warn({ err: error }, "User initialization failed");
    }

    // Campus data seeding is a one-time manual operation.
    // Run: npm --prefix backend exec -- npx tsx scripts/import-mukurweini-giathugu.ts
    logger.info("ℹ Campus data seeding: run the import script manually on first setup (see Makefile seed target).");

    // No pool initialization needed — pocketbasePool now delegates to the
    // existing PocketBase singleton (zero overhead, same API surface).

    // Run database optimization
    logger.info("Running database optimization...");
    try {
      await optimizeDatabase();
      logger.info("✓ Database optimization complete");
    } catch (error) {
      logger.warn({ err: error }, "Database optimization failed (non-critical)");
    }

    // Check Ollama
    const ollamaHealth = await checkOllamaHealth();
    if (ollamaHealth.running && ollamaHealth.modelAvailable) {
      logger.info("✓ Ollama AI service connected");
    } else if (ollamaHealth.running && !ollamaHealth.modelAvailable) {
      logger.warn("⚠ Ollama is running but model is not available.");
      logger.info(`Download model: ollama pull ${CONFIG.OLLAMA_MODEL}`);
    } else {
      logger.warn("⚠ Ollama is not running. AI features will be unavailable.");
      logger.info("Start Ollama: ollama serve");
    }

    // ── Google Sheets Pull Scheduler (every 5 minutes) ───────────────────────
    const SYNC_INTERVAL = process.env.SHEETS_SYNC_INTERVAL_CRON || "*/5 * * * *";
    cron.schedule(SYNC_INTERVAL, async () => {
      logger.info("[Cron] Google Sheets pull scheduled job triggered");
      try {
        const result = await runFullPull();
        logger.info(`[Cron] Pull complete — ${result.rowsSynced} rows synced, ${result.errors.length} errors`);
      } catch (err: any) {
        logger.error(`[Cron] Pull failed: ${err?.message || err}`);
      }
    });
    logger.info(`✓ Google Sheets auto-pull scheduler registered (${SYNC_INTERVAL})`);

    // Start HTTP server
    server = serve(
      {
        fetch: app.fetch,
        port: CONFIG.PORT,
        hostname: CONFIG.HOST,
      },
      (info) => {
        logger.info(`✓ Server running at http://${info.address}:${info.port}`);
        logger.info(
          `✓ Health check: http://${info.address}:${info.port}/health`,
        );
      },
    );
  } catch (error) {
    logger.error({ err: error }, "Failed to start server");
    process.exit(1);
  }
}

// Handle graceful shutdown — drain in-flight requests before exiting
let server: ReturnType<typeof serve> | null = null;

function gracefulShutdown(signal: string) {
  logger.info(`${signal} received — shutting down gracefully...`);
  
  // Clear all background intervals
  shutdownPocketBase();
  
  if (server) {
    // @hono/node-server exposes close() for graceful drain
    (server as any).close?.(() => {
      logger.info("All connections drained. Exiting.");
      process.exit(0);
    });
    // Force exit after 5 seconds if connections don't drain
    setTimeout(() => {
      logger.warn("Forced shutdown after 5s timeout");
      process.exit(1);
    }, 5_000);
  } else {
    process.exit(0);
  }
}

// Handle uncaught exceptions and rejections to prevent silent crashes
process.on("uncaughtException", (error) => {
  logger.error({ err: error }, "FATAL: Uncaught Exception");
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error({ promise, reason }, "FATAL: Unhandled Rejection");
  gracefulShutdown("UNHANDLED_REJECTION");
});

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Start
startServer();

export default app;






