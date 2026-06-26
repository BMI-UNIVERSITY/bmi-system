# BMI UMS - Exam Schema Guide

## Overview

The exam schema has been updated to match the `bmi-exams-template.xlsx` format exactly. This ensures consistency between the Excel templates used by staff and the database structure.

## Database Collection: `exams_grades`

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | text | Auto-generated unique identifier (15 characters) |
| `admissionNo` | text | Student admission number (e.g., BMI-2024-1001) |
| `studentName` | text | Full name of the student |

### Course Grade Fields (All Optional)

All course fields are optional number fields that can store grades (0-100). If a student hasn't taken a course, the field will be `null`.

| Database Field Name | Excel Column Header |
|---------------------|---------------------|
| `HOMILETICS` | HOMILETICS |
| `HERMENEUTICS` | HERMENEUTICS |
| `CHURCH_ADMIN` | CHURCH ADMIN |
| `PNEUMATOLOGY` | PNEUMATOLOGY |
| `EVANGELISM` | EVANGELISM |
| `ESCHATOLOGY` | ESCHATOLOGY |
| `PRINCIPLE_OF_SUCCESS` | PRINCIPLE OF SUCCESS |
| `ANGELOLOGY` | ANGELOLOGY |
| `HAMARTIOLOGY` | HAMARTIOLOGY |
| `NEW_SURVEY` | NEW SURVEY |
| `OLD_SURVEY` | OLD SURVEY |
| `CHRISTOLOGY` | CHRISTOLOGY |
| `CHURCH_GROWTH` | CHURCH GROWTH |
| `BIBLIOLOGY` | BIBLIOLOGY |
| `THEOLOGY_PROPER` | THEOLOGY PROPER |
| `SOTERIOLOGY` | SOTERIOLOGY |
| `CHRISTIAN_FAMILY` | CHRISTIAN FAMILY |
| `CHURCH_PLANTING` | CHURCH PLANTING |
| `CHURCH_HISTORY` | CHURCH HISTORY |
| `PRAISE_AND_WORSHIP` | PRAISE AND WORSHIP |
| `SPIRITUAL_WARFARE` | SPIRITUAL WARFARE |
| `FOUNDATION_SUCCESSFUL_MINISTRY` | FOUNDATIONSUCCESSFUL MINISTRY |
| `SPIRITUAL_FORMATION` | SPIRITUAL FORMATION |
| `KINGDOM_PRINCIPLES` | KINGDOM PRINCIPLES |
| `PRINCIPLES_OF_SUCCESS` | PRINCIPLES OF SUCCESS |
| `UNDERSTANDING_GODS` | UNDERSTANDING GODS |
| `ECCLESIOLOGY` | ECCLESIOLOGY |
| `PASTORAL_COUNSELLING_ETHICS` | PASTORAL COUNSELLING&ETHICS |
| `GREEK` | GREEK |
| `CHRISTIAN_APOLOGETICS` | CHRISTIAN APOLOGETICS |
| `HEBREW` | HEBREW |
| `WORLD_RELIGION` | WORLD RELIGION |
| `SPIRITUAL_REALM` | SPIRITUAL REALM |

## Excel Template Format

The `bmi-exams-template.xlsx` file should have the following structure:

```
Row 1: [Optional] "Exams & Grades" title
Row 2: [Optional] "Courses" label in column C
Row 3: Headers - ADMISSION. NO | Student Name | HOMILETICS | HERMENEUTICS | ...
Row 4+: Data rows with admission numbers, names, and grades
```

### Example:

| ADMISSION. NO | Student Name | HOMILETICS | HERMENEUTICS | CHURCH ADMIN | ... |
|---------------|--------------|------------|--------------|--------------|-----|
| BMI-2024-1001 | John Doe     | 85         | 90           | 78           | ... |
| BMI-2024-1002 | Jane Smith   | 92         | 88           | 95           | ... |

## Importing Exam Data

### Method 1: Using the Import Script

```bash
npx tsx scripts/import-exams-from-template.ts <path-to-excel-file>
```

Example:
```bash
npx tsx scripts/import-exams-from-template.ts ./bmi-exams-template.xlsx
```

### Method 2: Using the Frontend Import Feature

1. Navigate to the Exams module in the BMI UMS interface
2. Click "Import Excel" button
3. Select your Excel file matching the template format
4. Review and confirm the import

## Migration

To apply the new schema to your database:

1. Ensure PocketBase is running
2. The migration file `1777600000_create_exams_collection.js` will be automatically applied on next PocketBase startup
3. Or manually run migrations using PocketBase CLI

## API Usage

### Create Exam Record

```typescript
const record = await pb.collection('exams_grades').create({
  admissionNo: 'BMI-2024-1001',
  studentName: 'John Doe',
  HOMILETICS: 85,
  HERMENEUTICS: 90,
  CHURCH_ADMIN: 78
  // Other courses are optional
});
```

### Query Exam Records

```typescript
// Get all exams for a student
const records = await pb.collection('exams_grades').getFullList({
  filter: `admissionNo = "BMI-2024-1001"`
});

// Get all students who took a specific course
const records = await pb.collection('exams_grades').getFullList({
  filter: `HOMILETICS != null`
});

// Get students with high grades in a course
const records = await pb.collection('exams_grades').getFullList({
  filter: `HERMENEUTICS >= 90`
});
```

### Update Exam Record

```typescript
const record = await pb.collection('exams_grades').update(recordId, {
  HOMILETICS: 95,
  HERMENEUTICS: 92
});
```

## Notes

1. **Field Naming**: Database field names use underscores (`_`) instead of spaces for consistency
2. **Null Values**: Courses not taken by a student will have `null` values, not 0
3. **Grade Range**: While not enforced at the database level, grades should typically be 0-100
4. **Indexes**: The collection has indexes on `admissionNo` and `studentName` for faster queries
5. **Permissions**: Configure collection rules in PocketBase admin panel as needed

## Troubleshooting

### Import Fails

- Verify Excel file format matches the template
- Check that admission numbers are unique
- Ensure PocketBase is running and accessible
- Verify admin credentials in environment variables

### Missing Courses

- Check that Excel column headers exactly match the expected format
- Spaces and special characters matter (e.g., "CHURCH ADMIN" not "CHURCHADMIN")
- Refer to the field mapping table above

### Performance Issues

- Use filters to limit query results
- Consider pagination for large datasets
- Indexes on `admissionNo` and `studentName` should help with common queries

## Future Enhancements

Potential improvements to consider:

1. Add validation rules for grade ranges (0-100)
2. Add computed fields for GPA calculation
3. Add semester/year fields for historical tracking
4. Add course metadata (credits, instructor, etc.)
5. Add grade letter conversion (A, B, C, etc.)
