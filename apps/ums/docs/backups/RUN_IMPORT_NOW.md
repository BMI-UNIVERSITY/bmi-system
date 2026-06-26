# 🚀 Run Data Import NOW

## Quick Start

Open a new terminal and run:

```cmd
.\import-accurate-data.bat
```

You'll be prompted for:
1. **Admin Email**: (your PocketBase admin email)
2. **Admin Password**: (your PocketBase admin password)

## What Will Happen

### 1. Clear All Data
```
🗑️  Clearing ALL existing data...
   Deleting records from academic_records...
   Deleting records from students...
   Deleting records from courses...
   Deleting records from campuses...
✅ All data cleared
```

### 2. Import Study Centres (7 centres)
```
📍 Importing Study Centres...
   ✅ Karatina A (Karatina)
   ✅ Karatina B (Karatina)
   ✅ Kiambu (Kiambu)
   ✅ Mukurweini (Mukurweini)
   ✅ Nyeri (Nyeri)
   ✅ Othaya (Othaya)
   ✅ Giathugu (mukurweini sub-county)
```

### 3. Import Courses (35 courses)
```
📚 Importing Courses...
   ✅ ENG 101 - Basic English Grammar
   ✅ AWR 102 - Academic Writing
   ✅ OTS 111 - Old Testament Survey
   ... (35 total)
```

### 4. Import Students (62 students - ALL Part-time)
```
👥 Importing Students (ALL Part-time)...
   ✅ KEN-DP 225-531 - Mary Wanjiku kihara. (Giathugu) [Part-time]
   ✅ KEN-DP 225-534 - Grace Warigu (Giathugu) [Part-time]
   ... (62 total)
```

### 5. Import Grades (700+ records)
```
📊 Importing Grades from Transcript...
✅ Imported 450 grade records

📊 Importing Grades from Mukurweini...
✅ Imported 180 grade records

📊 Importing Grades from Kiambu...
✅ Imported 102 grade records
```

### 6. Complete!
```
╔══════════════════════════════════════════════════════╗
║   ✅ DATA IMPORT COMPLETED                           ║
╚══════════════════════════════════════════════════════╝

📋 Summary:
   Study Centres: 7
   Courses: 35
   Students: 62 (ALL Part-time)

💡 Data will auto-sync to Google Sheets via hooks
```

## After Import

### Verify in PocketBase
Open: http://localhost:8090/_/

Check:
- ✅ 7 study centres
- ✅ 35 courses
- ✅ 62 students (all Part-time)
- ✅ 700+ academic records

### Verify in Google Sheets
Open: https://docs.google.com/spreadsheets/d/1Y0oxI5QUpncZ9m5T48czz4F-vi04vTEWSZVz-PW_mzg

Check:
- ✅ 07_STUDENTS sheet has 62 students
- ✅ Admission numbers: KEN-DP 225-XXX
- ✅ Mode: Part-time for all
- ✅ 09_GRADES sheet has 700+ records

### Monitor Sync
```powershell
Get-Content logs\backend_out.log -Wait -Tail 20
```

Look for:
```
✅ Triggered sync: students create abc123
Updated student KEN-DP 225-588 in sheet at row 5
```

## Ready to Run!

Just execute: `.\import-accurate-data.bat`
