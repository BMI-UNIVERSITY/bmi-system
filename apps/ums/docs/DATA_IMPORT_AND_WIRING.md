# BMI Portal — Data Import & Database Wiring Guide

## What This PR Does

All academic data (62 students, 530 grade records, 35 courses, 6 campuses, 5 modules)
is now imported into PocketBase and every frontend module reads **exclusively from the
database** as the single source of truth.

---

## Files Changed / Added

| File | Change |
|---|---|
| `backend/scripts/seed-real-data.ts` | **NEW** — seeds all real student + grade data |
| `backend/src/routes/grades.ts` | Fixed `mapExpandedGradeToFrontendShape` (campus, creditHours, module); added `/gpa/summary` and `/student/:id/transcript` endpoints; fixed GET filter to support `campus_id`, `academicYear`, `semester`, `grade` |
| `backend/src/routes/dashboard.ts` | Added `/academic-stats` endpoint (grade distribution, pass rate, campus breakdown) |
| `src/services/academicRecordsService.ts` | **NEW** — typed frontend service; single fetch point for all grade/transcript/GPA queries |
| `src/components/Transcripts.tsx` | Swapped `getStudentGrades` → `getStudentAcademicRecords`; fixed field mapping (`courseTitle`, `totalScore`, `gradePoint`, `creditHours`) |
| `src/components/Grades.tsx` | Swapped `getGrades` → `getAcademicRecords`; maps flat records to Grade shape |

---

## One-Time Setup (Run Once)

### 1. Start services

```bash
# Terminal 1 — PocketBase
cd ~/bmi-ums/backend
./pocketbase serve --http="127.0.0.1:8090"

# Terminal 2 — Backend API
cd ~/bmi-ums/backend
npm run dev

# Terminal 3 — Frontend
cd ~/bmi-ums
npm run dev
```

### 2. Seed all real data

```bash
cd ~/bmi-ums/backend
npx tsx scripts/seed-real-data.ts
```

Expected output:
```
✅  Authenticated
✅  6 campuses ready
✅  5 modules ready
✅  35 courses ready
✅  62 students ready
✅  530 records created, 0 already existed
```

The script is **idempotent** — running it again skips existing records safely.

---

## API Endpoints (all require auth token)

### Grades / Academic Records

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/grades` | All records. Filters: `studentId`, `campus_id`, `academicYear`, `semester`, `grade`, `page`, `perPage` |
| `GET` | `/api/v1/grades/:id` | Single record fully expanded |
| `GET` | `/api/v1/grades/gpa/summary` | Per-student per-module GPA. Filters: `campusId`, `academicYear` |
| `GET` | `/api/v1/grades/student/:id/transcript` | Full transcript + overall GPA for one student |
| `POST` | `/api/v1/grades` | Create new grade record |
| `PATCH` | `/api/v1/grades/:id` | Update score/grade |
| `DELETE` | `/api/v1/grades/:id` | Delete record |

### Dashboard

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/dashboard/stats` | Students, staff, courses, finance counts |
| `GET` | `/api/v1/dashboard/academic-stats` | Grade distribution, pass rate, campus breakdown |

### Campuses

```
GET /api/v1/campuses          — list all 6 campuses
POST /api/v1/campuses         — create campus
PATCH /api/v1/campuses/:id    — update campus
```

---

## Frontend Service Usage

```typescript
import {
  getAcademicRecords,
  getStudentAcademicRecords,
  computeGpa,
  computeOverallGpa,
} from '../services/academicRecordsService';

// All grades (with filters)
const { items, total } = await getAcademicRecords({
  campusId:    'pb-id-of-campus',
  academicYear:'2025',
  perPage:     500,
});

// One student's grades
const records = await getStudentAcademicRecords(studentId);

// Compute GPA
const overallGpa = computeOverallGpa(records);
const byModule   = computeGpa(records);
```

---

## Data Schema (PocketBase collections)

```
campuses          (6 rows)
  └── students    (62 rows)  campus_id → campuses
        └── academic_records (530 rows)  student_id → students

modules           (5 rows)
  └── courses     (35 rows)  module_id → modules
        └── academic_records           course_id → courses
```

### Grade scale used

| Score | Grade | GPA |
|---|---|---|
| 80–100 | A | 4.0 |
| 75–79 | B+ | 3.5 |
| 70–74 | B | 3.0 |
| 65–69 | C+ | 2.5 |
| 60–64 | C | 2.0 |
| 50–59 | D | 1.0 |
| <50 | F | 0.0 |

---

## Troubleshooting

**Grades page shows empty**
→ Check PocketBase is running at `http://127.0.0.1:8090`
→ Run `npx tsx backend/scripts/seed-real-data.ts`

**Transcripts show "No grades available"**
→ Confirm student ID matches a PocketBase `students` record
→ Hit `GET /api/v1/grades/student/<id>/transcript` directly to verify

**Campus filter not working**
→ The grades route now supports `?campus_id=<pb-id>` — use the PocketBase ID, not the name

**Re-seeding after data wipe**
→ Run seed-real-data.ts again — it uses `findOrCreate` so no duplicates

---

## Campuses Reference

| Slug | Name | Location |
|---|---|---|
| mukurweini | Mukurweini | Mukurweini, Nyeri County |
| karatina1 | Karatina A | Karatina, Nyeri County |
| karatina2 | Karatina B | Karatina, Nyeri County |
| othaya | Othaya | Othaya, Nyeri County |
| nyeri | Nyeri | Nyeri Town, Nyeri County |
| kiambu | Kiambu | Kiambu Town, Kiambu County |
