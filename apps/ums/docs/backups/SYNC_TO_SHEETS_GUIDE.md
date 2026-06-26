# 🔄 BMI UMS - Sync to Google Sheets Guide

## Overview

This guide explains how to automatically sync all PocketBase data to Google Sheets with correct admission numbers.

## What Gets Synced

### 1. Campuses → Sheet: `01_CAMPUSES`
- Name
- Location
- Status

### 2. Modules → Sheet: `02_MODULES`
- Name (Level I, Level II)
- Semester
- Sort Order

### 3. Courses → Sheet: `04_COURSES`
- Course Code
- Title
- Category
- Credit Hours
- Module

### 4. Students → Sheet: `07_STUDENTS`
- Student Code
- Reg No
- Full Name
- Gender
- Date of Birth
- Nationality
- Phone
- Email
- **Admission No** (KEN-DP 225-XXX format)
- Admission Date
- Programme
- Status
- Campus

### 5. Academic Records → Sheet: `09_GRADES`
- Student Code
- Course Code
- Total Score
- CA Score
- Exam Score
- Grade
- Grade Point
- Remarks
- Academic Year

## How to Sync

### Method 1: With Credentials Prompt (Recommended)
```bash
.\sync-with-credentials.bat
```

This will:
1. Ask for your admin email
2. Ask for your admin password
3. Sync all data to Google Sheets

### Method 2: With Environment Variables
```powershell
# Set your credentials
$env:PB_ADMIN_EMAIL = "your-email@example.com"
$env:PB_ADMIN_PASSWORD = "your-password"

# Run sync
npm run sync-to-sheets
```

### Method 3: Direct Command
```bash
npm run sync-to-sheets
```
(Uses default credentials: admin@bmi.ac.ke / Admin@2025)

## Prerequisites

### 1. Services Running
Make sure all services are running:
```bash
npm start
```

### 2. Google Credentials
Ensure `backend/google-credentials.json` exists with valid service account credentials.

### 3. Admin Account
You need a PocketBase admin account to authenticate.

## What Happens During Sync

### Step 1: Authentication
- ✅ Initializes Google Sheets API
- ✅ Authenticates with PocketBase

### Step 2: Data Fetch
- ✅ Fetches all campuses
- ✅ Fetches all modules
- ✅ Fetches all courses
- ✅ Fetches all students (62 records)
- ✅ Fetches all academic records (500+ records)

### Step 3: Sheet Update
- ✅ Clears existing data in each sheet
- ✅ Writes headers
- ✅ Writes all data rows
- ✅ Preserves correct admission number format

## Expected Output

```
╔══════════════════════════════════════════════════════╗
║   BMI UMS - Sync to Google Sheets                    ║
╚══════════════════════════════════════════════════════╝

🔐 Initializing Google Sheets authentication...
✅ Google Sheets authentication initialized

🔐 Authenticating with PocketBase...
✅ PocketBase authentication successful (as admin)

🏫 Syncing Campuses...

📥 Fetching campuses from PocketBase...
   Found 7 records

📝 Updating sheet: 01_CAMPUSES...
   ✅ Updated 7 rows in 01_CAMPUSES

📚 Syncing Modules...

📥 Fetching modules from PocketBase...
   Found 2 records

📝 Updating sheet: 02_MODULES...
   ✅ Updated 2 rows in 02_MODULES

📖 Syncing Courses...

📥 Fetching courses from PocketBase...
   Found 35 records

📝 Updating sheet: 04_COURSES...
   ✅ Updated 35 rows in 04_COURSES

👨‍🎓 Syncing Students...

📥 Fetching students from PocketBase...
   Found 62 records

📥 Fetching campuses from PocketBase...
   Found 7 records

📝 Updating sheet: 07_STUDENTS...
   ✅ Updated 62 rows in 07_STUDENTS

📊 Syncing Academic Records...

📥 Fetching academic_records from PocketBase...
   Found 500+ records

📥 Fetching students from PocketBase...
   Found 62 records

📥 Fetching courses from PocketBase...
   Found 35 records

📝 Updating sheet: 09_GRADES...
   ✅ Updated 500+ rows in 09_GRADES

╔══════════════════════════════════════════════════════╗
║   ✅ SYNC COMPLETE                                   ║
╚══════════════════════════════════════════════════════╝

📊 Summary:
   - Campuses synced to 01_CAMPUSES
   - Modules synced to 02_MODULES
   - Courses synced to 04_COURSES
   - Students synced to 07_STUDENTS
   - Academic Records synced to 09_GRADES

🌐 View your Google Sheet:
   https://docs.google.com/spreadsheets/d/1Y0oxI5QUpncZ9m5T48czz4F-vi04vTEWSZVz-PW_mzg
```

