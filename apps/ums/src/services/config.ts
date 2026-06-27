/* eslint-disable */
/* eslint-disable */

// IMPORTANT: In production builds, VITE_API_URL MUST be injected at build
// time via Cloudflare Pages env vars (see apps/ums/DEPLOY.md). Falling back
// to a relative path works in `vite dev` (the proxy forwards /api -> :3001)
// but breaks in production for two reasons:
//   1. Cloudflare Pages' static `_redirects` proxy is unreliable for CORS
//      preflights, so cross-origin POSTs are blocked.
//   2. The "/api/*" rule does not reliably forward all headers needed by
//      the API (e.g. cookies, custom auth headers).
//
// We expose a sane build-time default (production API) so the bundle cannot
// silently ship with an empty URL. Override locally via apps/ums/.env.
const DEFAULT_API_URL =
  ((import.meta as any).env?.PROD ? 'https://bmi-api.bmiuniversity107.workers.dev' : '');

export const API_URL =
  ((import.meta as any).env.VITE_API_URL || DEFAULT_API_URL) + '/api/v1';

export const API_TIMEOUT = 30000; // 30 seconds
export const MAX_RETRIES = 2;









