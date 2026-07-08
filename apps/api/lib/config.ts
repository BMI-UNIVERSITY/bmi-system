/**
 * Returns the base URL of the portal or UMS depending on context.
 *
 * G-3 fix: The production URL is now imported from @bmi/shared instead of
 * being hardcoded here. The environment variable override for local dev is kept.
 */
import { PORTAL_URL as PRODUCTION_PORTAL_URL, UMS_URL as PRODUCTION_UMS_URL } from '@bmi/shared';
import type { Env } from './types';

export function getPortalUrl(env: Env): string {
  return env.ENVIRONMENT === 'development' ? 'http://localhost:5173' : PRODUCTION_PORTAL_URL;
}

/**
 * Returns the base URL of the University Management System (UMS).
 * Used for admin/staff/registrar reset links so they land on the UMS,
 * not the student-facing portal.
 */
export function getUmsUrl(env: Env): string {
  return env.ENVIRONMENT === 'development' ? 'http://localhost:5174' : PRODUCTION_UMS_URL;
}

