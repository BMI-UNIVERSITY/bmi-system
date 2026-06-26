# BMI UMS - Grading System Setup Guide

This guide walks you through setting up the comprehensive university grading system.

## Overview

The grading system includes:
- **Multiple grading scales** (US 4.0, ECTS, Percentage, Custom)
- **Weighted assessment components** (Midterms, Finals, Assignments, etc.)
- **Multi-level GPA calculations** (Course, Semester, Cumulative)
- **Grade analytics and distributions**
- **Academic standing determination**
- **Grade appeal workflow**
- **Complete audit trail**

## Prerequisites

1. **PocketBase** must be running
2. **Node.js** and **npm** installed
3. **Backend dependencies** installed (`npm install`)

## Setup Steps

### Step 1: Start PocketBase

```bash
cd bin
./pocketbase serve
```

PocketBase will automatically apply all migrations on startup, creating the following collections:
- `grades` - Main grade records
- `grade_audit_log` - Audit trail for all grade changes
- `grading_scales` - Grading scale configurations
- `assessment_components` - Assessment component templates
- `grade_appeals` - Grade appeal workflow
- `grade_deadlines` - Grade submission deadlines
- `academic_standing` - Student academic standing records

### Step 2: Seed Default Grading Scales

```bash
cd backend
npx tsx scripts/seed-grading-scales.ts
```

This creates three default grading scales:

**US 4.0 Scale:**
- A+ (4.0), A (4.0), A- (3.7)
- B+ (3.3), B (3.0), B- (2.7)
- C+ (2.3), C (2.0), C- (1.7)
- D+ (1.3), D (1.0), F (0.0)

**ECTS Scale:**
- A (4.0), B (3.0), C (2.0), D (1.0), E (0.5), F (0.0)

**Percentage Scale:**
- Direct 0-100 percentage grading

### Step 3: Start Backend API

```bash
cd backend
npm run dev
```

The API will be available at `http://localhost:3000`

### Step 4: Verify Setup

Run the test script to verify all endpoints:

```bash
npx tsx scripts/test-grading-api.ts
```

Or use the automated setup script (Linux/Mac):

```bash
./scripts/setup-grading-system.sh
```

## API Endpoints

### Grades

- `POST /api/v1/grades` - Create a new grade
- `GET /api/v1/grades` - Get all grades (with filters)
- `GET /api/v1/grades/:id` - Get a specific grade
- `PUT /api/v1/grades/:id` - Update a grade
- `DELETE /api/v1/grades/:id` - Delete a grade

**Query Parameters for GET /api/v1/grades:**
- `studentId` - Filter by student
- `courseCode` - Filter by course
- `academicYear` - Filter by academic year
- `semester` - Filter by semester (Fall, Spring, Summer)
- `page` - Page number (default: 1)
- `perPage` - Items per page (default: 50, max: 500)

### Grading Scales

- `POST /api/v1/grading-scales` - Create a new grading scale
- `GET /api/v1/grading-scales` - Get all grading scales
- `GET /api/v1/grading-scales/:id` - Get a specific grading scale
- `PUT /api/v1/grading-scales/:id` - Update a grading scale
- `DELETE /api/v1/grading-scales/:id` - Delete a grading scale

### Grade Appeals

- `POST /api/v1/grade-appeals` - Submit a grade appeal
- `GET /api/v1/grade-appeals` - Get all appeals (with filters)
- `GET /api/v1/grade-appeals/:id` - Get a specific appeal
- `PUT /api/v1/grade-appeals/:id` - Update appeal status
- `DELETE /api/v1/grade-appeals/:id` - Withdraw an appeal

## Example: Creating a Grade

```bash
curl -X POST http://localhost:3000/api/v1/grades \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "studentId": "student-123",
    "studentName": "John Doe",
    "admissionNo": "BMI2024001",
    "courseId": "course-456",
    "courseCode": "CS101",
    "courseName": "Introduction to Computer Science",
    "credits": 3,
    "gradingScaleId": "scale-id",
    "gradingScaleType": "US_4_0",
    "components": [
      {
        "componentId": "midterm-1",
        "componentType": "Midterm",
        "score": 85,
        "maxScore": 100,
        "weight": 30
      },
      {
        "componentId": "final-1",
        "componentType": "Final_Exam",
        "score": 90,
        "maxScore": 100,
        "weight": 40
      },
      {
        "componentId": "assignments-1",
        "componentType": "Assignment",
        "score": 95,
        "maxScore": 100,
        "weight": 30
      }
    ],
    "numericGrade": 90,
    "letterGrade": "A-",
    "gradePoints": 3.7,
    "academicYear": "2024-2025",
    "semester": "Fall",
    "status": "Finalized",
    "createdBy": "admin"
  }'
```

