# Guide: Add Missing Grades for Martin Njoroge Ndung'u

## Student Information
- **Name**: Martin Njoroge Ndung'u  
- **Admission No**: KEN-DP 225-538  
- **Student Code**: 2025-008  
- **Campus**: Mukurweini

## Analysis Summary

I've analyzed the CSV file `DIPLOMA MUKURWEINI Class Final GRADES - Sheet2 (6).csv` and compared it with the existing database records.

**Results:**
- ✓ Martin already has **18 grades** in the database
- ⚠ **4 grades are missing** from the database

## Missing Grades

| Course Name | Course Code | Score | Grade | Grade Point |
|-------------|-------------|-------|-------|-------------|
| HEBREW LANGUAGE | HEB 312 | 78 | B+ | 3.5 |
| GREEK LANGUAGE | GRK 311 | 87 | A | 4.0 |
| BASIC ENGLISH GRAMMAR | ENG 101 | 92 | A | 4.0 |
| ACADEMIC WRITING | AWR 102 | 90 | A | 4.0 |

## How to Add the Missing Grades

### Option 1: Using the Automated Script (Recommended)

1. **Start PocketBase** (if not already running):
   ```bash
   npm run dev:pocketbase
   ```

2. **Run the import script**:
   ```bash
   npx tsx backend/scripts/add-martin-ndungu-grades.ts
   ```

   The script will:
   - Connect to PocketBase
   - Read the CSV file
   - Extract Martin's grades
   - Add only the missing grades (skip existing ones)
   - Show a summary of what was added

### Option 2: Manual Import via PocketBase Admin UI

1. **Open PocketBase Admin**: http://127.0.0.1:8090/_/

2. **Navigate to**: Collections → `academic_records`

3. **Add each record manually**:

   **Record 1:**
   - student_code: `2025-008`
   - course_code: `HEB 312`
   - total_score: `78`
   - grade: `B+`
   - grade_point: `3.5`
   - remarks: `Pass`
   - academic_year: `2025`

   **Record 2:**
   - student_code: `2025-008`
   - course_code: `GRK 311`
   - total_score: `87`
   - grade: `A`
   - grade_point: `4`
   - remarks: `Pass`
   - academic_year: `2025`

   **Record 3:**
   - student_code: `2025-008`
   - course_code: `ENG 101`
   - total_score: `92`
   - grade: `A`
   - grade_point: `4`
   - remarks: `Pass`
   - academic_year: `2025`

   **Record 4:**
   - student_code: `2025-008`
   - course_code: `AWR 102`
   - total_score: `90`
   - grade: `A`
   - grade_point: `4`
   - remarks: `Pass`
   - academic_year: `2025`

### Option 3: Import from CSV File

I've created a CSV file with the missing grades at:
`DATABASE/martin-ndungu-missing-grades.csv`

You can import this file using PocketBase's import feature or any database import tool.

## Verification

After adding the grades, verify by checking:

1. **Total grade count** for Martin should be **22 courses**
2. **Query to verify**:
   ```sql
   SELECT COUNT(*) FROM academic_records WHERE student_code = '2025-008';
   ```
   Should return: **22**

3. **Check specific courses**:
   ```sql
   SELECT course_code, total_score, grade 
   FROM academic_records 
   WHERE student_code = '2025-008' 
   AND course_code IN ('HEB 312', 'GRK 311', 'ENG 101', 'AWR 102');
   ```

## Files Created

1. **Analysis Document**: `backend/scripts/martin-ndungu-grades-analysis.md`
   - Detailed breakdown of all grades
   - Comparison with existing database records
   
2. **Import CSV**: `DATABASE/martin-ndungu-missing-grades.csv`
   - Ready-to-import CSV file with missing grades
   
3. **Automated Script**: `backend/scripts/add-martin-ndungu-grades.ts`
   - TypeScript script to automatically add missing grades

## Notes

- All grades follow the BMI grading scale
- The script is safe to run multiple times (it skips existing records)
- Academic year is set to 2025 for all records
- CA and exam scores are left null (only total score is recorded)
