# Contract Changelog

This file tracks changes to the integration surface with `bmi-portal` (specifically the `/apply` page handoff).
Update this file in any PR that modifies `app/apply/page.jsx` or changes how the marketing site interacts with the portal.

## [Unreleased]
- Phase 1 implementation: Initial contract definition established in `@bmi/shared`.
- G-1 fix: `app/apply/page.jsx` no longer performs a silent fetch to `/api/auth/register`. It now redirects directly to the portal's `/register` page with pre-fill query parameters (`email`, `first_name`, `last_name`, `program`).
