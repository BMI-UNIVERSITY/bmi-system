// BMI UMS - Authentication Middleware (RS256 / HS256 dual-mode)

import type { Next } from "hono";
import type { AppEnv } from "../types/hono.js";
type Context = import("hono").Context<AppEnv>;
import { jwtVerify, importSPKI, importPKCS8 } from "jose";
import type { JWTPayload } from "../types/index.js";
import { CONFIG } from "../config/index.js";
import { logger } from "../utils/logger.js";
import { isTokenRevoked } from "../services/tokenBlacklist.js";

// ── Key Management (RS256 with HS256 fallback) ────────────────────────
// RS256 uses public/private key pairs — much more secure than HS256:
// - The signing key (private) never leaves the server
// - The verification key (public) can be shared with other services
// - Compromising the public key doesn't allow token forgery

// KeyLike was removed in jose@6; use CryptoKey | Uint8Array directly
let publicKey: CryptoKey | null = null;
let privateKey: CryptoKey | null = null;
let hs256Secret: Uint8Array | null = null;
let useRS256 = false;

/**
 * Initialize JWT keys based on configuration.
 * If JWT_PRIVATE_KEY and JWT_PUBLIC_KEY are provided, use RS256.
 * Otherwise fall back to HS256 with the shared secret.
 */
export async function initJWTKeys(): Promise<void> {
  // Check for RSA keys in environment
  const privateKeyPem = process.env.JWT_PRIVATE_KEY;
  const publicKeyPem = process.env.JWT_PUBLIC_KEY;

  if (privateKeyPem && publicKeyPem) {
    try {
      privateKey = (await importPKCS8(privateKeyPem, "RS256")) as CryptoKey;
      publicKey = (await importSPKI(publicKeyPem, "RS256")) as CryptoKey;
      useRS256 = true;
      logger.info("JWT: RS256 mode enabled (asymmetric key pair)");
      return;
    } catch (error) {
      logger.error(
        { err: error },
        "Failed to import RSA keys, falling back to HS256",
      );
    }
  }

  // Fall back to HS256
  hs256Secret = new TextEncoder().encode(CONFIG.JWT_SECRET);
  useRS256 = false;
  logger.info(
    "JWT: HS256 mode enabled (shared secret) — set JWT_PRIVATE_KEY/JWT_PUBLIC_KEY for RS256",
  );
}

/**
 * Get the verification key (public key for RS256, secret for HS256)
 */
function getVerificationKey(): CryptoKey | Uint8Array {
  if (useRS256 && publicKey) {
    return publicKey;
  }
  return hs256Secret ?? new TextEncoder().encode(CONFIG.JWT_SECRET);
}

/**
 * Get the signing key (private key for RS256, secret for HS256)
 */
export function getSigningKey(): CryptoKey | Uint8Array {
  if (useRS256 && privateKey) {
    return privateKey;
  }
  return hs256Secret ?? new TextEncoder().encode(CONFIG.JWT_SECRET);
}

/**
 * Get the JWT algorithm being used
 */
export function getJWTAlgorithm(): string {
  return useRS256 ? "RS256" : "HS256";
}

// Store user data in a WeakMap attached to context.
// Carry the full JWTPayload so optional fields (studentId, staffId) are accessible.
const userContext = new WeakMap<Context, JWTPayload>();

/**
 * Verify JWT token
 */
async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getVerificationKey());
    return payload as unknown as JWTPayload;
  } catch (error) { return null;
  }
}

/**
 * JWT Authentication Middleware
 * Verifies Bearer token and attaches user to context
 */
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json(
      {
        success: false,
        error: "Authentication required",
       },
      401,
    );
  }

  const token = authHeader.substring(7);

  // Check blacklist before verifying signature (fast path)
  if (await isTokenRevoked(token)) {
    return c.json(
      {
        success: false,
        error: "Token has been revoked",
      },
      401,
    );
  }

  const payload = await verifyToken(token);

  if (!payload) {
    return c.json(
      {
        success: false,
        error: "Invalid or expired token",
      },
      401,
    );
  }

  // Prevent using MFA tokens for general access
  if (payload.type === "mfa" && !c.req.path.includes("/mfa/")) {
    return c.json(
      {
        success: false,
        error: "MFA verification required",
      },
      403,
    );
  }

  // Store user info
  userContext.set(c, payload);
  c.set("user", payload); // also set on context for audit middleware compatibility

  return await next();
}

/**
 * Get user from context
 */
export function getUser(c: Context) {
  return userContext.get(c);
}

/**
 * Role-based Authorization Middleware
 * Checks if user has required role
 */
export function requireRole(...allowedRoles: string[]) {
  return async (c: Context, next: Next) => {
    // Prefer the verified user payload from WeakMap, but fall back to
    // context storage for compatibility with tests/middleware composition.
    const user = getUser(c) ?? c.get("user");

    if (!user) {
      return c.json(
        {
          success: false,
          error: "Authentication required",
        },
        401,
      );
    }

    if (!allowedRoles.includes(user.role)) {
      logger.warn(
        `Access denied: user with role '${user.role}' attempted unauthorized access`,
      );
      return c.json(
        {
          success: false,
          error: "Access denied: insufficient permissions",
        },
        403,
      );
    }

    return await next();
  };
}

/**
 * Optional Auth Middleware
 * Attaches user if token valid, but doesn't reject if missing/invalid
 */
export async function optionalAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const payload = await verifyToken(token);
    if (payload) {
      c.set("user", payload);
    }
  }

  await next();
}






