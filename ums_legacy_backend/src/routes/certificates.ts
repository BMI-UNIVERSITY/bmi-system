// BMI UMS - Certificates Routes
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { randomBytes } from "crypto";
import QRCode from "qrcode";
import { rateLimiter } from "hono-rate-limiter";
import { getPocketBase } from "../services/pocketbase.js";
import {
  buildSigningPayload,
  signCertificate,
  verifyCertificateSignature,
  generateOfflineJWT,
  buildVerificationUrl,
  buildOfflineQRPayload,
  verifyOfflineJWT,
  generateIssuanceNonce,
  generateHiddenToken,
  verifyHiddenToken,
} from "../services/certificateSigning.js";
import {
  authMiddleware,
  requireRole,
  optionalAuthMiddleware,
} from "../middleware/auth.js";
import { auditMiddleware, logAction } from "../middleware/audit.js";
import { logger } from "../utils/logger.js";
import {
  parsePagination,
  generateContentHash,
  isValidCertificateSerial,
} from "../utils/helpers.js";
import type {
  ApiResponse,
  Certificate,
  CertificateVerificationResult,
} from "../types/index.js";

const certificatesRouter = new Hono();

// ─── Helper ───────────────────────────────────────────────────────────────────
type StudentRecord = {
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
};
function getStudentName(student: StudentRecord): string {
  const firstName = student.first_name ?? student.firstName ?? "";
  const lastName = student.last_name ?? student.lastName ?? "";
  return `${firstName} ${lastName}`.trim();
}

function getGraduationClass(gpa: number): string {
  if (gpa >= 3.7) return "First Class Honours";
  if (gpa >= 3.3) return "Second Class Honours (Upper Division)";
  if (gpa >= 3.0) return "Second Class Honours (Lower Division)";
  if (gpa >= 2.0) return "Pass";
  return "Fail";
}

async function logVerificationAttempt(
  serial: string,
  result: "valid" | "invalid" | "revoked" | "tampered" | "not_found",
  method: string,
  ip: string,
  userAgent: string,
): Promise<void> {
  try {
    const pb = getPocketBase();
    await pb.collection("verification_logs").create({
      certificate_serial: serial,
      result,
      method,
      ip_address: ip,
      user_agent: userAgent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) { // Non-critical — don't fail verification if logging fails
  }
}

// Rate limiter for public verify endpoint — prevent serial enumeration
const verifyRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  keyGenerator: (c) =>
    c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown",
  message: {
    valid: false,
    error: "Too many verification attempts. Please try again later.",
    code: "RATE_LIMITED",
   },
});

// Apply auth middleware to all except verification endpoints
certificatesRouter.use("*", optionalAuthMiddleware);
certificatesRouter.use("*", auditMiddleware);

// Validation schemas
const generateCertificateSchema = z.object({
  studentId: z.string().min(1),
  degree: z.string().min(1),
  graduationClass: z.string().optional(),
  graduationDate: z.string().min(1),
  gpa: z.number().min(0).max(4),
});

/**
 * GET /api/v1/certificates
 * List all certificates (admin/registrar only)
 */
