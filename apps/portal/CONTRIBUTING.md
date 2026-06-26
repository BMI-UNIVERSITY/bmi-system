# Contributing to BMI Portal

Thank you for your interest in contributing to the BMI University Applicant & Student Portal!

## 🤝 Contract Ownership

This repository owns the shared contract between the portal and the `bmi-university` marketing site. The contract definitions are located in the `@bmi/shared` package.

Any PR touching:
- `worker/routes/auth.ts` (especially the `/api/auth/register` and `/api/auth/login` endpoints)
- `worker/lib/types.ts` (specifically the CORS configuration)
- `packages/bmi-shared/`

**Must**:
1. Update `CHANGELOG-CONTRACT.md`.
2. Ensure the `jwt.contract.test.ts` and `openapi.snapshot.test.ts` pass or are updated intentionally.
3. Notify the `bmi-university` team of the change, as it may break the marketing site's apply form.

## 🛠️ Development Workflow

1. **Clone**: Ensure you have access to the repository.
2. **Branch**: Create a new branch for your feature (`git checkout -b feature/your-feature`).
3. **Test**: Run `npm test` to ensure your changes pass all unit tests and contract tests.
4. **Pull Request**: Open a PR against the `main` branch.
