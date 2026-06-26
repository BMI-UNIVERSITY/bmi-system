# 🔄 BMI UMS - Data Restoration Guide

## Overview

This guide explains how to restore the accurate data structure with correct admission numbers and academic organization.

## What Gets Restored

### 1. Admission Number Format
**Correct Format**: `KEN-DP 225-XXX`

Examples:
- `KEN-DP 225-531` (Mukurweini campus)
- `KEN-DP 225-577` (Karatina 1 campus)
- `KEN-DP 225-551` (Kiambu campus)

### 2. Academic Structure

#### Diploma Programme
- **Duration**: 2 Levels (I & II)
- **Semesters**: 4 total (2 per level)
  - Level I: Semester 1 & 2
  - Level II: Semester 3 & 4
- **Courses**: 16-25 courses distributed across 4 semesters
- **Programme**: Diploma in Theology & Christian Ministry

#### Certificate Programme
- **Duration**: 1 Level
- **Semesters**: 2 total
- **Courses**: 12 courses distributed across 2 semesters

### 3. Data Sources

All data is imported from the `DATABASE/` folder:
- `1_campuses.csv` - Campus locations
- `2_modules.csv` - Academic modules/levels
- `3_courses.csv` - Course catalog
- `4_students.csv` - Student records with correct admission numbers
- `5_academic_records.csv` - Student grades and course enrollments

## How to Restore Data

### Method 1: Double-Click (Easiest)
1. Double-click `restore-data.bat`
2. Confirm when prompted
3. Wait for completion

### Method 2: Command Line
```bash
restore-data.bat
```

### Method 3: NPM Script
```bash
npm run restore-data
```

## What Happens During Restoration

### Step 1: Authentication
- Connects to PocketBase
- Authenticates as admin

### Step 2: Data Cleaning
Deletes existing records from:
- ✅ Academic Records
- ✅ Students
- ✅ Courses
- ✅ Modules
- ✅ Campuses

**Note**: Other collections (staff, finance, library, etc.) remain untouched.

### Step 3: Data Import
Imports in this order:
1. **Campuses** (7 campuses)
   - Karatina A & B
   - Kiambu
   - Mukurweini
   - Nyeri
   - Othaya
   - Giathugu

2. **Modules** (Academic levels)
   - Level I (Semester 1)
   - Level II (Semester 3)

3. **Courses** (35 courses)
   - Biblical Studies
   - Theology
   - Ministry
   - Leadership
   - Spiritual Development

4. **Students** (62 students)
   - With correct admission numbers
   - Assigned to campuses
   - Programme information

5. **Academic Records** (500+ records)
   - Student grades
   - Course enrollments
   - Academic performance

## Data Structure

### Campuses
```csv
name,location
Karatina A,Karatina
Karatina B,Karatina
Kiambu,Kiambu
Mukurweini,Mukurweini
Nyeri,Nyeri
Othaya,Othaya
Giathugu,mukurweini sub-county
```

### Modules (Academic Levels)
```csv
name,semester,sort_order
LEVEL I,Semester 1,2
LEVEL II,Semester 3,4
```

### Course Distribution

#### Level I - Semester 1 (Module 1)
- ENG 101 - Basic English Grammar
- AWR 102 - Academic Writing
- OTS 111 - Old Testament Survey
- NTS 112 - New Testament Survey
- BIB 113 - Bibliology
- HER 114 - Biblical Hermeneutics
- EVA 115 - Evangelism
- CFM 116 - Christian Family

#### Level I - Semester 2 (Module 2)
- HOM 121 - Homiletics
- CHH 122 - Church History
- THP 123 - Theology Proper
- CHR 124 - Christology
- SOT 125 - Soteriology
- PNE 126 - Pneumatology
- PRW 127 - Praise and Worship

#### Level II - Semester 3 (Module 3)
- ECC 211 - Ecclesiology
- CAD 212 - Church Administration
- CHG 213 - Church Growth
- CHP 214 - Church Planting
- FSM 215 - Foundation of Successful Ministry
- SPF 216 - Spiritual Formation
- POS 217 - Principles of Success
- UKP 218 - Understanding God's Kingdom Principles

