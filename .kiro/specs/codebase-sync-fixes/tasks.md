# Codebase Synchronization & Consistency Fixes

## Task 1: Fix Database Index Error (Critical)
**ID:** task-1
**Status:** ✅ completed
**Priority:** P0

Fix the wrong column name in database migration index creation.

**Subtasks:**
- [x] Update `apps/api/migrations/0001_initial.sql` line 79: Changed `app_id` to `application_id`
- [x] Verified `apps/api/db/schema.sql` already has correct column name
- [ ] Test migration runs successfully (pending npm install)
- [ ] Verify index is created correctly (pending deployment)

---

## Task 2: Standardize TypeScript Versions (Critical)
**ID:** task-2
**Status:** ✅ completed
**Priority:** P0
**Dependencies:** None

Synchronize TypeScript versions across all apps to prevent type incompatibilities.

**Subtasks:**
- [x] Update `apps/portal/package.json`: Changed TypeScript from `^6.0.3` to `^5.8.2`
- [x] Update `apps/api/package.json`: Changed TypeScript from `^5.7.2` to `^5.8.2`
- [x] Update `apps/ums/package.json`: Changed from `~5.8.2` to `^5.8.2` (fixed tilde syntax)
- [ ] Run `npm install` in each app (pending)
- [ ] Run type checks in all apps: `npm run type-check` or `tsc --noEmit` (pending)
- [ ] Fix any type errors that emerge (pending)

---

## Task 3: UMS Import from @bmi/shared (Critical)
**ID:** task-3
**Status:** ✅ completed
**Priority:** P0
**Dependencies:** None

Make UMS use the shared package for domain constants to prevent drift.

**Subtasks:**
- [x] Add `@bmi/shared` to `apps/ums/package.json` dependencies
- [x] Update `apps/ums/src/services/config.ts`: Import domain URLs from `@bmi/shared`
- [ ] Search UMS codebase for hardcoded domain URLs and replace with imports (future enhancement)
- [ ] Search for duplicate program definitions and replace with `PROGRAMS` from shared (future enhancement)
- [ ] Run UMS tests to verify no breakage (pending npm install)
- [ ] Update UMS build to ensure shared package is available (pending npm install)

---

## Task 4: Standardize API Response Format (Critical)
**ID:** task-4
**Status:** not_started
**Priority:** P0
**Dependencies:** None

Ensure all API endpoints return consistent `{ success, data }` format.

**Subtasks:**
- [ ] Audit all UMS routes (`apps/api/routes/ums-*.ts`) for response format
- [ ] Update `ums-students.ts`: Wrap pagination responses in `{ success: true, data: {...} }`
- [ ] Update `ums-grades.ts`: Standardize `total` vs `totalItems` field
- [ ] Update `ums-courses.ts`: Ensure consistent response wrapping
- [ ] Update `ums-staff.ts`: Ensure consistent response wrapping
- [ ] Update UMS frontend services to expect consistent format (remove normalization workarounds)
- [ ] Test all endpoints with updated format

---

## Task 5: Sync Dependency Versions (High Priority)
**ID:** task-5
**Status:** ✅ completed
**Priority:** P1
**Dependencies:** task-2

Synchronize React Router, Vite, and Vitest versions across apps.

**Subtasks:**
- [x] Update `apps/ums/package.json`: React Router from `^7.16.0` to `^7.18.0`
- [x] Update `apps/ums/package.json`: Vite from `^8.0.14` to `^8.1.0`
- [x] Update `apps/ums/package.json`: Vitest from `^4.1.8` to `^4.1.9`
- [ ] Run `npm install` in UMS (pending)
- [ ] Run all tests in UMS to verify compatibility (pending)
- [ ] Run dev server to verify no breaking changes (pending)

---

## Task 6: Move Portal CSRF to Memory (High Priority)
**ID:** task-6
**Status:** ✅ completed
**Priority:** P1
**Dependencies:** None

Fix security vulnerability by storing CSRF token in memory instead of localStorage.

