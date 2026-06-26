// BMI UMS - PocketBase Service
import PocketBase from "pocketbase";
import { CONFIG } from "../config/index.js";
import { logger } from "../utils/logger.js";
import { fetchWithTimeout } from "../utils/helpers.js";

import { normalizeText } from "../utils/dataNormalizer.js";

// Singleton PocketBase instance
let pb: PocketBase | null = null;
let wrappedPb: PocketBase | null = null;
let authRefreshInterval: ReturnType<typeof setInterval> | null = null;
let autoBackupInterval: ReturnType<typeof setInterval> | null = null;

function normalizePayload(collectionName: string, data: any): any {
  if (!data) return data;

  // Handle FormData
  if (typeof FormData !== "undefined" && data instanceof FormData) {
    const formData = data as any;
    for (const key of formData.keys()) {
      const val = formData.get(key);
      if (typeof val === "string") {
        if (key === "first_name" || key === "last_name" || key === "full_name") {
          formData.set(key, normalizeText(val, "name"));
        } else if (key === "name") {
          const isPersonCollection = ["students", "staff", "users"].includes(collectionName);
          formData.set(key, normalizeText(val, isPersonCollection ? "name" : "title"));
        } else if (
          ["title", "programme", "department", "faculty", "location", "category"].includes(key)
        ) {
          formData.set(key, normalizeText(val, "title"));
        }
      }
    }
    return formData;
  }

  // Handle plain objects
  if (typeof data !== "object") return data;

  const normalized = { ...data };
  for (const key of Object.keys(normalized)) {
    const val = normalized[key];
    if (typeof val !== "string") continue;

    if (key === "first_name" || key === "last_name" || key === "full_name") {
      normalized[key] = normalizeText(val, "name");
    } else if (key === "name") {
      const isPersonCollection = ["students", "staff", "users"].includes(collectionName);
      normalized[key] = normalizeText(val, isPersonCollection ? "name" : "title");
    } else if (
      ["title", "programme", "department", "faculty", "location", "category"].includes(key)
    ) {
      normalized[key] = normalizeText(val, "title");
    }
  }
  return normalized;
}

function wrapCollectionService(collectionName: string, service: any) {
  return new Proxy(service, {
    get(target, prop, receiver) {
      const originalValue = Reflect.get(target, prop, receiver);

      if (prop === "create") {
        return async function (data: any, ...args: any[]) {
          const cleanData = normalizePayload(collectionName, data);
          return originalValue.call(target, cleanData, ...args);
        };
      }

      if (prop === "update") {
        return async function (id: string, data: any, ...args: any[]) {
          const cleanData = normalizePayload(collectionName, data);
          return originalValue.call(target, id, cleanData, ...args);
        };
      }

      if (typeof originalValue === "function") {
        return originalValue.bind(target);
      }

      return originalValue;
    },
  });
}

function wrapPocketBase(client: PocketBase): PocketBase {
  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === "collection") {
        return function (name: string) {
          const service = target.collection(name);
          return wrapCollectionService(name, service);
        };
      }
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === "function") {
        return value.bind(target);
      }
      return value;
    },
  });
}

/**
 * Get PocketBase instance
 */
export function getPocketBase(): PocketBase {
  if (!pb) {
    pb = new PocketBase(CONFIG.POCKETBASE_URL);
    pb.autoCancellation(false);
    logger.info(`PocketBase initialized at ${CONFIG.POCKETBASE_URL}`);
    wrappedPb = wrapPocketBase(pb);
  }
  return wrappedPb!;
}

/**
 * Authenticate as admin (PocketBase 0.22 API)
 * Using direct HTTP call to avoid SDK version issues
 */
