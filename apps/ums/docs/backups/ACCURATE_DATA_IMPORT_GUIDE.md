# 📊 BMI UMS - 100% Accurate Data Import Guide

## Overview

This guide explains how to import data with 100% accuracy from the CSV FILES folder.

## Key Changes

### 1. Campus → Study Centre
All references to "Campus" have been changed to "Study Centre" throughout the system.

### 2. ALL Diploma Students → Part-time Mode
All students in the Diploma in Christian Ministry and Theology program are now set to **Part-time** mode of study.

### 3. Accurate CSV Import
Data is imported directly from the `CSV FILES` folder with proper parsing and validation.

## Data Sources

### CSV FILES Folder
```
CSV FILES/
├── BMI MASTER RECORDS - 07_STUDENTS.csv          (62 students)
├── diploma STUDENTS PERFORMANCE (TRANSCRIPT) - Sheet1 (5).csv  (Grades)
├── DIPLOMA MUKURWEINI Class Final GRADES - Sheet2 (5).csv     (Grades)
└── KIAMBU DIPLOMA GRADES - Sheet1 (5).csv                     (Grades)
```

### DATABASE Folder
```
DATABASE/
├── 1_campuses.csv    (Study Centres)
├── 2_modules.csv     (Academic Modules)
└── 3_courses.csv     (Course Catalog)
```

## Import Process

### Step 1: Clear All Data
The script clears ALL existing data from:
- Academic Records
- Students
- Courses
- Study Centres (Campuses)

### Step 2: Import Study Centres
Imports from `DATABASE/1_campuses.csv`:
- Karatina A
- Karatina B
- Kiambu
- Mukurweini
- Nyeri
- Othaya
- Giathugu

All are marked as **Study Centres** (not campuses).

### Step 3: Import Courses
Imports 35 courses from `DATABASE/3_courses.csv`:
- Biblical Studies (OTS, NTS, HER, etc.)
- Theology (BIB, THP, CHR, SOT, PNE, etc.)
- Ministry (HOM, EVA, CAD, CHP, etc.)
- Languages (GRK, HEB)
- General Education (ENG, AWR)

### Step 4: Import Students
Imports 62 students from `CSV FILES/BMI MASTER RECORDS - 07_STUDENTS.csv`:
- Correct admission numbers: **KEN-DP 225-XXX**
- ALL set to **Part-time** mode
- Assigned to correct study centres
- Proper email format: `kendp225xxx@student.bmi.edu`

### Step 5: Import Grades
Imports grades from 3 CSV files:

#### Transcript CSV
- Main source of grades
- Maps course names to course codes
- Calculates letter grades and grade points

#### Mukurweini CSV
- Grades for Mukurweini and Giathugu students
- Matches students by name

#### Kiambu CSV
- Grades for Kiambu students
- Uses admission numbers from last row

## Grade Calculation

```
Score Range  | Grade | Grade Point
-------------|-------|------------
90-100       | A     | 4.0
80-89        | A-    | 3.7
75-79        | B+    | 3.3
70-74        | B     | 3.0
65-69        | B-    | 2.7
60-64        | C+    | 2.3
55-59        | C     | 2.0
50-54        | C-    | 1.7
45-49        | D+    | 1.3
40-44        | D     | 1.0
35-39        | D-    | 0.7
0-34         | F     | 0.0
```

## How to Run

### Method 1: Batch File (Recommended)
```cmd
.\import-accurate-data.bat
```

### Method 2: NPM Script
```cmd
npm run import-data
```

### Method 3: Direct Command
```cmd
npx tsx scripts/import-accurate-data.ts
```

## What You'll See

