# Schema contract audit (frontend ↔ PocketBase canonical)

**Canonical schema**: `backend/src/services/pocketbase.ts` (`setupCollections` / `createCollection`).  
**Legacy scripts**: deprecated — see `docs/SCHEMA_SETUP.md`.

This document tracks **intentional DTO shaping** at the API boundary vs **raw collection fields**.

---

## Students

| Area | PocketBase (`students`) | Frontend `src/types.ts` `Student` | Backend route | Action |
|------|-------------------------|-------------------------------------|-----------------|--------|
| Names | `first_name`, `last_name` | `first_name`, `last_name` | `mapStudentRecord` adds camelCase aliases | OK |
| Program | `program_code` relation | `program_code` (expand to code string in UI) | Accepts string id or code in POST | Prefer expand in list for display |
| Gender / photo | Not in minimal PB schema | `gender`, `avatar_color`, `photo_*` | Zod allows gender; PB may omit until fields added | **Gap**: add optional PB fields or trim UI |
| Faculty filter | No `faculty` on student | N/A | Removed invalid `faculty` filter from GET | Fixed in routes |

---

## Staff

| PocketBase (target) | UI `StaffMember` | Notes |
|---------------------|------------------|--------|
| `staff_number`, `first_name`, `last_name`, `email`, `phone`, `role`, `department`, `category`, `specialization`, `office`, `office_hours`, `status`, `join_date`, `avatar_color` | `name`, `department`, `joinDate`, `officeHours`, `avatarColor` | API maps snake_case ↔ camelCase in `staff` routes |

---

## Courses

| PocketBase | UI `Course` | Notes |
|--------------|-------------|--------|
| `course_code`, `title`, `credits`, `is_elective`, `faculty`, `department`, `level`, `status`, `description`, `syllabus` | `code`, `name`, … | API maps `title`→`name`, `course_code`→`code` |

---

## Enrollments + grades (source of truth)

| PocketBase | UI / grading types | Notes |
|------------|-------------------|--------|
| `enrollments`: student_number, course_code, academic_year, semester | Used implicitly | Created by `/grades` POST when missing |
| `grades`: enrollment_id, percentage, grade_letter, gpa | `src/grading/types` `Grade` is richer (components, status, …) | `grades.ts` maps expanded row → UI `Grade` shape; components not persisted in PB yet |

**Legacy**: `src/services/gradeService.ts` — thin client; prefer `src/grading/services/GradeAPIService.ts` for new code.

---

## Finance / transactions

| PocketBase | UI `Transaction` | Notes |
|------------|------------------|--------|
| `ref`, `name`, `desc`, `amt`, `status`, `date`, `student_id` | Same + optional `id` from PB | List returns PB records as `Transaction` |

---

## Library

| PocketBase `library_items` | UI `LibraryItem` | Notes |
|----------------------------|-------------------|--------|
| `downloadUrl` (camel in PB schema) | `downloadUrl` | Aligned |

---

## Programs / faculties / departments

| Collections | UI usage | Notes |
|-------------|----------|--------|
| `faculties`, `departments`, `programs`, `program_courses` | Transcripts filters, registration, selectors | **GET** `/api/v1/catalog/*` + `seedAcademicReferenceDataIfEmpty` for dev bootstrap |

---

## Certificates / audit / users

Mixed snake_case / camelCase in PB `users` (`studentId`, `isActive`) — matches PocketBase admin patterns; certificate fields largely snake_case per `pocketbase.ts`.

---

## Required follow-ups (post-audit)

1. **Optional student fields** in PB (`gender`, `avatar_color`, …) if UI must persist them.
2. **Persist grade components** — either JSON field on `grades` or separate collection.
3. **Production migration** — existing PB instances with old field sets need manual migration or fresh volume.

---

## Implemented APIs (this rollout)

| Area | Endpoint | Notes |
|------|-----------|--------|
| Catalog | `GET /api/v1/catalog/faculties`, `/departments`, `/programs`, `/program-courses?programId=` | Auth required; drives program selectors |
| Batch | `POST /api/v1/batch/students`, `/grades`, `/finance/transactions`, `/courses` | Partial failure arrays in response |
| Polling | Frontend `useCoreDataPolling` | Refetch staff/courses/library/transactions every 20s while logged in |
