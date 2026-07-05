/**
 * Re-exports the canonical program catalog from @bmi/shared.
 *
 * Previously this file contained a manually-maintained copy of the program list.
 * That copy has been replaced by the single source of truth in @bmi/shared.
 *
 * G-2 fix: duplicated program catalog removed.
 * G-3 fix: VALID_PROGRAMS now sourced from the canonical package.
 */
export type { Program, ProgramLevel } from '@bmi/shared';
export { PROGRAMS, VALID_PROGRAMS, VALID_LEVELS } from '@bmi/shared';