## Database Schema

### Grades Collection

| Field | Type | Description |
|-------|------|-------------|
| studentId | text | Student identifier |
| studentName | text | Student full name |
| admissionNo | text | Student admission number |
| courseId | text | Course identifier |
| courseCode | text | Course code (e.g., CS101) |
| courseName | text | Course name |
| credits | number | Course credit hours |
| gradingScaleId | text | Grading scale used |
| gradingScaleType | select | US_4_0, ECTS, PERCENTAGE, CUSTOM |
| components | json | Assessment component scores |
| numericGrade | number | Numeric grade (0-100) |
| letterGrade | text | Letter grade (A+, A, A-, etc.) |
| gradePoints | number | Grade points for GPA (0-4.0) |
| isRetake | bool | Whether this is a retake |
| retakeAttemptNumber | number | Attempt number if retake |
| replacedGradeId | text | ID of grade this replaces |
| academicYear | text | Academic year (e.g., 2024-2025) |
| semester | select | Fall, Spring, Summer |
| status | select | Draft, Provisional, Pending Review, Verified, Flagged, Finalized, Incomplete |
| percentileRank | number | Student's percentile rank (0-100) |
| specialGrade | select | I (Incomplete), P (Pass), F (Fail), W (Withdrawn), AU (Audit) |
| incompleteDeadline | date | Deadline for incomplete grade |
| submittedAt | date | When grade was submitted |
| finalizedAt | date | When grade was finalized |
| createdBy | text | User who created the grade |
| lastModifiedBy | text | User who last modified |

### Grade Audit Log Collection

Tracks all changes to grades for academic integrity.

| Field | Type | Description |
|-------|------|-------------|
| gradeId | text | Grade being modified |
| studentId | text | Student identifier |
| courseId | text | Course identifier |
| action | select | CREATE, UPDATE, DELETE, FINALIZE, APPEAL_APPROVED |
| oldValue | json | Previous grade values |
| newValue | json | New grade values |
| changedBy | text | User who made the change |
| changedByRole | text | Role of user |
| reason | text | Reason for change |
| ipAddress | text | IP address of change |

## Troubleshooting

### Migrations Not Applied

If collections don't exist:
1. Stop PocketBase
2. Restart PocketBase: `cd bin && ./pocketbase serve`
3. Migrations are applied automatically on startup

### Authentication Errors

Ensure you have admin credentials set in `.env`:
```
ADMIN_EMAIL=admin@bmi.edu
ADMIN_PASSWORD=admin123456
```

### API Connection Errors

Check that:
1. PocketBase is running on port 8090
2. Backend API is running on port 3000
3. No firewall blocking the ports

## Next Steps

1. **Frontend Integration** - Connect UI components to the API
2. **Migration Script** - Run migration to convert old grades
3. **Testing** - Add comprehensive unit and integration tests
4. **Analytics Dashboard** - Implement grade analytics UI
5. **Transcript Generator** - Create PDF transcript generation

## Support

For issues or questions:
1. Check the logs: `backend/logs/combined.log`
2. Review PocketBase admin UI: `http://127.0.0.1:8090/_/`
3. Run the test script to diagnose issues

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│  - Grade Entry Modal                                        │
│  - Grade Management UI                                      │
│  - Analytics Dashboard                                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ HTTP/REST
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                Backend API (Hono)                           │
│  - /api/v1/grades                                           │
│  - /api/v1/grading-scales                                   │
│  - /api/v1/grade-appeals                                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ PocketBase SDK
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              PocketBase (Database)                          │
│  - grades collection                                        │
│  - grade_audit_log collection                               │
│  - grading_scales collection                                │
│  - assessment_components collection                         │
│  - grade_appeals collection                                 │
│  - grade_deadlines collection                               │
│  - academic_standing collection                             │
└─────────────────────────────────────────────────────────────┘
```

## Features Implemented

✅ Multiple grading scales (US 4.0, ECTS, Percentage)
✅ Weighted assessment components
✅ Grade CRUD operations
✅ Grade audit trail
✅ Grade appeal workflow
✅ Database migrations
✅ API endpoints
✅ Authentication and authorization

## Features Pending

⏳ Frontend UI components integration
⏳ GPA calculation automation
⏳ Academic standing determination
⏳ Grade analytics dashboard
⏳ Transcript generation
⏳ Bulk grade import/export
⏳ Migration from old system
⏳ Notification system
⏳ Comprehensive testing

---

**Version:** 1.0.0  
**Last Updated:** 2024
