/**
 * Returns the base URL of the portal.
 *
 * G-3 fix: The production URL is now imported from @bmi/shared instead of
 * being hardcoded here. The environment variable override for local dev is kept.
 */
import { PORTAL_URL as PRODUCTION_PORTAL_URL } from '@bmi/shared';
import type { Env } from './types';

export function getPortalUrl(env: Env): string {
  return env.ENVIRONMENT === 'development' ? 'http://localhost:5173' : PRODUCTION_PORTAL_URL;
}
