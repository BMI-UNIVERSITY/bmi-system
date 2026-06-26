import { describe, it, expect, vi } from "vitest";
import authRouter from "./auth.js";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("../services/pocketbase.js", () => ({
  getPocketBase: vi.fn(() => ({
    collection: () => ({
      authWithPassword: vi.fn().mockResolvedValue({
        record: {
          id: "u1",
          email: "admin@bmi.edu",
          name: "Admin",
          role: "admin",
          isActive: true,
          lastLogin: null,
          created: "2025-01-01",
          updated: "2025-01-01",
        },
      }),
      update: vi.fn().mockResolvedValue({}),
      getOne: vi.fn().mockResolvedValue({
        id: "u1",
        email: "admin@bmi.edu",
        name: "Admin",
        role: "admin",
        isActive: true,
      }),
      requestPasswordReset: vi.fn().mockResolvedValue({}),
      confirmPasswordReset: vi.fn().mockResolvedValue({}),
    }),
  })),
}));

vi.mock("../config/index.js", () => ({
  CONFIG: {
    JWT_SECRET: "test-secret-that-is-long-enough-to-pass-validation",
    JWT_ACCESS_EXPIRES_IN: "15m",
    JWT_REFRESH_EXPIRES_IN: "7d",
    NODE_ENV: "test",
    POCKETBASE_URL: "http://localhost:8090",
    POCKETBASE_ADMIN_EMAIL: "admin@bmi.edu",
    POCKETBASE_ADMIN_PASSWORD: "test-password-12chars",
  },
}));

vi.mock("../utils/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("../services/tokenBlacklist.js", () => ({
  isTokenRevoked: vi.fn(() => false),
  revokeToken: vi.fn(),
}));

// Mock the PocketBase SDK itself so the login handler's `new PocketBase(...)` gets a stub
vi.mock("pocketbase", () => {
  const mockRecord = {
    id: "u1",
    email: "admin@bmi.edu",
    name: "Admin",
    role: "admin",
    isActive: true,
    lastLogin: null,
    created: "2025-01-01",
    updated: "2025-01-01",
  };
  const PocketBaseMock = vi.fn(() => ({
    collection: () => ({
      authWithPassword: vi.fn().mockResolvedValue({ record: mockRecord }),
      update: vi.fn().mockResolvedValue({}),
      getOne: vi.fn().mockResolvedValue(mockRecord),
      requestPasswordReset: vi.fn().mockResolvedValue({}),
      confirmPasswordReset: vi.fn().mockResolvedValue({}),
    }),
    authStore: { save: vi.fn(), clear: vi.fn(), isValid: true },
    autoCancellation: vi.fn(),
  }));
  return { default: PocketBaseMock };
});

vi.mock("../middleware/auth.js", () => ({
  initJWTKeys: vi.fn(),
  authMiddleware: vi.fn(async (c: any, next: any) => {
    c.set("user", { sub: "u1", email: "admin@bmi.edu", role: "admin" });
    await next();
  }),
  getUser: (c: any) => c.get("user"),
  getSigningKey: () =>
    new TextEncoder().encode(
      "test-secret-that-is-long-enough-to-pass-validation",
    ),
  getJWTAlgorithm: () => "HS256",
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeLoginBody(overrides: object = {}) {
  return JSON.stringify({
    email: "admin@bmi.edu",
    password: "ValidPassword1!",
    rememberMe: false,
    ...overrides,
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Auth Routes — login validation", () => {
  it("rejects invalid email format", async () => {
    const res = await authRouter.fetch(
      new Request("http://localhost/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: makeLoginBody({ email: "not-an-email" }),
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it("rejects password shorter than 12 chars", async () => {
    const res = await authRouter.fetch(
      new Request("http://localhost/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: makeLoginBody({ password: "short" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("passes schema validation (not rejected with 400) for valid credentials", async () => {
    const res = await authRouter.fetch(
      new Request("http://localhost/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: makeLoginBody(),
      }),
    );
    // Valid input must NOT be rejected by the schema (would be 400).
    // It may return 401 if PocketBase is unavailable in the test environment.
    expect(res.status).not.toBe(400);
  });

  it("does not return validation error for well-formed body", async () => {
    const res = await authRouter.fetch(
      new Request("http://localhost/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: makeLoginBody({ rememberMe: true }),
      }),
    );
    // rememberMe: true is valid. Must not be a 400 validation error.
    expect(res.status).not.toBe(400);
  });
});

describe("Auth Routes — forgot-password", () => {
  it("rejects invalid email", async () => {
    const res = await authRouter.fetch(
      new Request("http://localhost/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "bad" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 for valid email (same response whether email exists or not)", async () => {
    const res = await authRouter.fetch(
      new Request("http://localhost/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@example.com" }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

describe("Auth Routes — reset-password", () => {
  it("rejects missing token", async () => {
    const res = await authRouter.fetch(
      new Request("http://localhost/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: "ValidPassword1!",
          passwordConfirm: "ValidPassword1!",
        }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects short password", async () => {
    const res = await authRouter.fetch(
      new Request("http://localhost/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: "abc",
          password: "short",
          passwordConfirm: "short",
        }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects mismatched passwordConfirm", async () => {
    const res = await authRouter.fetch(
      new Request("http://localhost/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: "valid-token",
          password: "ValidPassword1!",
          passwordConfirm: "DifferentPassword1!",
        }),
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe("Auth Routes — change-password", () => {
  it("rejects password shorter than 12 chars", async () => {
    const res = await authRouter.fetch(
      new Request("http://localhost/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: "OldPassword1!",
          newPassword: "short",
        }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects password missing special character", async () => {
    const res = await authRouter.fetch(
      new Request("http://localhost/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: "OldPassword1!",
          newPassword: "NoSpecialChar1234",
        }),
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe("Auth Routes — /me endpoint", () => {
  it("returns current user when authenticated", async () => {
    const res = await authRouter.fetch(
      new Request("http://localhost/me", { method: "GET" }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

describe("Auth Routes — refresh", () => {
  it("returns 401 when no refresh cookie present", async () => {
    const res = await authRouter.fetch(
      new Request("http://localhost/refresh", { method: "POST" }),
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("No refresh token");
  });
});






