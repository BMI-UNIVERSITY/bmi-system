# API Naming Conventions

This document outlines the standard field naming conventions for the BMI University monorepo, specifically at the boundary between the API (backend) and the UMS / Portal (frontends).

## 1. The Standard: `snake_case` over the Wire

All JSON payloads sent to or received from the BMI Unified API **MUST** use `snake_case` for field names.

**Why?**
- The database (Cloudflare D1 / SQLite) uses `snake_case` for all column names (`first_name`, `created_at`, `student_id`).
- By keeping the wire format as `snake_case`, we avoid expensive deep-key conversions at the edge worker level.
- This aligns with standard RESTful conventions and our webhook payload structures.

**Examples:**
✅ **Correct (API Response)**
```json
{
  "success": true,
  "data": {
    "first_name": "John",
    "reg_no": "BMI/2026/001",
    "created_at": "2026-07-01T00:00:00Z"
  }
}
```

❌ **Incorrect (API Response)**
```json
{
  "success": true,
  "data": {
    "firstName": "John",
    "regNo": "BMI/2026/001",
    "createdAt": "2026-07-01T00:00:00Z"
  }
}
```

## 2. Enforcement via Contract Tests

This convention is strictly enforced via API Contract Tests in the `apps/api/routes/*.contract.test.ts` files. 

If an endpoint accidentally returns a camelCase variant (like `regNo` instead of `reg_no`), the CI/CD pipeline will fail in the `contract-tests` job, blocking deployment.

## 3. Frontend Handling (`camelCase` Internal State)

While the API uses `snake_case`, the UMS Frontend typically uses `camelCase` for its internal React state and TypeScript interfaces (e.g., `studentId`, `numericGrade`).

### The Mapping Pattern

Frontend services (in `apps/ums/src/services/`) are responsible for mapping the `snake_case` API responses to their internal `camelCase` representations. 

This mapping typically happens in the service layer using simple transformers or by aliasing fields during destructuring.

**Example (UMS Service Mapping):**
```typescript
// The API returns snake_case
const data = await response.json(); 

// The service maps it to camelCase for the components
const mappedStudent: Student = {
  id: data.id,
  firstName: data.first_name,
  lastName: data.last_name,
  regNo: data.reg_no,
  // ...
};
```

*Note: Some legacy UMS components still directly consume `snake_case` if the interface hasn't been fully modernized yet. Future refactors should standardize the frontend completely on `camelCase` with explicit mapping at the service boundary.*

## 4. Shared Types (`@bmi/shared`)

Types published in `@bmi/shared` that represent direct API request/response bodies (like `RegisterRequest`, `PublicProgramResponse`) **MUST** use `snake_case` to accurately reflect the wire format.
