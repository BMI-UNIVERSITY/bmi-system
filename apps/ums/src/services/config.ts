import { PORTAL_URL, UMS_URL, API_WORKER_URL } from '@bmi/shared';

// Single source of truth for the production API URL is @bmi/shared → API_WORKER_URL.
// At build time, VITE_API_URL env var takes precedence (set in CI via GitHub Actions).
// When absent, the production build falls back to API_WORKER_URL baked from @bmi/shared.
// For local dev (import.meta.env.DEV) a relative '' base is used so Vite's proxy handles /api.

const isDevBuild = (import.meta as unknown as { env: Record<string, boolean | string> }).env?.DEV;
const envOverride = (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_URL;

// In prod builds, always use the explicit env override OR the shared constant.
// Never fall back to a relative path in production.
const DEFAULT_API_URL = isDevBuild ? '' : (envOverride || API_WORKER_URL);

export const API_URL = (envOverride || DEFAULT_API_URL) + '/api/v1';

export const API_TIMEOUT = 30000; // 30 seconds
export const MAX_RETRIES = 2;

// Export domain URLs from shared package for use in UMS
export { PORTAL_URL, UMS_URL };
