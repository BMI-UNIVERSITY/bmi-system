# 🚀 Quick Start: Restore Accurate Data

## Prerequisites

### 1. Make Sure Services Are Running
```bash
npm start
```

Wait until you see:
```
[2026-05-21 XX:XX:XX] PocketBase UP | Backend API UP | Frontend UP | Tunnel UP
```

### 2. Create Admin Account (First Time Only)

**Option A: Automatic**
```bash
scripts\setup-admin.bat
```

**Option B: Manual**
1. Open: http://localhost:8090/_/
2. Click "Create your first admin"
3. Enter:
   - **Email**: `admin@bmi.ac.ke`
   - **Password**: `Admin@2025`
   - **Password Confirm**: `Admin@2025`
4. Click "Create"

## Restore Data

### Method 1: Batch File (Recommended)
```bash
.\restore-data.bat
```

### Method 2: NPM Script
```bash
npm run restore-data
```

### Method 3: Direct Command
```bash
npx tsx scripts/restore-accurate-data.ts
```

## What Happens

### Step 1: Authentication
- Connects to PocketBase
- Authenticates as admin

### Step 2: Clean Data
Removes existing:
- Academic Records
- Students
- Courses
- Modules
- Campuses

**Note**: Other collections (staff, finance, library) remain untouched.

### Step 3: Import Data
Imports from `DATABASE/` folder:
1. **7 Campuses**
2. **2 Modules** (Level I & II)
3. **35 Courses**
4. **62 Students** with correct admission numbers
5. **500+ Academic Records**

## Verify Results

### 1. Check PocketBase Admin
Open: http://localhost:8090/_/

Navigate to:
- **Students** collection → Should have 62 records
- **Courses** collection → Should have 35 records
- **Campuses** collection → Should have 7 records

### 2. Check Admission Numbers
All students should have admission numbers in format:
- `KEN-DP 225-531`
- `KEN-DP 225-577`
- `KEN-DP 225-588`
- etc.

### 3. Check Academic Structure
- **Level I**: Semester 1 & 2
- **Level II**: Semester 3 & 4
- **Courses**: 16-25 per student

## Troubleshooting

### Error: "Authentication failed"

**Cause**: Admin account doesn't exist or wrong credentials

**Solution**:
1. Open http://localhost:8090/_/
2. Create admin account:
   - Email: `admin@bmi.ac.ke`
   - Password: `Admin@2025`
3. Run restore script again

### Error: "PocketBase not running"

**Cause**: Services not started

**Solution**:
```bash
npm start
```

Wait for all services to show "UP", then run restore script.

### Error: "CSV file not found"

**Cause**: DATABASE folder missing or incomplete

**Solution**:
Ensure these files exist in `DATABASE/` folder:
- `1_campuses.csv`
- `2_modules.csv`
- `3_courses.csv`
- `4_students.csv`
- `5_academic_records.csv`

### Partial Import

**Cause**: Some records failed to import

**Solution**:
1. Check console output for specific errors
2. Fix any data issues in CSV files
3. Run restore script again (it will clean and re-import)

## Expected Output

```
╔══════════════════════════════════════════════════════╗
║   BMI UMS - Restore Accurate Data                    ║
╚══════════════════════════════════════════════════════╝

🔐 Authenticating with PocketBase...
✅ Authenticated successfully (as admin)

🧹 STEP 1: Cleaning existing data...

🗑️  Deleting all records from academic_records...
   Found 0 records to delete
   ✅ Deleted 0 records from academic_records

🗑️  Deleting all records from students...
   Found 0 records to delete
   ✅ Deleted 0 records from students

... (more cleaning)

📂 STEP 2: Reading CSV files from DATABASE folder...

📖 Reading 1_campuses.csv...
   Found 7 records
📖 Reading 2_modules.csv...
   Found 2 records
📖 Reading 3_courses.csv...
   Found 35 records
📖 Reading 4_students.csv...
   Found 62 records
📖 Reading 5_academic_records.csv...
   Found 500+ records

📥 STEP 3: Importing data...

🏫 Importing campuses...
✅ Imported 7 campuses

📚 Importing modules...
✅ Imported 2 modules

📖 Importing courses...
✅ Imported 35 courses

👨‍🎓 Importing students...
✅ Imported 62 students (0 failed)

📊 Importing academic records...
✅ Imported 500+ academic records (0 failed)

╔══════════════════════════════════════════════════════╗
║   ✅ DATA RESTORATION COMPLETE                       ║
╚══════════════════════════════════════════════════════╝

📊 Summary:
   - Campuses: 7
   - Modules: 2
   - Courses: 35
   - Students: 62
   - Academic Records: 500+

✅ All data has been restored with correct admission numbers!
   Format: KEN-DP 225-XXX
```

## Next Steps

After successful restoration:

1. ✅ **Verify Data**
   - Open PocketBase Admin
   - Check all collections
   - Verify admission numbers

2. ✅ **Test Frontend**
   - Open http://localhost:3000
   - Login as admin
   - Navigate to Students page
   - Check student records

3. ✅ **Generate Transcripts**
   - Select a student
   - Generate transcript
   - Verify QR code contains correct admission number

4. ✅ **Test Verification Portal**
   - Scan QR code
   - Verify document at: https://lax-scarious-lindsey.ngrok-free.dev/verify
   - Check admission number format

## Important Notes

### ⚠️ Data Loss Warning
This script **permanently deletes**:
- All student records
- All course records
- All academic records
- All module records
- All campus records

**Backup first** if you have important data!

### 🔄 Re-running
You can run the script multiple times safely. It will:
1. Clean all data
2. Re-import fresh data from CSV files

### 📝 Modifying Data
To modify data before import:
1. Edit CSV files in `DATABASE/` folder
2. Run restore script again

### 🔒 Credentials
Default admin credentials:
- **Email**: `admin@bmi.ac.ke`
- **Password**: `Admin@2025`

Change these in production!

---

**Last Updated**: 2026-05-21  
**Version**: 1.0.0  
**Status**: ✅ Ready to Use