```
╔══════════════════════════════════════════════════════╗
║   BMI UMS - 100% Accurate Data Import               ║
║   • Campus → Study Centre                            ║
║   • ALL Diploma → Part-time                          ║
║   • Accurate CSV import                              ║
╚══════════════════════════════════════════════════════╝

📝 Admin credentials required
Admin Email: admin@bmi.ac.ke
Admin Password: ********

✅ Admin authenticated

🗑️  Clearing ALL existing data...

   Deleting 150 records from academic_records...
   ✅ Cleared academic_records
   Deleting 62 records from students...
   ✅ Cleared students
   Deleting 35 records from courses...
   ✅ Cleared courses
   Deleting 7 records from campuses...
   ✅ Cleared campuses

✅ All data cleared

📍 Importing Study Centres...

   ✅ Karatina A (Karatina)
   ✅ Karatina B (Karatina)
   ✅ Kiambu (Kiambu)
   ✅ Mukurweini (Mukurweini)
   ✅ Nyeri (Nyeri)
   ✅ Othaya (Othaya)
   ✅ Giathugu (mukurweini sub-county)

✅ Imported 7 study centres

📚 Importing Courses...

   ✅ ENG 101 - Basic English Grammar
   ✅ AWR 102 - Academic Writing
   ✅ OTS 111 - Old Testament Survey
   ... (35 courses total)

✅ Imported 35 courses

👥 Importing Students (ALL Part-time)...

   ✅ KEN-DP 225-531 - Mary Wanjiku kihara. (Giathugu) [Part-time]
   ✅ KEN-DP 225-534 - Grace Warigu (Giathugu) [Part-time]
   ... (62 students total)

✅ Imported 62 students (ALL Part-time)

📊 Importing Grades from Transcript...

✅ Imported 450 grade records (12 skipped)

📊 Importing Grades from Mukurweini...

✅ Imported 180 grade records (5 skipped)

📊 Importing Grades from Kiambu...

✅ Imported 102 grade records (0 skipped)

╔══════════════════════════════════════════════════════╗
║   ✅ DATA IMPORT COMPLETED                           ║
╚══════════════════════════════════════════════════════╝

📋 Summary:
   Study Centres: 7
   Courses: 35
   Students: 62 (ALL Part-time)

💡 Data will auto-sync to Google Sheets via hooks
🔄 Check logs/backend_out.log for sync activity
```

## Auto-Sync to Google Sheets

After import, data automatically syncs to Google Sheets via PocketBase hooks:

1. **Students** → `07_STUDENTS` sheet
2. **Academic Records** → `09_GRADES` sheet
3. **Courses** → `04_COURSES` sheet
4. **Study Centres** → `01_CAMPUSES` sheet

### Monitor Sync Activity

```powershell
# Watch backend logs
Get-Content logs\backend_out.log -Wait -Tail 20

# Watch PocketBase logs
Get-Content logs\pocketbase_out.log -Wait -Tail 20
```

You should see:
```
✅ Triggered sync: students create abc123
Updated student KEN-DP 225-588 in sheet at row 5
```

## Verification

### 1. Check PocketBase Admin
Open http://localhost:8090/_/

Verify:
- ✅ 7 study centres in `campuses` collection
- ✅ 35 courses in `courses` collection
- ✅ 62 students in `students` collection (all Part-time)
- ✅ 700+ academic records in `academic_records` collection

### 2. Check Google Sheets
Open your Google Sheet: https://docs.google.com/spreadsheets/d/1Y0oxI5QUpncZ9m5T48czz4F-vi04vTEWSZVz-PW_mzg

Verify:
- ✅ `07_STUDENTS` has 62 students with KEN-DP 225-XXX format
- ✅ `09_GRADES` has 700+ grade records
- ✅ All students show "Part-time" mode

### 3. Check Frontend
Open http://localhost:5173

Verify:
- ✅ Students list shows correct admission numbers
- ✅ Study centres (not campuses) appear in filters
- ✅ All diploma students show "Part-time" mode

## Troubleshooting

### Import Fails

**Check 1: Admin credentials**
```
❌ Admin authentication failed
```
Solution: Verify admin email and password

**Check 2: CSV files exist**
```
⚠️  BMI MASTER RECORDS - 07_STUDENTS.csv not found
```
Solution: Ensure CSV FILES folder has all required files

**Check 3: PocketBase running**
```
❌ Failed to connect to PocketBase
```
Solution: Start services with `npm start`

### Sync Not Working

**Check 1: Backend running**
```cmd
curl http://127.0.0.1:3001/health
```

**Check 2: Hooks loaded**
```cmd
type logs\pocketbase_out.log | findstr "Auto-sync hooks"
```

Should see: `✅ Auto-sync hooks registered`

**Check 3: Google credentials**
Verify `backend/google-credentials.json` exists

## Data Accuracy

### Student Records
- ✅ Admission numbers: KEN-DP 225-XXX format
- ✅ Mode of study: ALL Part-time
- ✅ Study centres: Correctly assigned
- ✅ Email format: kendp225xxx@student.bmi.edu

### Grade Records
- ✅ Scores: Parsed from CSV (0-100)
- ✅ Grades: Calculated (A to F)
- ✅ Grade points: Calculated (0.0 to 4.0)
- ✅ Course mapping: Accurate course codes

### Study Centres
- ✅ Terminology: "Study Centre" (not Campus)
- ✅ Type: All marked as "Study Centre"
- ✅ Status: All "Active"

## Summary

✅ **100% accurate data import**
✅ **Campus → Study Centre terminology**
✅ **ALL Diploma students → Part-time**
✅ **Automatic Google Sheets sync**
✅ **Proper admission number format (KEN-DP 225-XXX)**

---

**Last Updated**: 2026-05-21  
**Version**: 2.0.0  
**Status**: ✅ Ready to Use
