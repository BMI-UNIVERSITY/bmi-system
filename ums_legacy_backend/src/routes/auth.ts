// BMI UMS - Authentication Routes (Re-implemented with Best Practices)
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import PocketBase from "pocketbase";
import { SignJWT, jwtVerify } from "jose";
import { setCookie, getCookie, deleteCookie } from "hono/cookie";
import { rateLimiter } from "hono-rate-limiter";
import { getPocketBase } from "../services/pocketbase.js";
import { CONFIG } from "../config/index.js";
import { logger } from "../utils/logger.js";
import {
  authMiddleware,
  getUser,
  getSigningKey,
  getJWTAlgorithm,
} from "../middleware/auth.js";
import { MfaService } from "../services/mfa.js";
import type { User, JWTPayload } from "../types/index.js";
import type { AppEnv } from "../types/hono.js";
import { ApiResponseSchema, ErrorResponseSchema } from "../openapi/common.js";

import { tokenService, TokenPayload } from "../services/tokenService.js";

const authRouter = new OpenAPIHono<AppEnv>();

// Apply authentication middleware selectively at router level
authRouter.use("/logout", authMiddleware);
authRouter.use("/me", authMiddleware);
authRouter.use("/change-password", authMiddleware);
authRouter.use("/mfa/setup", authMiddleware);
authRouter.use("/mfa/enable", authMiddleware);

const COOKIE_NAME = "bmi_refresh_token";

// Strict rate limiter for login — 10 attempts per 15 minutes per IP
const loginRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  keyGenerator: (c) =>
    c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown",
  message: {
    success: false,
    error: "Too many login attempts. Please try again in 15 minutes.",
  },
});

// Validation schemas
const LoginSchema = z
  .object({
    email: z
      .string()
      .email("Invalid email address")
      .openapi({ example: "admin@bmiuniversity.org" }),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password too long")
      .openapi({ example: "password123!" }),
    rememberMe: z
      .boolean()
      .optional()
      .default(false)
      .openapi({ example: false }),
  })
  .openapi("LoginRequest");

const LoginResponseDataSchema = z
  .object({
    token: z.string().optional().openapi({ example: "eyJhbG..." }),
    mfaRequired: z.boolean().optional().openapi({ example: false }),
    mfaSetupRequired: z.boolean().optional().openapi({ example: false }),
    mfaToken: z.string().optional().openapi({ description: "Temporary token for MFA verification" }),
    user: z
      .object({
        id: z.string().openapi({ example: "123" }),
        email: z.string().email().openapi({ example: "admin@bmiuniversity.org" }),
        name: z.string().openapi({ example: "Admin" }),
        role: z.string().openapi({ example: "admin" }),
        department: z.string().optional().openapi({ example: "IT" }),
        isActive: z.boolean().openapi({ example: true }),
        mfaEnabled: z.boolean().optional().openapi({ example: false }),
        lastLogin: z.string().optional().openapi({ example: "2024-05-19T03:15:05Z" }),
        created: z.string().openapi({ example: "2024-05-19T03:15:05Z" }),
        updated: z.string().openapi({ example: "2024-05-19T03:15:05Z" }),
      })
      .optional(),
  })
  .openapi("LoginResponse");

// Route definitions
const loginRoute = createRoute({
  method: "post",
  path: "/login",
  tags: ["Auth"],
  summary: "Login",
  description: "Authenticate with email and password",
  request: {
    body: {
      content: {
        "application/json": {
          schema: LoginSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(LoginResponseDataSchema),
        },
      },
      description: "Login successful",
    },
    401: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Invalid credentials",
    },
    403: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Account deactivated",
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

const logoutRoute = createRoute({
  method: "post",
  path: "/logout",
  tags: ["Auth"],
  summary: "Logout",
  description: "Revoke token and clear refresh cookie",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(z.null()),
        },
      },
      description: "Logout successful",
    },
  },
});

const refreshRoute = createRoute({
  method: "post",
  path: "/refresh",
  tags: ["Auth"],
  summary: "Refresh Token",
  description: "Get a new access token using the refresh cookie",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(z.object({ token: z.string() })),
        },
      },
      description: "Token refreshed",
    },
    401: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Refresh token missing or invalid",
    },
    403: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Account deactivated",
    },
  },
});