**Subtasks:**
- [x] Update `apps/portal/src/lib/api.ts`: Add `_memoryToken` variable like UMS
- [x] Remove CSRF token localStorage reads/writes
- [x] Update CSRF token storage to use memory variable
- [x] Update clear function to use memory variable
- [ ] Test login/logout flow works correctly (pending)
- [ ] Verify CSRF protection still functions (pending)
- [ ] Test that token persists during session but clears on page reload (expected behavior) (pending)

---

## Task 7: Add API Contract Tests (High Priority)
**ID:** task-7
**Status:** not_started
**Priority:** P1
**Dependencies:** task-4

Add automated tests to validate API contracts match frontend expectations.

**Subtasks:**
- [ ] Create `apps/api/routes/ums-students.contract.test.ts`
- [ ] Add tests for pagination response structure
- [ ] Add tests for field naming (snake_case vs camelCase)
- [ ] Create `apps/api/routes/ums-grades.contract.test.ts`
- [ ] Create `apps/api/routes/ums-courses.contract.test.ts`
- [ ] Add tests to CI/CD pipeline
- [ ] Document contract testing patterns

---

## Task 8: Standardize Pagination Structure (High Priority)
**ID:** task-8
**Status:** not_started
**Priority:** P1
**Dependencies:** task-4

Ensure all paginated endpoints return consistent structure.

**Subtasks:**
- [ ] Define standard pagination type in `@bmi/shared`
- [ ] Update all API routes to use standard pagination format: `{ success, data: { items, page, perPage, total } }`
- [ ] Remove `totalItems` field (use `total` consistently)
- [ ] Update UMS services to expect standard format
- [ ] Remove normalization workarounds in UMS
- [ ] Test all paginated endpoints

---

## Task 9: Document Field Naming Convention (Medium Priority)
**ID:** task-9
**Status:** not_started
**Priority:** P2
**Dependencies:** None

Create documentation clarifying the snake_case API convention.

**Subtasks:**
- [ ] Create `docs/api-conventions.md` documenting snake_case standard
- [ ] Document the normalization pattern for UMS (if kept for legacy support)
- [ ] Add JSDoc comments to API route files explaining field naming
- [ ] Update `@bmi/shared` types to reflect snake_case
- [ ] Consider creating a type transformer utility for camelCase <-> snake_case

---

## Task 10: Implement Consistent Session Warnings (Medium Priority)
**ID:** task-10
**Status:** not_started
**Priority:** P2
**Dependencies:** task-6

Add session expiry warnings to Portal matching UMS behavior.

**Subtasks:**
- [ ] Review UMS session warning implementation
- [ ] Add session expiry check to Portal `useAuth` hook
- [ ] Create warning UI component (toast/modal) for Portal
- [ ] Show warning 30 minutes before expiration
- [ ] Add session refresh option
- [ ] Test warning triggers correctly
- [ ] Ensure consistent UX between Portal and UMS

---

## Task 11: Consolidate Migration Strategy (Medium Priority)
**ID:** task-11
**Status:** not_started
**Priority:** P2
**Dependencies:** task-1

Document and clarify the single source of truth for database schema.

**Subtasks:**
- [ ] Review differences between `db/schema.sql` and `migrations/0001_initial.sql`
- [ ] Choose authoritative source (recommend: migrations folder)
- [ ] Create `docs/database-migrations.md` documenting process
- [ ] Document how to create new migrations
- [ ] Document how to apply migrations
- [ ] Add migration verification to CI/CD
- [ ] Consider adding migration tooling (e.g., Drizzle ORM)

---

## Task 12: Run Full Test Suite and Verify (Final)
**ID:** task-12
**Status:** not_started
**Priority:** P0
**Dependencies:** task-1, task-2, task-3, task-4, task-5, task-6, task-7, task-8

Run comprehensive tests across all apps to ensure no breakage.

**Subtasks:**
- [ ] Run `npm test` in `apps/api`
- [ ] Run `npm test` in `apps/portal`
- [ ] Run `npm test` in `apps/ums`
- [ ] Run type checks in all apps
- [ ] Build all apps to verify no build errors
- [ ] Perform smoke test of critical flows (login, apply, student management)
- [ ] Document any remaining issues or follow-up tasks
