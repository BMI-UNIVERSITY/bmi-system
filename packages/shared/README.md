# @bmi/shared

Shared constants, types, and data for the BMI University system.

## What's in here

| Module | Description |
|--------|-------------|
| `programs` | Canonical 17-program catalog — labels, levels, descriptions |
| `domains` | Portal/marketing URLs, CORS allowed origins, admissions email |
| `tokens` | Brand color constants (gold, navy, etc.) |
| `api-types` | TypeScript types for the portal's public API contract |

## Usage

**In bmi-portal (TypeScript):**
```ts
import { PROGRAMS, VALID_PROGRAMS, PORTAL_URL, ALLOWED_ORIGINS } from '@bmi/shared';
```

**In bmi-university (JavaScript/JSX):**
```js
import { PROGRAMS, PORTAL_URL } from '@bmi/shared';
```

## Adding / removing programs

1. Edit `src/programs.ts` — add, remove, or update the entry.
2. Bump the version in `package.json`.
3. Update both `bmi-portal/package.json` and `bmi-university/package.json` to reference the new version.
4. Update `CHANGELOG-CONTRACT.md` in **both** consuming repos.
5. Run `npm test` here to verify the snapshot passes (or update it deliberately with `npm test -- --update-snapshots`).

## Adding a new domain/URL

Edit `src/domains.ts`. Never hardcode `bmiuniversity.org` anywhere else — CI will catch it.

## Ownership

The portal backend team owns this package. Any PR touching it requires a reviewer from both the portal and the marketing site teams. See `CONTRIBUTING.md` in each consuming repo for details.

## Versioning

This package is `private: true` — it is not published to a registry. Both consuming repos reference it via a `file:` path:

```json
"@bmi/shared": "file:../packages/bmi-shared"
```