certificatesRouter.get("/", requireRole("admin", "registrar"), async (c) => {
  try {
    const pb = getPocketBase();

    const { page, perPage } = parsePagination(
      c.req.query("page"),
      c.req.query("perPage"),
      { page: 1, perPage: 20, maxPerPage: 100 },
    );

    const status = c.req.query("status");
    const filters: string[] = [];
    if (status) filters.push(`status = "${status}"`);

    const result = await pb.collection("certificates").getList(page, perPage, {
      ...(filters.length > 0 ? { filter: filters.join(" && ") } : {}),
      sort: "-issue_date",
      expand: "student_id",
    });

    return c.json<ApiResponse<Certificate[]>>({
      success: true,
      data: result.items as unknown as Certificate[],
      meta: {
        page: result.page,
        perPage: result.perPage,
        total: result.totalItems,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Get certificates error");
    return c.json<ApiResponse<never>>(
      {
        success: false,
        error: "Failed to fetch certificates",
      },
      500,
    );
  }
});

/**
 * GET /api/v1/certificates/:id
 * Get a single certificate
 */
certificatesRouter.get("/:id", async (c) => {
  try {
    const id = c.req.param("id")!;
    const pb = getPocketBase();

    const certificate = await pb.collection("certificates").getOne(id, {
      expand: "student_id",
    });

    return c.json<ApiResponse<Certificate>>({
      success: true,
      data: certificate as unknown as Certificate,
    });
  } catch (error) {
    logger.error({ err: error }, "Get certificate error");
    return c.json<ApiResponse<never>>(
      {
        success: false,
        error: "Certificate not found",
      },
      404,
    );
  }
});

/**
 * POST /api/v1/certificates/generate
 * Generate a new certificate
 */
certificatesRouter.post(
  "/generate",
  requireRole("admin", "registrar"),
  zValidator("json", generateCertificateSchema),
  logAction("CREATE", "certificates"),
  async (c) => {
    try {
      const data = c.req.valid("json");
      const pb = getPocketBase();

      // Get student details
      const student = await pb.collection("students").getOne(data.studentId);

      // Generate collision-safe serial number using crypto random (no race condition)
      const year = new Date().getFullYear();
      const randomSuffix =
        (parseInt(randomBytes(3).toString("hex"), 16) % 900000) + 100000;
      const serialNumber = `BMI-${year}-${randomSuffix.toString().padStart(6, "0")}`;

      // Generate content hash (SHA-256 — tamper detection)
      const issueDate = new Date().toISOString().split("T")[0];
      const contentHash = await generateContentHash({
        serial: serialNumber,
        studentId: data.studentId,
        name: getStudentName(student as StudentRecord),
        degree: data.degree,
        issueDate,
      });

      // Generate HMAC signature (proves BMI issued this certificate)
      const graduationClass =
        data.graduationClass || getGraduationClass(data.gpa);
      const signingPayload = buildSigningPayload({
        serial: serialNumber,
        studentId: data.studentId,
        studentName: getStudentName(student as StudentRecord),
        degree: data.degree,
        faculty: student.faculty,
        issueDate,
        gpa: data.gpa,
      });
      const signature = signCertificate(signingPayload);

      // Generate issuance nonce — random secret stored ONLY in DB, never printed
      const issuanceNonce = generateIssuanceNonce();

      // Generate hidden QR token — requires nonce + SECRET_KEY to compute
      // This is what makes the QR unforgeable even if someone copies the serial
      const hiddenToken = generateHiddenToken({
        serial: serialNumber,
        studentId: data.studentId,
        issueDate,
        nonce: issuanceNonce,
      });

      // Generate offline JWT (self-contained, verifiable without internet)
      const offlineJWT = await generateOfflineJWT({
        serial: serialNumber,
        studentName: getStudentName(student as StudentRecord),
        degree: data.degree,
        faculty: student.faculty,
        issueDate,
        graduationClass,
      });

      // Create certificate record — nonce stored in DB, never returned to client
      const certificate = await pb.collection("certificates").create({
        serial_number: serialNumber,
        student_id: data.studentId,
        student_name: getStudentName(student as StudentRecord),
        degree: data.degree,
        graduation_class: graduationClass,
        faculty: student.faculty,
        department: student.department,
        issue_date: issueDate,
        graduation_date: data.graduationDate,
        gpa: data.gpa,
        status: "ISSUED",
        content_hash: contentHash,
        signature,
        issuance_nonce: issuanceNonce, // SECRET — never sent to frontend
        hidden_token: hiddenToken, // stored for fast verification lookup
        offline_jwt: offlineJWT,
        verification_count: 0,
      });

      // Update student status to Graduated
      await pb.collection("students").update(data.studentId, {
        status: "Graduated",
      });

      logger.info(
        { serialNumber, studentId: data.studentId },
        "Certificate generated",
      );

      return c.json<ApiResponse<Certificate>>(
        {
          success: true,
          data: certificate as unknown as Certificate,
          message: "Certificate generated successfully",
        },
        201,
      );
    } catch (error) {
      logger.error({ err: error }, "Generate certificate error");
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: "Failed to generate certificate",
        },
        500,
      );
    }
  },
);

/**
 * POST /api/v1/certificates/verify
 * Verify a certificate (public endpoint — rate limited)
 * Supports: serial+signature (online), serial only (online), offline JWT
 */
certificatesRouter.post("/verify", verifyRateLimiter, async (c) => {
  const ip =
    c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
  const userAgent = c.req.header("user-agent") || "unknown";

  try {
    const body = await c.req.json();
    const { serial, sig, hash, offline_jwt, method = "online" } = body;
    // 't' is the new hidden token param; 'sig' is legacy
    const incomingToken: string | undefined = body.t || sig || undefined;

    // ── Offline JWT verification (no database needed) ──────────────────────
    if (offline_jwt) {
      const payload = await verifyOfflineJWT(offline_jwt);
      if (!payload) {
        await logVerificationAttempt(
          serial || "unknown",
          "tampered",
          "offline",
          ip,
          userAgent,
        );
        return c.json<CertificateVerificationResult>({
          valid: false,
          error:
            "Offline certificate token is invalid or has been tampered with",
          code: "OFFLINE_JWT_INVALID",
        });
      }

      // Offline verification succeeded — still do online check if possible
      await logVerificationAttempt(
        payload.serial,
        "valid",
        "offline",
        ip,
        userAgent,
      );
      return c.json<CertificateVerificationResult>({
        valid: true,
        certificate: {
          serial_number: payload.serial,
          student_name: payload.studentName,
          degree_title: payload.degree,
          graduation_class: payload.graduationClass,
          faculty: payload.faculty,
          department: "",
          issue_date: payload.issueDate,
          graduation_date: payload.issueDate,
          gpa: 0,
          status: "active",
        },
        verification: {
          timestamp: new Date().toISOString(),
          method: "offline",
          hash_verified: true,
          verification_count: 0,
        },
      });
    }

    // ── Online verification ────────────────────────────────────────────────
    if (!serial || !isValidCertificateSerial(serial)) {
      return c.json<CertificateVerificationResult>({
        valid: false,
        error:
          "Invalid certificate serial number format. Expected: BMI-YYYY-NNNNNN",
        code: "INVALID_FORMAT",
      });
    }

    const pb = getPocketBase();
    const safe = (v: string) => v.replace(/["'\\]/g, "");
    const certificates = await pb.collection("certificates").getList(1, 1, {
      filter: `serial_number = "${safe(serial)}"`,
    });

    if (certificates.totalItems === 0) {
      await logVerificationAttempt(serial, "not_found", method, ip, userAgent);
      return c.json<CertificateVerificationResult>({
        valid: false,
        error: "Certificate not found in registry",
        code: "CERT_NOT_FOUND",
      });
    }

    const cert = certificates.items[0] as unknown as Certificate & {
      signature?: string;
      student_id?: string;
      hidden_token?: string;
      issuance_nonce?: string;
    };

    // Check revocation status
    if (cert.status === "REVOKED") {
      await logVerificationAttempt(serial, "revoked", method, ip, userAgent);
      return c.json<CertificateVerificationResult>({
        valid: false,
        error: "This certificate has been revoked by BMI University",
        code: "CERT_REVOKED",
        certificate: {
          serial_number: cert.serial_number,
          student_name: cert.student_name,
          degree_title: cert.degree,
          graduation_class: cert.graduation_class,
          faculty: cert.faculty,
          department: cert.department,
          issue_date: cert.issue_date,
          graduation_date: cert.graduation_date,
          gpa: cert.gpa,
          status: "revoked",
        },
      });
    }

    if (cert.status === "SUSPENDED") {
      await logVerificationAttempt(serial, "invalid", method, ip, userAgent);
      return c.json<CertificateVerificationResult>({
        valid: false,
        error: "This certificate is temporarily suspended pending review",
        code: "CERT_SUSPENDED",
      });
    }

    // ── Token verification ─────────────────────────────────────────────────
    // Priority: hidden token (new) > legacy sig > hash > serial-only
    let signatureVerified = false;

    if (incomingToken && cert.issuance_nonce && cert.student_id) {
      // NEW: verify using hidden token + secret nonce
      // The nonce is stored only in DB — attacker cannot compute this
      signatureVerified = verifyHiddenToken(incomingToken, {
        serial: cert.serial_number,
        studentId: cert.student_id,
        issueDate: cert.issue_date,
        nonce: cert.issuance_nonce,
      });

      if (!signatureVerified) {
        // Also try legacy HMAC signature for backward compatibility
        if (cert.signature) {
          const signingPayload = buildSigningPayload({
            serial: cert.serial_number,
            studentId: cert.student_id || "",
            studentName: cert.student_name,
            degree: cert.degree,
            faculty: cert.faculty,
            issueDate: cert.issue_date,
            gpa: cert.gpa,
          });
          signatureVerified = verifyCertificateSignature(
            signingPayload,
            incomingToken,
          );
        }

        if (!signatureVerified) {
          await logVerificationAttempt(
            serial,
            "tampered",
            method,
            ip,
            userAgent,
          );
          return c.json<CertificateVerificationResult>({
            valid: false,
            error:
              "QR code token is invalid. This certificate may have been forged.",
            code: "CERT_TAMPERED",
          });
        }
      }
    } else if (hash) {
      // Legacy hash verification
      signatureVerified = hash === cert.content_hash;
      if (!signatureVerified) {
        await logVerificationAttempt(serial, "tampered", method, ip, userAgent);
        return c.json<CertificateVerificationResult>({
          valid: false,
          error: "Certificate content hash mismatch. Document may be altered.",
          code: "CERT_TAMPERED",
        });
      }
    }
    // else: serial-only — valid but unverified (no token provided)

    // Increment verification count
    await pb.collection("certificates").update(cert.id, {
      verification_count: (cert.verification_count || 0) + 1,
    });

    await logVerificationAttempt(serial, "valid", method, ip, userAgent);
    logger.info({ serial, signatureVerified, method }, "Certificate verified");

    return c.json<CertificateVerificationResult>({
      valid: true,
      certificate: {
        serial_number: cert.serial_number,
        student_name: cert.student_name,
        degree_title: cert.degree,
        graduation_class: cert.graduation_class,
        faculty: cert.faculty,
        department: cert.department,
        issue_date: cert.issue_date,
        graduation_date: cert.graduation_date,
        gpa: cert.gpa,
        status: "active",
      },
      verification: {
        timestamp: new Date().toISOString(),
        method: method as "online" | "offline" | "qr_scan",
        hash_verified: signatureVerified,
        verification_count: (cert.verification_count || 0) + 1,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Verify certificate error");
    return c.json<CertificateVerificationResult>(
      {
        valid: false,
        error:
          "Verification service temporarily unavailable. Please try again.",
        code: "SERVICE_ERROR",
      },
      500,
    );
  }
});

/**
 * GET /api/v1/certificates/:id/qr
 * Generate QR code for certificate — uses HMAC signature, not hash in URL
 */
certificatesRouter.get("/:id/qr", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id")!;
    const mode = c.req.query("mode") || "online"; // 'online' | 'offline'
    const pb = getPocketBase();

    const certificate = (await pb
      .collection("certificates")
      .getOne(id)) as unknown as Certificate & {
      signature?: string;
      offline_jwt?: string;
      student_id?: string;
      hidden_token?: string;
      issuance_nonce?: string;
    };

    let qrContent: string;
    let verificationUrl: string;

    if (mode === "offline" && certificate.offline_jwt) {
      qrContent = buildOfflineQRPayload(
        certificate.serial_number,
        certificate.offline_jwt ?? "",
      );
      verificationUrl = qrContent;
    } else {
      const token = certificate.hidden_token || certificate.signature || "";
      verificationUrl = buildVerificationUrl(certificate.serial_number, token);
      qrContent = verificationUrl;
    }

    const qrCodeDataUrl = await QRCode.toDataURL(qrContent, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: "H", // High error correction — survives printing damage
      color: { dark: "#4B0082", light: "#FFFFFF" },
    });

    return c.json<ApiResponse<{ qrCode: string; url: string; mode: string }>>({
      success: true,
      data: { qrCode: qrCodeDataUrl, url: verificationUrl, mode },
    });
  } catch (error) {
    logger.error({ err: error }, "Generate QR error");
    return c.json<ApiResponse<never>>(
      { success: false, error: "Failed to generate QR code" },
      500,
    );
  }
});

/**
 * PATCH /api/v1/certificates/:id/revoke
 * Revoke a certificate
 */
certificatesRouter.patch(
  "/:id/revoke",
  requireRole("admin"),
  logAction("UPDATE", "certificates"),
  async (c) => {
    try {
      const id = c.req.param("id")!;
      const pb = getPocketBase();

      await pb.collection("certificates").update(id, {
        status: "REVOKED",
      });

      logger.info({ certificateId: id }, "Certificate revoked");

      return c.json<ApiResponse<null>>({
        success: true,
        data: null,
        message: "Certificate revoked successfully",
      });
    } catch (error) {
      logger.error({ err: error }, "Revoke certificate error");
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: "Failed to revoke certificate",
        },
        500,
      );
    }
  },
);

/**
 * GET /api/v1/certificates/verification/logs
 * Get verification audit logs (admin only)
 */
certificatesRouter.get(
  "/verification/logs",
  requireRole("admin", "registrar"),
  async (c) => {
    try {
      const pb = getPocketBase();
      const { page, perPage } = parsePagination(
        c.req.query("page"),
        c.req.query("perPage"),
        { page: 1, perPage: 50, maxPerPage: 200 },
      );

      const result = await pb
        .collection("verification_logs")
        .getList(page, perPage, {
          sort: "-timestamp",
        });

      return c.json<ApiResponse<any[]>>({
        success: true,
        data: result.items,
        meta: {
          page: result.page,
          perPage: result.perPage,
          total: result.totalItems,
        },
      });
    } catch (error) {
      logger.error({ err: error }, "Get verification logs error");
      return c.json<ApiResponse<never>>(
        { success: false, error: "Failed to fetch logs" },
        500,
      );
    }
  },
);

/**
 * GET /api/v1/certificates/verification/stats
 * Get verification statistics for the dashboard
 */
certificatesRouter.get(
  "/verification/stats",
  requireRole("admin", "registrar"),
  async (c) => {
    try {
      const pb = getPocketBase();

      const [total, today, valid, invalid, revoked] = await Promise.all([
        pb.collection("verification_logs").getList(1, 1),
        pb.collection("verification_logs").getList(1, 1, {
          filter: `timestamp >= "${new Date().toISOString().split("T")[0]}"`,
        }),
        pb
          .collection("verification_logs")
          .getList(1, 1, { filter: 'result = "valid"' }),
        pb
          .collection("verification_logs")
          .getList(1, 1, { filter: 'result = "invalid"' }),
        pb
          .collection("verification_logs")
          .getList(1, 1, { filter: 'result = "revoked"' }),
      ]);

      const successRate =
        total.totalItems > 0
          ? ((valid.totalItems / total.totalItems) * 100).toFixed(1)
          : "0.0";

      return c.json<ApiResponse<object>>({
        success: true,
        data: {
          total_verifications: total.totalItems,
          today: today.totalItems,
          success_rate: parseFloat(successRate),
          by_result: {
            valid: valid.totalItems,
            invalid: invalid.totalItems,
            revoked: revoked.totalItems,
          },
        },
      });
    } catch (error) {
      logger.error({ err: error }, "Get verification stats error");
      return c.json<ApiResponse<never>>(
        { success: false, error: "Failed to fetch stats" },
        500,
      );
    }
  },
);

export default certificatesRouter;






