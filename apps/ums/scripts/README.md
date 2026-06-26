# BMI UMS — Scripts Directory

This directory contains operational, import, and maintenance scripts for the BMI University Management System.

## Directory Structure

```
scripts/
├── README.md          ← This file
├── dev/               ← Active development helpers (start/stop/check services)
├── infra/             ← Infrastructure provisioning (collections, admin setup)
├── legacy/            ← Historical one-off scripts kept for audit/reference
│                        Do NOT run these in production without validation.
├── utils/             ← Reusable utility scripts shared across operations
└── *.ts / *.sh        ← Supported active scripts (see list below)
```

## Supported Active Scripts

These are the scripts maintained and safe to use in standard workflows:

| Script | Purpose |
|--------|---------|
| `import-exams-from-template.ts` | Import exam schedules from Excel template |
| `import-accurate-data.ts` | Production data import (verified against schema) |
| `import-all-data.ts` | Full batch data import |
| `sync-to-sheets.ts` | Sync data to Google Sheets |
| `seed-courses.ts` | Seed course catalogue |
| `seed-v2-courses.ts` | Seed course catalogue (v2 format) |
| `migrate-db.ts` | Database migration runner |
| `export-student-data.ts` | Export student records |
| `gen-secrets.sh` | Generate cryptographically secure env secrets |
| `backup-restore.sh` | Backup and restore PocketBase data |

## Development Helper Scripts (`dev/`)

Active development helpers for local stack management:

| Script | Purpose |
|--------|---------|
| `dev/start-dev.sh` | Start local development stack |
| `dev/stop-dev.sh` | Stop local development stack |
| `dev/start-all.ps1` | Start all services (Windows PowerShell) |
| `dev/stop-all-windows.ps1` | Stop all services (Windows PowerShell) |
| `dev/check-services.sh` | Health check for all local services |
| `dev/check-all-services.sh` | Extended service diagnostics |
| `dev/quick-restart.sh` | Quick backend restart |
| `dev/restart-backend.sh` | Full backend restart with health check |
| `dev/start-backend.bat` | Start backend (Windows) |

## Preferred Entry Points

Use `make` targets before calling individual scripts:

```bash
make verify      # Lint + type-check + test (CI gate)
make start       # Start local development stack
make stop        # Stop local development stack
```

## Infrastructure Scripts (`infra/`)

Scripts in `infra/` handle one-time infrastructure setup:
collection creation, PocketBase configuration, and admin account provisioning.
Run only when setting up a new environment.

## Legacy Scripts (`legacy/`)

Scripts in `legacy/` are **historical one-off scripts** archived for audit purposes.

- Moved here from the repo root or `dev/` during the Phase 4 hygiene cleanup (2026-05-29).
- **Do NOT use in production** without validating against the current schema.
- Keep them for audit and historical reference only.
- If a legacy script is needed again, copy it to an appropriate directory,
  validate it, and document its purpose here before using it.

### Archived Root Debug Scripts

| Script | Original Purpose |
|--------|-----------------|
| `add-martin-missing-grades.ts` | One-off grade recovery for specific student |
| `check-duplicates.ts` | Debug: check for duplicate records |
| `check-martin-grades.ts` | Debug: check grade state for specific student |
| `debug-mukurweini-import.ts` | Debug: trace Mukurweini campus import |
| `test-api-duplicates.ts` | Ad-hoc API duplicate detection test |
| `test-api-response.ts` | Ad-hoc API response inspection |
| `test_fetch.mjs` | Minimal fetch smoke test |
| `verify-martin-complete.ts` | One-off completion verification |

### Archived dev/ Scripts

Superseded or merged into `start-dev.sh` / `stop-dev.sh`:
`cleanup-repo.sh`, `fix-and-restart.sh`, `fix-pocketbase-version.sh`,
`force-restart-backend.sh`, `install-certificate-packages.sh`,
`install-packages.sh`, `prepare-push.sh`, `restart-backend-fixed.sh`,
`run-add-mock-students.sh`, `setup-pocketbase-admin.sh`, `setup-scripts.sh`

## Utility Scripts (`utils/`)

Reserved for shared helper utilities that may be imported by other scripts.
Currently empty — add reusable helpers here as they are extracted.

## Policy

- **New one-off scripts** must go in `legacy/` from the start unless they are
  formally adopted as supported scripts (documented in this README).
- **Supported scripts** must have their purpose documented in the table above.
- **Legacy scripts** must not be referenced from `Makefile`, `README.md`,
  onboarding docs, or CI/CD pipelines.

## Windows Scripts (`windows/`)
Contains Windows batch (`.bat`) and PowerShell (`.ps1`) scripts for starting, stopping, and managing the stack.