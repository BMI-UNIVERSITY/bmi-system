/**
 * @bmi/shared — Public API
 *
 * Re-exports all shared constants, types, and utilities.
 * Import from '@bmi/shared' in all consuming repos.
 */

// Program catalog
export type { Program, ProgramLevel } from './programs.js';
export { PROGRAMS, VALID_PROGRAMS, VALID_LEVELS } from './programs.js';

// Domain constants
export {
  PORTAL_URL,
  UMS_URL,
  UMS_PAGES_URL,
  MARKETING_URL,
  MARKETING_URL_WWW,
  PORTAL_PAGES_URL,
  DEV_ORIGINS,
  ALLOWED_ORIGINS,
  API_WORKER_URL,
  ADMISSIONS_EMAIL,
  REGISTRAR_EMAIL,
  ADMIN_EMAIL,
} from './domains.js';

// Brand design tokens
export type { BrandColorKey } from './tokens.js';
export { BrandColors } from './tokens.js';

// API contract types
export type {
  ApiSuccess,
  ApiFailure,
  ApiResponse,
  // Standard pagination — use these everywhere, not inline definitions
  PaginatedData,
  PaginatedResponse,
  RegisterRequest,
  RegisterSuccessData,
  RegisterSuccessResponse,
  AccountAlreadyExistsError,
  RegisterResponse,
  LoginRequest,
  LoginSuccessData,
  LoginSuccessResponse,
  LoginResponse,
  RefreshSuccessData,
  RefreshSuccessResponse,
  RefreshResponse,
  // Public API types
  PublicProgramResponse,
  PublicStatsResponse,
  CmsPostSummary,
  CmsPostFull,
  CmsPageContent,
  WebhookEventType,
  WebhookEvent,
} from './api-types.js';
export { API_STATUS } from './api-types.js';
