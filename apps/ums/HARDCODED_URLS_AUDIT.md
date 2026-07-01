# UMS Hardcoded Domain URLs Audit

**Date:** 2025-01-27  
**Spec:** codebase-sync-fixes  
**Task:** Search UMS codebase for hardcoded domain URLs

## Summary

Found **8 source files** containing hardcoded BMI domain URLs that should be replaced with imports from `@bmi/shared` to prevent configuration drift.

## Files with Hardcoded URLs

### 1. `apps/ums/src/components/AdmissionLetter.tsx`

**Line 74:**
```typescript
registrationUrl: 'https://bmi-portal.hkmministries.org/register',
```
- **Replacement:** Import `PORTAL_URL` from `@bmi/shared`, use `${PORTAL_URL}/register`

**Line 77:**
```typescript
email: 'admissions@hkmministries.org',
```
- **Replacement:** Import `ADMISSIONS_EMAIL` from `@bmi/shared`

**Line 401:**
```typescript
<span className="flex items-center gap-1"><Globe size={12} /> www.hkmministries.org</span>
```
- **Replacement:** Import `MARKETING_URL` from `@bmi/shared`, display without protocol: `MARKETING_URL.replace('https://', '')`

---

### 2. `apps/ums/src/services/aiService.ts`

**Lines 12-13 (Comment only):**
```typescript
// Single source of truth for the API base URL is `./config.ts`. In production
// builds `config.ts` falls back to https://bmi-api.bmiuniversity107.workers.dev
```
- **Action:** Comment reference is documentation only. No code change needed.

---

### 3. `apps/ums/src/services/authService.ts`

**Lines 15-16 (Comment only):**
```typescript
// Single source of truth for the API base URL is `./config.ts`. In production
// builds `config.ts` falls back to https://bmi-api.bmiuniversity107.workers.dev
```
- **Action:** Comment reference is documentation only. No code change needed.

---

### 4. `apps/ums/src/services/config.ts`

**Line 18:**
```typescript
const DEFAULT_API_URL =
  ((import.meta as any).env?.PROD ? 'https://bmi-api.bmiuniversity107.workers.dev' : '');
```
- **Action:** This is the API URL configuration. Should be added to `@bmi/shared` as `API_URL` constant.
- **Note:** Currently this is the single source of truth for API URL. Consider if this should be in shared package.

---

### 5. `apps/ums/src/components/Certificates.tsx`

**Line 122:**
```typescript
"BMI UNIVERSITY · NAIROBI KENYA · CHARTERED 2005 · CUE ACCREDITED · VERIFY AT WWW.HKMMINISTRIES.ORG/VERIFY · ",
```
- **Replacement:** Extract verification URL portion, use `MARKETING_URL` from `@bmi/shared`
- Template: `VERIFY AT ${MARKETING_URL.replace('https://', '').toUpperCase()}/VERIFY`

**Line 205:**
```typescript
qrData?.url || `https://hkmministries.org/verify?id=${cert.serial_number}`;
```
- **Replacement:** Import `MARKETING_URL` from `@bmi/shared`, use `${MARKETING_URL}/verify?id=${cert.serial_number}`

**Line 509:**
```typescript
<p className="text-[6px] text-white">www.hkmministries.org/verify</p>
```
- **Replacement:** Import `MARKETING_URL` from `@bmi/shared`, display `${MARKETING_URL.replace('https://', '')}/verify`

**Line 511:**
```typescript
registrar@bmiuniversity.org
```
- **Action:** Add `REGISTRAR_EMAIL` constant to `@bmi/shared`, currently not available.

---

### 6. `apps/ums/src/components/Finance.tsx`

**Line 846:**
```typescript
<p>980-259-3680 • bmiuniversity.org</p>
```
- **Action:** This appears to be a US phone number and simplified domain for invoices. Consider if this should be in `@bmi/shared` as contact constants.

---

### 7. `apps/ums/src/components/GoodStandingLetter.tsx`

**Line 365:**
```typescript
by scanning the QR code above or visiting www.hkmministries.org/verify and entering the reference number.
```
- **Replacement:** Import `MARKETING_URL` from `@bmi/shared`, use `${MARKETING_URL.replace('https://', '')}/verify`

---

### 8. `apps/ums/src/components/Students.tsx`

**Line 376:**
```typescript
title="Fetch from bmiuniversity.org/apply/"
```
- **Action:** This is a UI tooltip reference. Could be replaced but low priority since it's display-only text.

---

## Available Constants from @bmi/shared

Currently available in `packages/shared/src/domains.ts`:

```typescript
export const PORTAL_URL = 'https://bmi-portal.hkmministries.org';
export const UMS_URL = 'https://bmi-ums.hkmministries.org';
export const MARKETING_URL = 'https://hkmministries.org';
export const MARKETING_URL_WWW = 'https://www.hkmministries.org';
export const PORTAL_PAGES_URL = 'https://bmi-portal.pages.dev';
export const UMS_PAGES_URL = 'https://bmi-ums.pages.dev';
export const ADMISSIONS_EMAIL = 'admissions@bmiuniversity.org';
```

## Missing Constants (Recommendations)

These constants should be added to `@bmi/shared` for complete coverage:

1. **API_URL** (or API_BASE_URL)
   - `https://bmi-api.bmiuniversity107.workers.dev`
   - Used in: `config.ts`

2. **REGISTRAR_EMAIL**
   - `registrar@bmiuniversity.org`
   - Used in: Certificates

3. **SUPPORT_EMAIL** (if needed)
   - `admin@bmiuniversity.org`
   - Used in: VerificationPage

4. **Contact Phone Numbers** (if standardizing)
   - US: `704-607-5540` or `980-259-3680`
   - Kenya: `+254 726 912 577` or `+254 704 500 872`

## Implementation Priority

### High Priority (Prevent Configuration Drift)
1. ✅ `AdmissionLetter.tsx` - Registration URL, admissions email, marketing URL
2. ✅ `Certificates.tsx` - Verification URLs, registrar email
3. ✅ `GoodStandingLetter.tsx` - Verification URL

### Medium Priority (Contact Info Standardization)
4. `Finance.tsx` - Contact domain/phone
5. `VerificationPage.tsx` - Contact email/phones

### Low Priority (Display-Only Text)
6. `Students.tsx` - Tooltip reference
7. Comment references in service files (documentation only)

### Configuration Decision Needed
- `config.ts` - API URL (consider if this belongs in shared package or remains environment-specific)

## Recommended Actions

1. **Add missing constants to `@bmi/shared`:**
   - Add `REGISTRAR_EMAIL`
   - Consider adding `API_BASE_URL` (or keep environment-specific)
   - Consider adding standardized contact phone constants

2. **Update high-priority files:**
   - Import domain and email constants
   - Replace all hardcoded URLs with imports
   - Use string interpolation for paths: `${PORTAL_URL}/register`

3. **Testing:**
   - Verify all URLs resolve correctly after replacement
   - Test certificate generation with new URLs
   - Test admission letter generation

4. **Future Enhancement:**
   - Consider creating a central contacts configuration
   - Add TypeScript types for contact information
   - Create helper functions for common URL patterns (e.g., verification URLs)

## Notes

- The `config.ts` API URL is environment-specific and may intentionally remain hardcoded
- Some display text (tooltips, documentation) may not need replacement if purely informational
- Contact information (phones, addresses) could benefit from centralization but requires business decision
