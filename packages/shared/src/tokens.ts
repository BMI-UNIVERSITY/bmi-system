/**
 * @bmi/shared — Brand Design Tokens
 *
 * Canonical color values for BMI University branding.
 * Both repos define these independently today — this is the single source of truth.
 *
 * Consuming repos:
 *   - bmi-portal/src/index.css           uses --gold / --navy (same hex values)
 *   - bmi-university/app/globals.css     uses --color-gold / --color-navy (same hex values)
 *
 * Neither CSS file uses this TypeScript module directly, but both should reference
 * this file in comments so any rebrand starts here. A build-step token generator
 * can be added in the future if needed.
 */

export const BrandColors = {
  /** Primary gold accent — #d4af37 */
  gold: '#d4af37',
  /** Lighter gold for hover states — #e8c84a (portal) / gradient end */
  goldLight: '#e8c84a',
  /** Darker gold for hover states — #b8952e (portal) / #b5952f (university) */
  goldDark: '#b8952e',

  /** Primary navy background — #0f172a */
  navy: '#0f172a',
  /** Mid-tone navy for cards / gradients — #1e293b */
  navyMid: '#1e293b',
  /** Light navy for labels — #334155 */
  navyLight: '#334155',

  /** Muted slate text — #64748b */
  slate: '#64748b',
  /** Light slate for placeholders — #94a3b8 */
  slateLight: '#94a3b8',

  /** Page background — #f8fafc */
  bg: '#f8fafc',
} as const;

export type BrandColorKey = keyof typeof BrandColors;
