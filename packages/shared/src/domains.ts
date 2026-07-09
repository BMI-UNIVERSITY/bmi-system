/**
 * @bmi/shared — Domain Constants
 *
 * Canonical URLs, origins, and contact information for BMI University.
 * Import these constants instead of hardcoding domain strings.
 */

/** The public URL of the admissions / student portal. */
export const PORTAL_URL = 'https://bmi-portal.hkmministries.org' as const;

/** The public URL of the University Management System (internal staff & students). */
export const UMS_URL = 'https://main.bmi-university.pages.dev' as const;

/** The public URL of the marketing / university website. */
export const MARKETING_URL = 'https://hkmministries.org' as const;

/** The www-prefixed URL of the marketing site. */
export const MARKETING_URL_WWW = 'https://www.hkmministries.org' as const;

/** The Cloudflare Pages preview URL of the portal (used as a fallback origin). */
export const PORTAL_PAGES_URL = 'https://bmi-portal.pages.dev' as const;

/** The Cloudflare Pages preview URL of the UMS frontend. */
export const UMS_PAGES_URL = 'https://bmi-ums.pages.dev' as const;

/** The canonical production URL of the backend API Worker. */
export const API_WORKER_URL = 'https://bmi-api.bmiuniversity107.workers.dev' as const;

/** Local development URLs — always included in allowed origins. */
export const DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
] as const;

/**
 * Full list of CORS-allowed origins for the unified API worker.
 * Covers both the Admissions Portal and the UMS frontend.
 * To add a new origin without a code change, set the ALLOWED_ORIGINS_OVERRIDE
 * environment variable on the Worker (comma-separated list).
 */
export const ALLOWED_ORIGINS: string[] = [
  MARKETING_URL,
  MARKETING_URL_WWW,
  PORTAL_URL,
  PORTAL_PAGES_URL,
  UMS_URL,
  UMS_PAGES_URL,
  // Cloudflare Pages deployment branches
  'https://portal.bmi-university.pages.dev',
  'https://ums.bmi-university.pages.dev',
  ...DEV_ORIGINS,
];

/** The primary admissions contact email address. */
export const ADMISSIONS_EMAIL = 'admissions@bmiuniversity.org' as const;

/** The registrar's office contact email address. */
export const REGISTRAR_EMAIL = 'registrar@bmiuniversity.org' as const;

/** The admin/support contact email address. */
export const ADMIN_EMAIL = 'admin@bmiuniversity.org' as const;
