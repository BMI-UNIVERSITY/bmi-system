// BMI UMS - Helper Functions

/**
 * Generate a unique serial number for certificates
 * Format: BMI-YYYY-NNNNNN
 */
export function generateCertificateSerial(
  year: number,
  sequence: number,
): string {
  const paddedSequence = sequence.toString().padStart(6, "0");
  return `BMI-${year}-${paddedSequence}`;
}

/**
 * Validate certificate serial format
 */
export function isValidCertificateSerial(serial: string): boolean {
  return /^BMI-\d{4}-\d{6}$/.test(serial);
}

/**
 * Generate content hash for certificate verification
 * Uses SHA-256 via the Web Crypto API (available in Node 18+ and all browsers)
 */
export async function generateContentHash(data: {
  serial: string;
  studentId: string;
  name: string;
  degree: string;
  issueDate: string;
}): Promise<string> {
  const input = `${data.serial}|${data.studentId}|${data.name}|${data.degree}|BMI University|${data.issueDate}`;

  // Use Node.js built-in crypto for SHA-256 (no external dependency needed)
  const { createHash } = await import("crypto");
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Format currency for display
 */
export function formatCurrency(
  amount: number,
  currency: string = "USD",
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

/**
 * Calculate GPA class
 */
export function calculateGPAClass(gpa: number): string {
  if (gpa >= 3.7) return "First Class Honours";
  if (gpa >= 3.3) return "Second Class Honours (Upper Division)";
  if (gpa >= 3.0) return "Second Class Honours (Lower Division)";
  if (gpa >= 2.0) return "Pass";
  return "Fail";
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Sanitize a string for safe use in PocketBase filter expressions.
 * Strips quotes and backslashes, and truncates to maxLength.
 */
export function sanitizeFilter(value: string, maxLength: number = 100): string {
  return value.replace(/["'\\]/g, "").substring(0, maxLength);
}



/**
 * Parse pagination parameters
 */
export function parsePagination(
  page: string | undefined,
  perPage: string | undefined,
  defaults: { page: number; perPage: number; maxPerPage: number },
): { page: number; perPage: number; offset: number } {
  const parsedPage = Math.max(
    1,
    parseInt(page || String(defaults.page), 10) || defaults.page,
  );
  const parsedPerPage = Math.min(
    defaults.maxPerPage,
    Math.max(
      1,
      parseInt(perPage || String(defaults.perPage), 10) || defaults.perPage,
    ),
  );

  return {
    page: parsedPage,
    perPage: parsedPerPage,
    offset: (parsedPage - 1) * parsedPerPage,
  };
}

/**
 * Generate avatar color based on name
 */
export function generateAvatarColor(name: string): string {
  const colors = [
    "bg-purple-600",
    "bg-blue-600",
    "bg-emerald-600",
    "bg-amber-600",
    "bg-rose-600",
    "bg-cyan-600",
    "bg-indigo-600",
    "bg-teal-600",
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

/**
 * Fetch with timeout helper
 */
export async function fetchWithTimeout(
  url: string,
  options: Parameters<typeof fetch>[1] = {},
  timeoutMs: number = 5000,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout - ${url} not responding`);
    }
    throw error;
  }
}

/**
 * Safely join filters for PocketBase, ignoring null/undefined
 */
export function buildFilter(
  filters: (string | undefined | null)[],
): string | undefined {
  const activeFilters = filters.filter(
    (f) => f && f.trim() !== "" && f !== "undefined",
  );
  return activeFilters.length > 0 ? activeFilters.join(" && ") : undefined;
}

/**
 * Extract a human-readable message from an unknown catch value.
 * Replaces the antipattern `catch (error) { ... error.message }`.
 *
 * @example
 *   try { ... } catch (error) { logger.error(errorMessage(error)); }
 */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}

/**
 * Safely cast a PocketBase RecordModel to a known domain type.
 * PocketBase returns `RecordModel` (with `[key: string]: any`) from all
 * collection queries.  This helper preserves the structured fields while
 * making the caller's intent explicit and eliminating `(record as any)` casts.
 *
 * @example
 *   const students = list.items.map(r => pbRecord<Student>(r));
 */
export function pbRecord<T>(record: unknown): T {
  return record as T;
}

/**
 * Type guard for PocketBase ClientResponseError objects which carry a
 * numeric `status` property alongside a `message`.
 */
export interface PbError {
  status: number;
  message: string;
}
export function isPbError(error: unknown): error is PbError {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as Record<string, unknown>).status === "number"
  );
}

/**
 * Split a full name into first and last name components
 */
export function parseName(fullName: string | undefined | null): {
  first: string;
  last: string;
} {
  if (!fullName) return { first: "", last: "" };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return {
    first: parts[0],
    last: parts.slice(1).join(" "),
  };
}