## Verification

After sync, verify the data in Google Sheets:

### 1. Check Student Count
- Open: https://docs.google.com/spreadsheets/d/1Y0oxI5QUpncZ9m5T48czz4F-vi04vTEWSZVz-PW_mzg
- Go to `07_STUDENTS` sheet
- Should have 62 students

### 2. Check Admission Numbers
All admission numbers should be in format: `KEN-DP 225-XXX`
- KEN-DP 225-531
- KEN-DP 225-577
- KEN-DP 225-588
- etc.

### 3. Check Other Sheets
- `01_CAMPUSES` - 7 campuses
- `02_MODULES` - 2 modules (Level I & II)
- `04_COURSES` - 35 courses
- `09_GRADES` - 500+ academic records

## Troubleshooting

### Error: "Authentication failed"

**Cause**: Wrong credentials or admin doesn't exist

**Solution**:
1. Use `.\sync-with-credentials.bat` and enter correct credentials
2. Or set environment variables:
   ```powershell
   $env:PB_ADMIN_EMAIL = "your-email@example.com"
   $env:PB_ADMIN_PASSWORD = "your-password"
   ```

### Error: "Google credentials file not found"

**Cause**: Missing `backend/google-credentials.json`

**Solution**:
1. Ensure the file exists at `backend/google-credentials.json`
2. Check it contains valid service account credentials
3. Verify the service account has access to the spreadsheet

### Error: "PocketBase not running"

**Cause**: Services not started

**Solution**:
```bash
npm start
```

Wait for all services to show "UP", then run sync again.

### Error: "Permission denied" on Google Sheets

**Cause**: Service account doesn't have access to the spreadsheet

**Solution**:
1. Open your Google Sheet
2. Click "Share"
3. Add the service account email (from google-credentials.json)
4. Give it "Editor" permissions

## Automation

### Schedule Regular Syncs

You can schedule this to run automatically:

#### Option 1: Windows Task Scheduler
1. Open Task Scheduler
2. Create new task
3. Set trigger (e.g., daily at 2 AM)
4. Set action: Run `sync-with-credentials.bat`

#### Option 2: Cron Job (if using WSL)
```bash
# Edit crontab
crontab -e

# Add line (runs daily at 2 AM)
0 2 * * * cd /path/to/bmi-ums && npm run sync-to-sheets
```

## Important Notes

### ⚠️ Data Overwrite
This script **overwrites** existing data in Google Sheets:
- Clears all data in each sheet
- Writes fresh data from PocketBase

**Backup recommendation**: Make a copy of your Google Sheet before first sync.

### 🔄 Re-running
You can run the sync multiple times safely. It will:
1. Clear existing sheet data
2. Write fresh data from PocketBase

### 📊 Data Direction
This is a **one-way sync**: PocketBase → Google Sheets

Changes made in Google Sheets will be overwritten on next sync.

## Integration with Workflow

### Typical Workflow

1. **Update Data in PocketBase**
   - Add/edit students
   - Update grades
   - Modify courses

2. **Sync to Google Sheets**
   ```bash
   .\sync-with-credentials.bat
   ```

3. **Share/Report from Google Sheets**
   - Generate reports
   - Share with stakeholders
   - Create charts/dashboards

### After Data Restoration

After running `restore-data.bat`, sync to update Google Sheets:
```bash
# Restore data
.\restore-data.bat

# Sync to sheets
.\sync-with-credentials.bat
```

## Google Sheet Structure

### Sheet Names (Must Match)
- `01_CAMPUSES`
- `02_MODULES`
- `04_COURSES`
- `07_STUDENTS`
- `09_GRADES`

If sheet names don't match, the sync will fail.

## Support

If you encounter issues:

1. **Check Logs**
   - Console output shows detailed progress
   - Look for specific error messages

2. **Verify Prerequisites**
   - PocketBase running
   - Google credentials valid
   - Admin account exists

3. **Test Authentication**
   - Try logging into PocketBase admin: http://localhost:8090/_/
   - Use those credentials for sync

---

**Last Updated**: 2026-05-21  
**Version**: 1.0.0  
**Status**: ✅ Ready to Use
