/**
 * BMI UMS — Unified Document Verification & Request Route
 */

import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { getPocketBase } from "../services/pocketbase.js";
import { logger } from "../utils/logger.js";
import { errorMessage } from '../utils/helpers.js';
import { authMiddleware, getUser } from "../middleware/auth.js";
import { ApiResponseSchema, ErrorResponseSchema } from "../openapi/common.js";
import type { AppEnv } from "../types/hono.js";

const documentsRouter = new OpenAPIHono<AppEnv>();

// Validation schemas
const verifySchema = z.object({
  serial: z.string().min(1).openapi({ example: "BMI-TRANS-2024-000001" }),
  t: z.string().optional().openapi({ description: "Hidden HMAC token" }),
  sig: z.string().optional().openapi({ description: "Digital signature" }),
  hash: z.string().optional().openapi({ description: "Content hash" }),
  offline_jwt: z.string().optional().openapi({ description: "Offline JWT" }),
}).openapi("VerifyRequest");

const requestDocumentSchema = z.object({
  type: z.enum(["Transcript", "Certificate", "Letter of Good Standing", "Admission Letter"]),
  purpose: z.string().min(1).openapi({ example: "Further Studies" }),
  deliveryMethod: z.enum(["Digital", "Physical Pickup", "Courier"]),
  address: z.string().optional(),
}).openapi("DocumentRequest");

// Route definitions
const verifyRoute = createRoute({
  method: "post",
  path: "/verify",
  tags: ["Documents"],
  summary: "Verify document",
  description: "Verify any BMI document by its serial number",
  request: {
    body: {
      content: { "application/json": { schema: verifySchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Verification result",
    },
    429: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "Rate limited",
    },
  },
});

const requestDocumentRoute = createRoute({
  method: "post",
  path: "/request",
  tags: ["Documents"],
  summary: "Request document",
  description: "Submit a request for an official document (Student only)",
  middleware: [authMiddleware],
  request: {
    body: {
      content: { "application/json": { schema: requestDocumentSchema } },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: ApiResponseSchema(z.any()) } },
      description: "Request submitted successfully",
    },
    401: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "Unauthorized",
    },
  },
});

// Helper for logging
async function logAttempt(serial: string, result: string, ip: string): Promise<void> {
  try {
    const pb = getPocketBase();
    await pb.collection("verification_logs").create({
      certificate_serial: serial,
      result,
      method: "unified",
      ip_address: ip,
      user_agent: "",
      timestamp: new Date().toISOString(),
    });
  } catch (error) { /* non-critical */ }
}

// Implement routes
documentsRouter.openapi(verifyRoute, async (c) => {
  const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
  const { serial } = c.req.valid("json");

  const cleanSerial = serial.trim().toUpperCase();
  const pb = getPocketBase();
  const safe = (v: string) => v.replace(/["'\\]/g, "");

  if (/^BMI-TRANS-\d{4}-\d{6}$/.test(cleanSerial)) {
    const results = await pb.collection("transcripts").getList(1, 1, {
      filter: `serial_number = "${safe(cleanSerial)}"`,
    });

    if (results.totalItems === 0) {
      await logAttempt(cleanSerial, "not_found", ip);
      return c.json({ valid: false, error: "Transcript not found", code: "NOT_FOUND"  }, 404) as any;
    }

    const tr = results.items[0];
    if (tr.status === "REVOKED") {
      return c.json({ valid: false, status: "revoked", error: "This transcript has been revoked." }, 200) as any;
    }

    return c.json({ valid: true, documentType: "transcript", document: tr }, 200) as any;
  }

  // Generic fallback for certificates
  const results = await pb.collection("certificates").getList(1, 1, {
    filter: `serial_number = "${safe(cleanSerial)}"`,
  });

  if (results.totalItems > 0) {
    return c.json({ valid: true, documentType: "certificate", document: results.items[0] }, 200) as any;
  }

  return c.json({ valid: false, error: "Document not found" }, 404) as any;
});

documentsRouter.openapi(requestDocumentRoute, async (c) => {
  const user = getUser(c as any);
  if (!user) return c.json({ success: false, error: "Unauthorized" }, 401) as any;

  const data = c.req.valid("json");
  const pb = getPocketBase();

  try {
    const request = await pb.collection("document_requests").create({
      student_id: user.sub || user.id,
      type: data.type,
      purpose: data.purpose,
      delivery_method: data.deliveryMethod,
      address: data.address,
      status: "Pending",
    });

    return c.json({
      success: true,
      data: request,
    }, 201) as any;
  } catch (error) {
    logger.error(`Document request error: ${errorMessage(error)}`);
    return c.json({ success: false, error: "Failed to submit request" }, 500) as any;
  }
});

export default documentsRouter;






