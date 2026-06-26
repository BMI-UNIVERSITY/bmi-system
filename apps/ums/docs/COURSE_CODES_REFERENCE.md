# BMI UMS - Course Codes Reference

## Overview

This document provides a complete reference of all course codes used in the BMI University Management System. Course codes follow a standardized format: **PREFIX + LEVEL + NUMBER**

## Course Code Format

- **Prefix**: 4-letter category identifier (e.g., THEO, BIBL, MINS)
- **Level**: 3-digit number indicating course level
  - **100-level**: Foundational/Introductory courses
  - **200-level**: Intermediate courses
  - **300-level**: Advanced courses
- **Example**: `THEO101` = Theology, 100-level, Course #1

## Complete Course Catalog

### Systematic Theology (THEO)

| Code | Course Name | Full Name | Level | Credits |
|------|-------------|-----------|-------|---------|
| THEO101 | PNEUMATOLOGY | Pneumatology | 200 | 3 |
| THEO102 | ESCHATOLOGY | Eschatology | 300 | 3 |
| THEO103 | ANGELOLOGY | Angelology | 200 | 3 |
| THEO104 | HAMARTIOLOGY | Hamartiology | 200 | 3 |
| THEO105 | CHRISTOLOGY | Christology | 200 | 3 |
| THEO106 | BIBLIOLOGY | Bibliology | 100 | 3 |
| THEO107 | THEOLOGY_PROPER | Theology Proper | 300 | 3 |
| THEO108 | SOTERIOLOGY | Soteriology | 200 | 3 |
| THEO109 | ECCLESIOLOGY | Ecclesiology | 200 | 3 |

### Biblical Studies (BIBL)

| Code | Course Name | Full Name | Level | Credits |
|------|-------------|-----------|-------|---------|
| BIBL101 | HERMENEUTICS | Hermeneutics | 100 | 3 |
| BIBL102 | NEW_SURVEY | New Testament Survey | 100 | 3 |
| BIBL103 | OLD_SURVEY | Old Testament Survey | 100 | 3 |

### Church Leadership (CHUR)

| Code | Course Name | Full Name | Level | Credits |
|------|-------------|-----------|-------|---------|
| CHUR201 | CHURCH_ADMIN | Church Administration | 200 | 3 |
| CHUR202 | CHURCH_GROWTH | Church Growth | 200 | 3 |
| CHUR203 | CHURCH_PLANTING | Church Planting | 300 | 3 |

### Ministry (MINS)

| Code | Course Name | Full Name | Level | Credits |
|------|-------------|-----------|-------|---------|
| MINS101 | HOMILETICS | Homiletics | 100 | 3 |
| MINS102 | EVANGELISM | Evangelism | 100 | 3 |
| MINS103 | PRAISE_AND_WORSHIP | Praise and Worship | 100 | 2 |
| MINS104 | FOUNDATION_SUCCESSFUL_MINISTRY | Foundation of Successful Ministry | 100 | 3 |

### Spiritual Formation (SPIR)

| Code | Course Name | Full Name | Level | Credits |
|------|-------------|-----------|-------|---------|
| SPIR201 | SPIRITUAL_WARFARE | Spiritual Warfare | 200 | 3 |
| SPIR202 | SPIRITUAL_FORMATION | Spiritual Formation | 200 | 3 |
| SPIR203 | SPIRITUAL_REALM | The Spiritual Realm | 200 | 3 |

### Pastoral Ministry (PAST)

| Code | Course Name | Full Name | Level | Credits |
|------|-------------|-----------|-------|---------|
| PAST301 | PASTORAL_COUNSELLING_ETHICS | Pastoral Counselling & Ethics | 300 | 3 |

### Biblical Languages (LANG)

| Code | Course Name | Full Name | Level | Credits |
|------|-------------|-----------|-------|---------|
| LANG201 | GREEK | Biblical Greek | 200 | 4 |
| LANG202 | HEBREW | Biblical Hebrew | 200 | 4 |

### Personal Development (DEVL)

| Code | Course Name | Full Name | Level | Credits |
|------|-------------|-----------|-------|---------|
| DEVL101 | PRINCIPLE_OF_SUCCESS | Principle of Success | 100 | 2 |
| DEVL102 | PRINCIPLES_OF_SUCCESS | Principles of Success | 100 | 2 |

### Practical Theology (PRAC)

| Code | Course Name | Full Name | Level | Credits |
|------|-------------|-----------|-------|---------|
| PRAC201 | CHRISTIAN_FAMILY | Christian Family | 200 | 3 |

### Historical Theology (HIST)

| Code | Course Name | Full Name | Level | Credits |
|------|-------------|-----------|-------|---------|
| HIST201 | CHURCH_HISTORY | Church History | 200 | 3 |

### Theology - General (THLG)

| Code | Course Name | Full Name | Level | Credits |
|------|-------------|-----------|-------|---------|
| THLG101 | KINGDOM_PRINCIPLES | Kingdom Principles | 200 | 3 |
| THLG102 | UNDERSTANDING_GODS | Understanding God's Word | 100 | 3 |

