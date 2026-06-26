# Grade Sync Fix - Complete Solution

## Problem Identified

The import showed **0 grades** synced to Google Sheets because of field naming mismatches between:
1. Import scripts
2. PocketBase collection schemas  
3. Sync queue expectations

## Root Causes

### 1. **Grade Records Field Names**
- ❌ **OLD**: Import used `student_id` and `course_id` (with `_id` suffix)
- ✅ **FIXED**: Now uses `student` and `course` (without suffix) - matches PocketBase relation field names

### 2. **Study Center Collection Names**
- ❌ **OLD**: Inconsistent - some scripts used `study_centers`, others used `campuses`
- ✅ **FIXED**: Sync queue now handles BOTH collection names

### 3. **Student Campus Field**
- ❌ **OLD**: Used `study_center_id` 
- ✅ **FIXED**: Now uses `campus` (matches PocketBase schema)

## Files Fixed

### 1. `scripts/import-accurate-data.ts`
**Changes:**
- ✅ Grade records: `student_id` → `student`, `course_id` → `course`
- ✅ Student records: `study_center_id` → `campus`
- ✅ Applied to all 3 grade import functions:
  - `importGradesFromTranscript()`
  - `importGradesFromMukurweini()`
  - `importGradesFromKiambu()`

### 2. `backend/src/services/sheetsSyncQueue.ts`
**Changes:**
- ✅ `enqueueCampusSync()` now tries BOTH `study_centers` AND `campuses` collections
- ✅ Prevents sync failures when either collection name is used

### 3. `pb_hooks/auto_sync.pb.js`
**Changes:**
- ✅ Added hooks for BOTH `study_centers` AND `campuses` collections
- ✅ Ensures automatic sync triggers regardless of which collection is used

## How It Works Now

### Data Flow:
```
1. Import Script creates records
   ↓
2. PocketBase triggers hooks (auto_sync.pb.js)
   ↓
3. Hooks call Backend API webhook (/api/v1/sync)
   ↓
4. Backend enqueues sync job (sheetsSyncQueue.ts)
   ↓
5. Sync job reads record with proper field names
   ↓
6. Data syncs to Google Sheets (09_GRADES tab)
```

### Field Mapping:
| PocketBase Field | Google Sheet Column |
|-----------------|---------------------|
| `student` (relation) → `student_code` | Student Code |
| `course` (relation) → `code` | Course Code |
| `total_score` | Total Score |
| `ca_score` | CA Score |
| `exam_score` | Exam Score |
| `grade` | Letter Grade |
| `grade_point` | Grade Points |
| `remarks` | Remarks |
| `academic_year` | Academic Year |

## Expected Results

After running the import script, you should see:
- ✅ **Study Centres**: 7 imported
- ✅ **Courses**: 35 imported  
- ✅ **Students**: 58 imported (ALL Part-time)
- ✅ **Grades**: 700+ imported (from 3 CSV files)

All data will automatically sync to Google Sheets:
- 01_CAMPUSES tab
- 04_COURSES tab
- 07_STUDENTS tab
- 09_GRADES tab ← **This was showing 0 before, now fixed!**

## Next Steps

1. **Restart services** to load updated hooks:
   ```bash
   npm stop
   npm start
   ```

2. **Run import script**:
   ```bash
   npm run import-data
   ```
   Or with credentials:
   ```bash
   set POCKETBASE_ADMIN_EMAIL=your-email
   set POCKETBASE_ADMIN_PASSWORD=your-password
   npm run import-data
   ```

3. **Verify in Google Sheets**:
   - Open: https://docs.google.com/spreadsheets/d/1Y0oxI5QUpncZ9m5T48czz4F-vi04vTEWSZVz-PW_mzg
   - Check 09_GRADES tab - should now show all grades!

## Technical Details

### Why Field Names Matter
PocketBase relation fields are stored WITHOUT the `_id` suffix in the database. When you create a record:
```typescript
// ❌ WRONG - PocketBase doesn't recognize this
{ student_id: "abc123", course_id: "xyz789" }

// ✅ CORRECT - PocketBase recognizes relation fields
{ student: "abc123", course: "xyz789" }
```

### Why Sync Failed Before
The sync queue tried to expand relations:
```typescript
grade.expand?.student?.student_code  // ✅ Works with correct field name
grade.expand?.student_id?.student_code  // ❌ Fails - field doesn't exist
```

When `studentCode` was undefined, the sync silently skipped the record.

## Verification

Check backend logs for sync activity:
```bash
type logs\backend_out.log | findstr "grade"
```

You should see:
```
[SheetsSyncQueue] Enqueued job: grade_sync_xxx
[SheetsSyncQueue] Starting job: grade_sync_xxx
[SheetsSyncQueue] Appended grade for KEN-DP 225-571 - HOM 121 to sheet
[SheetsSyncQueue] Completed job: grade_sync_xxx
```

## Summary

The fix ensures that:
1. ✅ Import scripts use correct PocketBase field names
2. ✅ Sync queue can read and expand relations properly
3. ✅ Hooks trigger for all collection name variations
4. ✅ Grades sync automatically to Google Sheets
5. ✅ All 700+ grade records will appear in 09_GRADES tab

**Status**: Ready to import! 🚀
