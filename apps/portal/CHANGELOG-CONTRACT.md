# Contract Changelog

This file tracks changes to the API surface consumed by `bmi-university` (the `/apply` page).
Update this file in any PR that changes `/api/auth/register`, `/api/auth/login`, or the CORS allowlist.

## [Unreleased]
- Phase 1 implementation: Initial contract definition established in `@bmi/shared`.
- G-1 fix: `/api/auth/register` is no longer called with a throwaway random password from the university form. The university site now redirects directly to the portal's `/register` page with pre-fill query parameters.