### Comparative Religion (COMP)

| Code | Course Name | Full Name | Level | Credits |
|------|-------------|-----------|-------|---------|
| COMP201 | WORLD_RELIGION | World Religions | 200 | 3 |

### Apologetics (APOL)

| Code | Course Name | Full Name | Level | Credits |
|------|-------------|-----------|-------|---------|
| APOL301 | CHRISTIAN_APOLOGETICS | Christian Apologetics | 300 | 3 |

## Course Categories Summary

| Category | Prefix | Number of Courses | Description |
|----------|--------|-------------------|-------------|
| Systematic Theology | THEO | 9 | Core theological doctrines |
| Biblical Studies | BIBL | 3 | Bible interpretation and survey |
| Church Leadership | CHUR | 3 | Church administration and growth |
| Ministry | MINS | 4 | Practical ministry skills |
| Spiritual Formation | SPIR | 3 | Spiritual growth and warfare |
| Pastoral Ministry | PAST | 1 | Pastoral care and counseling |
| Biblical Languages | LANG | 2 | Greek and Hebrew |
| Personal Development | DEVL | 2 | Success principles |
| Practical Theology | PRAC | 1 | Applied theology |
| Historical Theology | HIST | 1 | Church history |
| Theology - General | THLG | 2 | General theological studies |
| Comparative Religion | COMP | 1 | World religions |
| Apologetics | APOL | 1 | Christian defense |

**Total Courses**: 33

## Course Levels Distribution

- **100-level (Foundational)**: 12 courses
- **200-level (Intermediate)**: 17 courses
- **300-level (Advanced)**: 4 courses

## Credit Hours Distribution

- **2 Credits**: 3 courses (Personal Development, Worship)
- **3 Credits**: 28 courses (Most courses)
- **4 Credits**: 2 courses (Biblical Languages)

**Total Credit Hours**: 99 credits

## Usage in Database

### Exams Collection

The `exams_grades` collection uses these course names as field names:

```typescript
{
  admissionNo: "BMI-2024-1001",
  studentName: "John Doe",
  HOMILETICS: 85,        // MINS101
  HERMENEUTICS: 90,      // BIBL101
  CHURCH_ADMIN: 78,      // CHUR201
  // ... other courses
}
```

### Courses Collection

The `courses` collection stores course metadata:

```typescript
{
  courseCode: "THEO101",
  courseName: "PNEUMATOLOGY",
  fullName: "Pneumatology",
  category: "Systematic Theology",
  level: 200,
  credits: 3,
  active: true
}
```

## Seeding the Database

To populate the courses collection with all course codes:

```bash
npx tsx scripts/seed-courses.ts
```

This will:
1. Read course definitions from `scripts/course-codes-mapping.json`
2. Create or update all courses in the `courses` collection
3. Display a summary of the course catalog

## API Usage Examples

### Get Course by Code

```typescript
const course = await pb.collection('courses').getFirstListItem(
  `courseCode = "THEO101"`
);
```

### Get All Courses in a Category

```typescript
const courses = await pb.collection('courses').getFullList({
  filter: `category = "Systematic Theology"`,
  sort: 'courseCode'
});
```

### Get All 100-level Courses

```typescript
const courses = await pb.collection('courses').getFullList({
  filter: `level >= 100 && level < 200`,
  sort: 'courseCode'
});
```

### Get Student's Grades with Course Info

```typescript
// Get exam record
const exam = await pb.collection('exams_grades').getFirstListItem(
  `admissionNo = "BMI-2024-1001"`
);

// Get course info for each grade
const courseCode = await pb.collection('courses').getFirstListItem(
  `courseName = "HOMILETICS"`
);

console.log(`${courseCode.courseCode}: ${exam.HOMILETICS}`);
// Output: MINS101: 85
```

## Course Prerequisites

While not currently enforced in the database, recommended prerequisites include:

- **200-level courses**: Completion of related 100-level courses
- **300-level courses**: Completion of related 200-level courses
- **Biblical Languages**: No prerequisites, but recommended early in program
- **Advanced Theology**: Completion of foundational theology courses

## Adding New Courses

To add a new course:

1. Update `scripts/course-codes-mapping.json` with the new course
2. Run `npx tsx scripts/seed-courses.ts` to update the database
3. If the course should appear in exam records, update the migration file
4. Update this documentation

## Notes

1. **Course Name Consistency**: Database field names use underscores (e.g., `CHURCH_ADMIN`)
2. **Course Code Uniqueness**: Each course code is unique across the system
3. **Active Status**: Courses can be marked inactive without deleting historical data
4. **Credit Hours**: Standard courses are 3 credits; languages are 4 credits
5. **Level Progression**: Students should generally progress from 100 → 200 → 300 level

## Future Enhancements

Potential improvements:

1. Add prerequisite tracking in the database
2. Add course descriptions and learning outcomes
3. Add instructor assignments
4. Add semester/term scheduling
5. Add course capacity limits
6. Add co-requisite support
7. Add elective vs. required designation
