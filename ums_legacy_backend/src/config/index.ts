// BMI UMS - Configuration
import { config } from "dotenv";

config();

export const CONFIG = {
  // Server
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3001,
  HOST: process.env.HOST || "0.0.0.0",
  NODE_ENV: process.env.NODE_ENV || "development",

  // Security
  JWT_SECRET: process.env.JWT_SECRET || "",
  REFRESH_SECRET: process.env.REFRESH_SECRET || process.env.JWT_SECRET || "",
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  BCRYPT_ROUNDS: 12,

  // Encryption (for data at rest)
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || "",

  // PocketBase
  POCKETBASE_URL: process.env.POCKETBASE_URL || "http://127.0.0.1:8090",
  POCKETBASE_ADMIN_EMAIL: process.env.POCKETBASE_ADMIN_EMAIL || "admin@bmi.edu",
  POCKETBASE_ADMIN_PASSWORD: process.env.POCKETBASE_ADMIN_PASSWORD || "",

  // Ollama (Local LLM)
  OLLAMA_URL: process.env.OLLAMA_URL || "http://127.0.0.1:11434",
  OLLAMA_MODEL: process.env.OLLAMA_MODEL || "llama3.2",

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100, // per window

  // Frontend URL (for redirects/links)
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  LOG_FILE: process.env.LOG_FILE || "./logs/app.log",

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  // Redis (for token blacklist in multi-instance deployments)
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",

  // JWT Algorithm (RS256 recommended for production)
  // Set JWT_PRIVATE_KEY and JWT_PUBLIC_KEY (PEM format) for RS256
  // If not set, falls back to HS256 with JWT_SECRET
  JWT_PRIVATE_KEY: process.env.JWT_PRIVATE_KEY || "",
  JWT_PUBLIC_KEY: process.env.JWT_PUBLIC_KEY || "",
} as const;

// Validation
export function validateConfig(): void {
  const missing: string[] = [];

  // Always block known-insecure defaults regardless of environment
  if (
    CONFIG.JWT_SECRET === "your-super-secret-jwt-key-change-in-production" ||
    CONFIG.JWT_SECRET.length < 32
  ) {
    missing.push("JWT_SECRET (must be at least 32 random characters)");
  }

  if (
    CONFIG.ENCRYPTION_KEY === "your-32-char-encryption-key!" ||
    CONFIG.ENCRYPTION_KEY.length < 32
  ) {
    missing.push("ENCRYPTION_KEY (must be exactly 32 random characters)");
  }

  if (
    CONFIG.POCKETBASE_ADMIN_PASSWORD === "admin123456" ||
    CONFIG.POCKETBASE_ADMIN_PASSWORD === "change-this-secure-password" ||
    CONFIG.POCKETBASE_ADMIN_PASSWORD.length < 12
  ) {
    missing.push("POCKETBASE_ADMIN_PASSWORD (must be at least 12 characters)");
  }

  if (missing.length > 0) {
    const msg = [
      "",
      "╔══════════════════════════════════════════════════════════╗",
      "║  FATAL SECURITY ERROR — Server will not start            ║",
      "║  Insecure default secrets detected in configuration:     ║",
      ...missing.map((m) => `║  ✗ ${m.padEnd(54)}║`),
      "║                                                          ║",
      "║  Set proper values in backend/.env                       ║",
      "║  Run: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"  ║",
      "╚══════════════════════════════════════════════════════════╝",
      "",
    ].join("\n");
    console.error(msg);
    process.exit(1);
  }

  if (CONFIG.NODE_ENV === "production") {
    if (CONFIG.CORS_ORIGIN === "*") {
      console.error(
        'FATAL: CORS_ORIGIN must not be "*" in production. Set it to your frontend domain.',
      );
      process.exit(1);
    }
    if (!CONFIG.POCKETBASE_URL.startsWith("https://")) {
      console.warn(
        "⚠️  WARNING: POCKETBASE_URL should use HTTPS in production.",
      );
    }
  }
}