const meRoute = createRoute({
  method: "get",
  path: "/me",
  tags: ["Auth"],
  summary: "Get Current User",
  description: "Get information about the currently authenticated user",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(z.any()), // Use any for now
        },
      },
      description: "Current user details",
    },
    401: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Unauthorized",
    },
  },
});

const updateMeRoute = createRoute({
  method: "patch",
  path: "/me",
  tags: ["Auth"],
  summary: "Update Current User",
  description: "Update information about the currently authenticated user",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            name: z.string().optional(),
            phone: z.string().optional(),
            address: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(z.any()),
        },
      },
      description: "User updated successfully",
    },
    401: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Unauthorized",
    },
  },
});

const exportDataRoute = createRoute({
  method: "post",
  path: "/export-data",
  tags: ["Auth"],
  summary: "Export My Data",
  description: "Download a full archive of my personal data (Subject Access Rights)",
  responses: {
    200: {
      content: { "application/json": { schema: ApiResponseSchema(z.any()) } },
      description: "Data export prepared",
    },
    401: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "Unauthorized",
    },
  },
});

const forgetMeRoute = createRoute({
  method: "post",
  path: "/forget-me",
  tags: ["Auth"],
  summary: "Right to be Forgotten",
  description: "Permanently delete my account and personal data",
  responses: {
    200: {
      content: { "application/json": { schema: ApiResponseSchema(z.any()) } },
      description: "Account deletion initiated",
    },
    401: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "Unauthorized",
    },
  },
});

const mfaVerifyRoute = createRoute({
  method: "post",
  path: "/mfa/verify",
  tags: ["Auth"],
  summary: "Verify MFA Token",
  description: "Complete login by verifying a TOTP token",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            mfaToken: z.string(),
            code: z.string().length(6),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(LoginResponseDataSchema),
        },
      },
      description: "MFA verified, login successful",
    },
    401: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Invalid MFA code or token",
    },
    403: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Account deactivated or forbidden",
    },
  },
});

const mfaSetupRoute = createRoute({
  method: "post",
  path: "/mfa/setup",
  tags: ["Auth"],
  summary: "Setup MFA",
  description: "Generate a new MFA secret and QR code",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(
            z.object({
              secret: z.string(),
              qrCode: z.string(),
            }),
          ),
        },
      },
      description: "MFA setup details",
    },
  },
});