#### Level II - Semester 4 (Module 4)
- ESC 221 - Eschatology
- ANG 222 - Angelology
- ANH 223 - Anthropology & Hamartiology
- SPW 224 - Spiritual Warfare
- SPR 225 - Spiritual Realm
- APO 226 - Christian Apologetics
- PCE 227 - Pastoral Counselling & Ethics
- MWR 228 - Major World Religions

### Student Record Example
```csv
student_code,reg_no,full_name,admission_no,programme,campus_name
2025-035,THS/2025/225-588,Anthony Mwangi Mburu,KEN-DP 225-588,Diploma in Theology & Christian Ministry,Karatina 1
```

### Academic Record Example
```csv
student_code,course_code,total_score,grade,grade_point,remarks,academic_year
2025-035,BIB 113,27,F,0,Fail,2025
2025-035,NTS 112,75,B+,3.5,Pass,2025
```

## Verification

After restoration, verify the data:

### 1. Check Student Count
- Total students: 62
- Karatina 1: 20 students
- Karatina 2: 6 students
- Kiambu: 6 students
- Mukurweini: 15 students
- Nyeri: 7 students
- Othaya: 7 students
- Giathugu: 1 student

### 2. Check Admission Numbers
All admission numbers should follow format: `KEN-DP 225-XXX`

### 3. Check Courses
- Total courses: 35
- Distributed across 4 modules (semesters)

### 4. Check Academic Records
- Each student should have 16-25 course enrollments
- Grades should be: A, B+, B, C+, C, D, F
- Grade points: 4, 3.5, 3, 2.5, 2, 1, 0

## Troubleshooting

### Error: Authentication Failed
**Solution**: Check PocketBase admin credentials in the script:
```typescript
const ADMIN_EMAIL = 'admin@bmi.ac.ke';
const ADMIN_PASSWORD = 'Admin@2025';
```

### Error: CSV File Not Found
**Solution**: Ensure all CSV files exist in `DATABASE/` folder:
- 1_campuses.csv
- 2_modules.csv
- 3_courses.csv
- 4_students.csv
- 5_academic_records.csv

### Error: PocketBase Not Running
**Solution**: Start PocketBase first:
```bash
npm start
```

### Partial Import
If some records fail to import:
1. Check the console output for specific errors
2. Verify CSV file format
3. Check for duplicate records
4. Run the script again (it will clean and re-import)

## Important Notes

### ⚠️ Data Loss Warning
This script **deletes** existing data from:
- Students
- Courses
- Modules
- Campuses
- Academic Records

**Other collections are NOT affected**:
- Staff
- Finance
- Library
- Inventory
- Communications
- etc.

### 🔒 Backup Recommendation
Before running restoration:
1. Backup your PocketBase database:
   ```bash
   copy data\pb_data\data.db data\pb_data\data.db.backup
   ```

2. Or export data from PocketBase admin panel

### 🔄 Re-running the Script
You can run the script multiple times safely. It will:
1. Clean existing data
2. Re-import fresh data from CSV files

## Google Sheets Integration

After restoring data to PocketBase, you may want to sync with Google Sheets:

### Option 1: Export from PocketBase
1. Open PocketBase admin: http://localhost:8090/_/
2. Navigate to each collection
3. Export to CSV
4. Import to Google Sheets

### Option 2: Use API Integration
The backend API provides endpoints to sync data with Google Sheets.

## Next Steps

After successful restoration:

1. ✅ Verify data in PocketBase admin panel
2. ✅ Test student login with admission numbers
3. ✅ Check academic records display
4. ✅ Generate sample transcripts
5. ✅ Test verification portal with QR codes

## Support

If you encounter issues:
1. Check logs in `logs/` directory
2. Review console output for specific errors
3. Verify CSV file formats
4. Ensure PocketBase is running
5. Check admin credentials

---

**Last Updated**: 2026-05-21  
**Version**: 1.0.0  
**Status**: ✅ Ready to Use