export async function authenticateAdmin(): Promise<void> {
  const pb = getPocketBase();
  try {
    // Direct HTTP call to admin auth endpoint
    const response = await fetchWithTimeout(
      `${CONFIG.POCKETBASE_URL}/api/admins/auth-with-password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identity: CONFIG.POCKETBASE_ADMIN_EMAIL,
          password: CONFIG.POCKETBASE_ADMIN_PASSWORD,
        }),
      },
      5000,
    );

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(
        `Admin auth failed: ${error.message || response.statusText}`,
      );
    }

    const data: any = await response.json();

    // Manually set the auth store
    pb.authStore.save(data.token, data.admin);

    logger.info("PocketBase admin authenticated");
  } catch (error) {
    logger.error({ err: error }, "Failed to authenticate PocketBase admin");
    throw new Error("PocketBase authentication failed");
  }
}

/**
 * Schedule periodic admin token refresh (every 30 minutes)
 * Prevents silent auth failures when the admin token expires mid-session
 */
export function scheduleAdminTokenRefresh(): void {
  const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
  if (authRefreshInterval) clearInterval(authRefreshInterval);
  
  authRefreshInterval = setInterval(async () => {
    try {
      const pb = getPocketBase();
      if (pb.authStore.isValid) {
        // Direct HTTP call to admin refresh endpoint
        const response = await fetchWithTimeout(
          `${CONFIG.POCKETBASE_URL}/api/admins/auth-refresh`,
          {
            method: "POST",
            headers: {
              Authorization: pb.authStore.token,
            },
          },
          5000,
        );

        if (response.ok) {
          const data: any = await response.json();
          pb.authStore.save(data.token, data.admin);
          logger.info("PocketBase admin token refreshed");
        } else {
          await authenticateAdmin();
          logger.info("PocketBase admin re-authenticated");
        }
      } else {
        await authenticateAdmin();
        logger.info("PocketBase admin re-authenticated");
      }
    } catch (error) {
      logger.warn({ err: error }, "PocketBase admin token refresh failed");
    }
  }, REFRESH_INTERVAL_MS);
}

/**
 * Verify collections exist
 * This checks the database schema without mutating it
 */
export async function verifyCollections(): Promise<void> {
  const pb = getPocketBase();

  try {
    // Check if collections exist
    const collections = await pb.collections.getList(1, 100);
    const existingNames = collections.items.map((c) => c.name);

    logger.info(`Existing collections: ${existingNames.join(", ")}`);

    const requiredCollections = [
      "academic_records",
      "study_centers",
      "certificates",
      "courses",
      "enrollments",
      "grades",
      "library_items",
      "modules",
      "staff",
      "students",
      "transactions",
      "verification_logs",
      "transcripts",
      "transcript_verification_logs",
      "audit_logs",
      "grade_appeals",
      "grading_scales",
      "hostels",
      "room_assignments",
      "medical_visits",
      "inventory_items",
      "visitors",
      "attendance_records",
      "users",
      "faculties",
      "departments",
      "programs",
      "program_courses",
      "academic_terms",
    ];

    const missing = requiredCollections.filter(
      (name) => !existingNames.includes(name),
    );

    if (missing.length > 0) {
      logger.error(
        `CRITICAL: Missing required collections: ${missing.join(", ")}`,
      );
      logger.error("Please run PocketBase migrations to setup the schema.");
      if (CONFIG.NODE_ENV === "production") {
        throw new Error(`Missing collections: ${missing.join(", ")}`);
      }
    } else {
      logger.info("✓ All required collections verified");
    }
  } catch (error) {
    logger.error({ err: error }, "Failed to verify collections");
    throw error;
  }
}

/**
 * Create default admin user if no users exist
 * This ensures the system is accessible on first run
 */
export async function createDefaultAdminIfNeeded(): Promise<void> {
  const pb = getPocketBase();

  try {
    // ALWAYS ensure the core admin user exists, is active, and has the admin role
    const adminEmail = CONFIG.POCKETBASE_ADMIN_EMAIL;
    let adminUser = null;

    try {
      adminUser = await pb
        .collection("users")
        .getFirstListItem(`email="${adminEmail}"`);
    } catch (error) {
      // User not found, will create
    }

    if (adminUser) {
      // Lock the account properties
      if (
        !adminUser.isActive ||
        adminUser.role !== "admin" ||
        !adminUser.name
      ) {
        logger.info(
          `Locking/Restoring admin user account properties for ${adminEmail}`,
        );
        await pb.collection("users").update(adminUser.id, {
          isActive: true,
          role: "admin",
          name: "System Administrator",
          verified: true,
        });
      }
    } else {
      // No admin exists - create default admin
      logger.info("Admin user not found. Creating locked admin user...");
      await pb.collection("users").create({
        email: adminEmail,
        password: CONFIG.POCKETBASE_ADMIN_PASSWORD,
        passwordConfirm: CONFIG.POCKETBASE_ADMIN_PASSWORD,
        name: "System Administrator",
        role: "admin",
        department: "IT Administration",
        isActive: true,
        verified: true,
        emailVisibility: false,
      });
      logger.info(`Locked admin user created: ${adminEmail}`);
    }
  } catch (error) {
    logger.error({ err: error }, "Failed to secure admin user account");
  }
}

/**
 * Health check for PocketBase connection
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const pb = getPocketBase();
    await pb.health.check();
    return true;
  } catch (error) { return false;
  }
}

/**
 * Create a database backup (manual snapshot)
 * Uses PocketBase's internal backup API if available, or falls back to file copy
 */
export async function createDatabaseBackup(): Promise<{
  success: boolean;
  name?: string;
  error?: string;
 }> {
  const pb = getPocketBase();
  try {
    // PocketBase 0.22+ supports automated backups via API
    // We'll trigger a manual backup through the admin client
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupName = `backup_${timestamp}.zip`;

    // Direct HTTP call to trigger backup
    const response = await fetch(
      `${CONFIG.POCKETBASE_URL}/api/backups/${backupName}`,
      {
        method: "POST",
        headers: {
          Authorization: pb.authStore.token,
        },
      },
    );

    if (response.ok) {
      logger.info(`Database backup created: ${backupName}`);
      return { success: true, name: backupName };
    } else {
      const errorData: any = await response.json();
      throw new Error(errorData.message || "Backup failed");
    }
  } catch (error) {
    logger.error({ err: error }, "Failed to create database backup");
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Schedule automatic database backups
 * Default: Once every 24 hours
 */
export function scheduleAutoBackups(intervalMs: number = 24 * 60 * 60 * 1000): void {
  logger.info(
    `Scheduling automatic database backups every ${intervalMs / 3600000} hours`,
  );
  if (autoBackupInterval) clearInterval(autoBackupInterval);

  autoBackupInterval = setInterval(async () => {
    const pb = getPocketBase();
    if (pb.authStore.isValid) {
      await createDatabaseBackup();
    } else {
      try {
        await authenticateAdmin();
        await createDatabaseBackup();
      } catch (error) {
        logger.error(
          { err: error },
          "Scheduled backup failed: Admin authentication error",
        );
      }
    }
  }, intervalMs);
}

/**
 * Graceful shutdown of PocketBase service
 */
export function shutdownPocketBase(): void {
  if (authRefreshInterval) {
    clearInterval(authRefreshInterval);
    authRefreshInterval = null;
  }
  if (autoBackupInterval) {
    clearInterval(autoBackupInterval);
    autoBackupInterval = null;
  }
  logger.info("PocketBase service intervals cleared");
}