const mfaEnableRoute = createRoute({
  method: "post",
  path: "/mfa/enable",
  tags: ["Auth"],
  summary: "Enable MFA",
  description: "Confirm MFA setup by verifying the first code",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            secret: z.string(),
            code: z.string().length(6),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(
            z.object({
              recoveryCodes: z.array(z.string()),
            }),
          ),
        },
      },
      description: "MFA enabled successfully",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Invalid verification code",
    },
  },
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const forgotPasswordRoute = createRoute({
  method: "post",
  path: "/forgot-password",
  tags: ["Auth"],
  summary: "Forgot Password",
  description: "Request a password reset email",
  request: {
    body: {
      content: {
        "application/json": {
          schema: forgotPasswordSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(z.null()),
        },
      },
      description: "Password reset request processed",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Validation error",
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

const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: z
      .string()
      .min(12, "Password must be at least 12 characters")
      .max(128, "Password too long")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[^A-Za-z0-9]/,
        "Password must contain at least one special character",
      ),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwords do not match",
    path: ["passwordConfirm"],
  });

const resetPasswordRoute = createRoute({
  method: "post",
  path: "/reset-password",
  tags: ["Auth"],
  summary: "Reset Password",
  description: "Confirm password reset using the token from the email",
  request: {
    body: {
      content: {
        "application/json": {
          schema: resetPasswordSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(z.null()),
        },
      },
      description: "Password reset successfully",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Validation error or passwords mismatch",
    },
  },
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(128, "Password too long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[^A-Za-z0-9]/,
      "Password must contain at least one special character",
    ),
});

const changePasswordRoute = createRoute({
  method: "post",
  path: "/change-password",
  tags: ["Auth"],
  summary: "Change Password",
  description: "Change password for the currently authenticated user",
  request: {
    body: {
      content: {
        "application/json": {
          schema: changePasswordSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApiResponseSchema(z.null()),
        },
      },
      description: "Password updated successfully",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Validation error",
    },
    401: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Current password incorrect",
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

/**
 * Helper: Generate Access and Refresh Tokens
 */
async function generateTokens(
  user: User | { id: string; email: string; role: string },
  _rememberMe: boolean = false,
  type: "access" | "mfa" = "access",
): Promise<{ accessToken: string; refreshToken?: string }> {
  const payload: TokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };

  if (type === "mfa") {
    // MFA token is short-lived and has limited scope (not a full access token)
    const secret = getSigningKey();
    const token = await new SignJWT({ ...payload, type: "mfa" } as any)
      .setProtectedHeader({ alg: getJWTAlgorithm() })
      .setIssuedAt()
      .setExpirationTime("10m")
      .sign(secret);
    return { accessToken: token };
  }

  const accessToken = await tokenService.generateAccessToken(payload);
  const refreshToken = await tokenService.generateRefreshToken(payload);

  return { accessToken, refreshToken };
}

/**
 * Helper: Set Refresh Token Cookie
 */
function setRefreshCookie(
  c: import("hono").Context<AppEnv>,
  token: string,
) {
  setCookie(c, COOKIE_NAME, token, {
    httpOnly: true,
    secure: CONFIG.NODE_ENV === "production",
    sameSite: CONFIG.NODE_ENV === "production" ? "Strict" : "Lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

// Implement routes
authRouter.use("/login", loginRateLimiter);

authRouter.openapi(loginRoute, async (c) => {
  const { email, password, rememberMe } = c.req.valid("json");

  try {
    // Use a fresh PocketBase instance to avoid overwriting the global admin auth store
    const authPb = new PocketBase(CONFIG.POCKETBASE_URL);

    // Authenticate with PocketBase — all users go through the same path
    const authData = await authPb
      .collection("users")
      .authWithPassword(email as string, password as string);
    const user = authData.record as unknown as User;

    if (user.isActive === false) {
      return c.json(
        {
          success: false,
          error: "Account is deactivated",
        },
        403,
      );
    }

    // Check if MFA is required by policy for privileged roles
    const isPrivileged = ["admin", "registrar", "staff", "faculty"].includes(user.role);

    // DEV BYPASS: Skip MFA for admin@bmi.edu in development
    const isDevAdmin = email === "admin@bmi.edu" && CONFIG.NODE_ENV === "development";

    // If MFA is enabled, require verification
    if (user.mfaEnabled && !isDevAdmin) {
      const { accessToken: mfaToken } = await generateTokens(
        user,
        rememberMe,
        "mfa",
      );
      return c.json(
        {
          success: true,
          data: {
            mfaRequired: true,
            mfaToken,
          },
        },
        200,
      );
    }

    // If MFA is NOT enabled but required by policy, force setup
    if (isPrivileged && !isDevAdmin) {
      const { accessToken: mfaToken } = await generateTokens(
        user,
        rememberMe,
        "mfa",
      );
      return c.json(
        {
          success: true,
          data: {
            mfaSetupRequired: true,
            mfaToken,
          },
        },
        200,
      );
    }

    const { accessToken, refreshToken } = await generateTokens(
      user,
      rememberMe,
    );
    if (refreshToken) {
      setRefreshCookie(c, refreshToken);
    }

    return c.json(
      {
        success: true,
        data: {
          token: accessToken,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            department: user.department,
            isActive: user.isActive,
            mfaEnabled: user.mfaEnabled,
            lastLogin: user.lastLogin,
            created: user.created,
            updated: user.updated,
          },
        },
      },
      200,
    );
  } catch (error) {
    logger.error({ err: error }, "Login failed");
    return c.json(
      {
        success: false,
        error: "Invalid email or password",
      },
      401,
    );
  }
});

authRouter.openapi(refreshRoute, async (c) => {
  const refreshToken = getCookie(c, COOKIE_NAME);
  if (!refreshToken) {
    return c.json({ success: false, error: "No refresh token" }, 401);
  }

  const payload = await tokenService.verifyRefreshToken(refreshToken);
  if (!payload) {
    return c.json({ success: false, error: "Invalid refresh token" }, 401);
  }

  const accessToken = await tokenService.generateAccessToken(payload);
  return c.json({ success: true, data: { token: accessToken } }, 200);
});

authRouter.openapi(logoutRoute, async (c) => {
  deleteCookie(c, COOKIE_NAME);
  return c.json({ success: true, data: null }, 200);
});

authRouter.openapi(meRoute, async (c) => {
  const user = getUser(c);
  if (!user) {
    return c.json(
      {
        success: false,
        error: "Unauthorized",
      },
      401,
    );
  }

  return c.json({
    success: true,
    data: user,
  }, 200);
});

authRouter.openapi(updateMeRoute, async (c) => {
  const user = getUser(c);
  if (!user) {
    return c.json({ success: false, error: "Unauthorized" }, 401) as any;
  }

  const data = c.req.valid("json");
  const pb = getPocketBase();

  try {
    const userId = user.sub || user.id || "";
    const updatedUser = await pb.collection("users").update(userId, data);
    return c.json({
      success: true,
      data: updatedUser,
    }, 200) as any;
  } catch (error) {
    logger.error({ err: error }, "Update user error");
    return c.json({ success: false, error: "Failed to update profile" }, 500) as any;
  }
});

authRouter.openapi(exportDataRoute, async (c) => {
  const user = getUser(c);
  if (!user) return c.json({ success: false, error: "Unauthorized" }, 401) as any;

  try {
    const pb = getPocketBase();
    const userId = (user.sub || user.id) as string;

    // Collect all data related to user
    const [userData, auditLogs, notifications, attendance] = await Promise.all([
      pb.collection("users").getOne(userId),
      pb.collection("audit_logs").getFullList({ filter: `userId = "${userId}"` }),
      pb.collection("notifications").getFullList({ filter: `user_id = "${userId}"` }),
      pb.collection("attendance_records").getFullList({ filter: `student_id = "${userId}"` }),
    ]);

    const archive = {
      user: userData,
      activity: auditLogs,
      notifications,
      attendance,
      exportedAt: new Date().toISOString(),
    };

    return c.json({
      success: true,
      data: archive,
      message: "Data export compiled successfully",
    }, 200) as any;
  } catch (error) {
    logger.error({ err: error }, "Data export error");
    return c.json({ success: false, error: "Failed to compile data export" }, 500) as any;
  }
});

authRouter.openapi(forgetMeRoute, async (c) => {
  const user = getUser(c);
  if (!user) return c.json({ success: false, error: "Unauthorized" }, 401) as any;

  try {
    const pb = getPocketBase();
    const userId = (user.sub || user.id) as string;

    // GDPR "Right to be Forgotten" - Deactivate and Scrub
    // In a real system, you might delete the record or anonymize it.
    // We will anonymize and deactivate to maintain referential integrity in logs.
    await pb.collection("users").update(userId, {
      isActive: false,
      name: "Deleted User",
      email: `deleted_${userId}@bmi.edu`,
      phone: "",
      address: "",
      mfaSecret: "",
      mfaRecoveryCodes: [],
    });

    logger.info({ userId }, `User ${userId} exercised Right to be Forgotten.`);

    return c.json({
      success: true,
      message: "Account has been deactivated and personal data scrubbed.",
    }, 200) as any;
  } catch (error) {
    logger.error({ err: error }, "Forget-me error");
    return c.json({ success: false, error: "Failed to process request" }, 500) as any;
  }
});

authRouter.openapi(mfaVerifyRoute, async (c) => {
  const { mfaToken, code } = c.req.valid("json");

  try {
    const { payload } = await jwtVerify(mfaToken, getSigningKey());
    const jwtPayload = payload as unknown as JWTPayload;

    if (jwtPayload.type !== "mfa") {
      throw new Error("Invalid token type");
    }

    const pb = getPocketBase();
    const user = (await pb
      .collection("users")
      .getOne(jwtPayload.sub)) as unknown as User;

    if (!user.isActive) {
      return c.json({ success: false, error: "Account deactivated" }, 403);
    }

    // Verify TOTP
    const isValid = MfaService.verifyToken(code, user.mfaSecret || "");
    if (!isValid) {
      // Check recovery codes
      const recoveryCodes = (user.mfaRecoveryCodes as string[]) || [];
      const codeIndex = recoveryCodes.indexOf(code.toUpperCase());
      
      if (codeIndex !== -1) {
        // Valid recovery code used
        recoveryCodes.splice(codeIndex, 1);
        await pb.collection("users").update(user.id, {
          mfaRecoveryCodes: recoveryCodes,
        });
      } else {
        return c.json({ success: false, error: "Invalid verification code" }, 401);
      }
    }

    // Login successful
    const { accessToken, refreshToken } = await generateTokens(user);
    if (refreshToken) {
      setRefreshCookie(c, refreshToken);
    }

    return c.json({
      success: true,
      data: {
        token: accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department,
          isActive: user.isActive,
          mfaEnabled: user.mfaEnabled,
          lastLogin: user.lastLogin,
          created: user.created,
          updated: user.updated,
        },
      },
    }, 200);
  } catch (error) {
    logger.error({ err: error }, "MFA verification error");
    return c.json({ success: false, error: "Invalid or expired MFA token" }, 401);
  }
});

authRouter.openapi(mfaSetupRoute, async (c) => {
  const user = getUser(c)!;
  const secret = MfaService.generateSecret();
  const otpAuthUrl = MfaService.generateOtpAuthUrl(user.email || "", secret);
  const qrCode = await MfaService.generateQrCode(otpAuthUrl);

  return c.json({
    success: true,
    data: { secret, qrCode },
  }, 200);
});

authRouter.openapi(mfaEnableRoute, async (c) => {
  const { secret, code } = c.req.valid("json");
  const user = getUser(c)!;

  const isValid = MfaService.verifyToken(code, secret);
  if (!isValid) {
    return c.json({ success: false, error: "Invalid verification code" }, 400);
  }

  const recoveryCodes = MfaService.generateRecoveryCodes();
  const pb = getPocketBase();

  await pb.collection("users").update(user.sub || user.id || "", {
    mfaSecret: secret,
    mfaEnabled: true,
    mfaRecoveryCodes: recoveryCodes,
  });

  logger.info({ userId: user.sub || user.id }, "MFA enabled for user");

  return c.json({
    success: true,
    data: { recoveryCodes },
  }, 200);
});

authRouter.openapi(forgotPasswordRoute, async (c) => {
  try {
    const { email } = c.req.valid("json");
    const pb = getPocketBase();

    try {
      await pb.collection("users").requestPasswordReset(email);
    } catch (error) { // Return 200 regardless of whether the email exists to prevent user enumeration
    }

    return c.json({
      success: true,
      data: null,
      message: "Password reset instructions sent",
    }, 200);
  } catch (error) {
    logger.error({ err: error }, "Forgot password error");
    return c.json({ success: false, error: "Failed to request password reset"  }, 500);
  }
});

authRouter.openapi(resetPasswordRoute, async (c) => {
  try {
    const { token, password, passwordConfirm } = c.req.valid("json");
    const pb = getPocketBase();

    await pb.collection("users").confirmPasswordReset(token, password, passwordConfirm);

    return c.json({
      success: true,
      data: null,
      message: "Password reset successful",
    }, 200);
  } catch (error) {
    logger.error({ err: error }, "Reset password error");
    return c.json({ success: false, error: "Failed to reset password" }, 400);
  }
});

authRouter.openapi(changePasswordRoute, async (c) => {
  try {
    const { currentPassword, newPassword } = c.req.valid("json");
    const user = getUser(c);

    if (!user) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    const pb = getPocketBase();

    try {
      // Authenticate with current password to verify identity
      await pb.collection("users").authWithPassword(user.email || "", currentPassword);
    } catch (error) { return c.json({ success: false, error: "Current password is incorrect"  }, 401);
    }

    // Update the password
    await pb.collection("users").update(user.sub || user.id || "", {
      password: newPassword,
      passwordConfirm: newPassword,
    });

    return c.json({
      success: true,
      data: null,
      message: "Password changed successfully",
    }, 200);
  } catch (error) {
    logger.error({ err: error }, "Change password error");
    return c.json({ success: false, error: "Failed to change password" }, 500);
  }
});



export default authRouter;






