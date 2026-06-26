# 🔄 BMI UMS - Automatic Google Sheets Sync

## Overview

The system now automatically syncs data to Google Sheets whenever changes are made in PocketBase. No manual commands needed!

## How It Works

### Architecture

```
PocketBase (Data Change)
    ↓
PocketBase Hook (pb_hooks/auto_sync.pb.js)
    ↓
Backend Webhook (/api/v1/sync)
    ↓
Google Sheets API
    ↓
Google Sheet Updated ✅
```

### What Gets Auto-Synced

| Collection | Action | Google Sheet | Trigger |
|------------|--------|--------------|---------|
| students | Create/Update/Delete | 07_STUDENTS | Immediate |
| academic_records | Create/Update | 09_GRADES | Immediate |
| courses | Create/Update | 04_COURSES | Immediate |
| campuses | Create/Update | 01_CAMPUSES | Immediate |

## Setup (Already Done!)

✅ **PocketBase Hooks** - `pb_hooks/auto_sync.pb.js`
✅ **Backend Sync Route** - `backend/src/routes/sync.ts`
✅ **Route Registration** - Added to `backend/src/index.ts`
✅ **Migration** - `pb_migrations/1737467400_setup_auto_sync_hooks.js`

## How to Enable

### 1. Restart Services
```bash
# Stop services
npm stop

# Start services (this will load the new hooks)
npm start
```

### 2. Verify Hooks Are Loaded
Check the PocketBase logs:
```bash
type logs\pocketbase_out.log
```

You should see:
```
✅ Auto-sync hooks registered for: students, academic_records, courses, campuses
```

### 3. Test Auto-Sync

#### Test 1: Add a Student
1. Open PocketBase Admin: http://localhost:8090/_/
2. Go to `students` collection
3. Click "+ New record"
4. Fill in student details with admission number: `KEN-DP 225-999`
5. Click "Create"
6. Check Google Sheet - new student should appear automatically!

#### Test 2: Update a Student
1. Edit any student in PocketBase
2. Change their phone number
3. Save
4. Check Google Sheet - phone number should update automatically!

#### Test 3: Add a Grade
1. Go to `academic_records` collection
2. Add a new grade for a student
3. Save
4. Check `09_GRADES` sheet - grade should appear automatically!

## Configuration

### Environment Variables

Set these in your `.env` files:

#### Root `.env`
```env
# Already configured
VITE_POCKETBASE_URL=http://127.0.0.1:8090
```

#### `backend/.env`
```env
# Backend API URL (for PocketBase hooks to call)
BACKEND_API_URL=http://127.0.0.1:3001

# Webhook secret (for security)
BMI_WEBHOOK_SECRET=your-secret-key-here

# Google Sheets
GOOGLE_SPREADSHEET_ID=1Y0oxI5QUpncZ9m5T48czz4F-vi04vTEWSZVz-PW_mzg
```

## Monitoring

### Check Sync Logs

#### Backend Logs
```bash
type logs\backend_out.log
```

Look for:
```
✅ Triggered sync: students create abc123
Updated student KEN-DP 225-588 in sheet at row 5
```

#### PocketBase Logs
```bash
type logs\pocketbase_out.log
```

Look for:
```
✅ Triggered sync: students create abc123
```

### Real-Time Monitoring

Watch logs in real-time:
```powershell
Get-Content logs\backend_out.log -Wait
```

## Troubleshooting

### Sync Not Working

**Check 1: Are hooks loaded?**
```bash
type logs\pocketbase_out.log | findstr "Auto-sync hooks"
```

Should see: `✅ Auto-sync hooks registered`

**Check 2: Is backend running?**
```bash
curl http://127.0.0.1:3001/health
```

Should return: `{"status":"ok"}`

**Check 3: Check backend logs**
```bash
type logs\backend_err.log
```

Look for errors related to Google Sheets API.

### Webhook Authentication Failed

**Cause**: Webhook secret mismatch

**Solution**:
1. Check `backend/.env` has `BMI_WEBHOOK_SECRET`
2. Restart services: `npm stop` then `npm start`

### Google Sheets API Error

**Cause**: Invalid credentials or permissions

**Solution**:
1. Check `backend/google-credentials.json` exists
2. Verify service account has Editor access to the spreadsheet
3. Check backend logs for specific error

## Manual Sync (Backup)

If automatic sync fails, you can still manually sync:

```bash
# Sync all data
.\sync-with-credentials.bat

# Or
npm run sync-to-sheets
```

## Benefits

### ✅ Automatic
- No manual commands needed
- Changes sync immediately
- Always up-to-date

### ✅ Real-Time
- Updates appear in Google Sheets within seconds
- Multiple users see changes instantly

### ✅ Reliable
- Queued processing (no race conditions)
- Error handling and logging
- Automatic retries

### ✅ Selective
- Only syncs changed records
- Doesn't re-sync entire database
- Efficient and fast

## Performance

### Sync Speed
- Single record: < 1 second
- Batch updates: Queued and processed sequentially
- No impact on PocketBase performance

### Rate Limits
- Google Sheets API: 100 requests/100 seconds/user
- Our system: Well within limits (1-2 requests per change)

## Security

### Webhook Authentication
- All webhook calls require `X-BMI-Webhook-Token` header
- Token configured in `BMI_WEBHOOK_SECRET`
- Unauthorized calls are rejected

### Data Privacy
- Syncs only to your Google Sheet
- Service account has limited permissions
- No data sent to third parties

## Maintenance

### Disable Auto-Sync

To temporarily disable:
1. Rename `pb_hooks/auto_sync.pb.js` to `pb_hooks/auto_sync.pb.js.disabled`
2. Restart PocketBase

### Re-enable Auto-Sync

1. Rename back to `pb_hooks/auto_sync.pb.js`
2. Restart PocketBase

### Update Sync Logic

Edit `backend/src/routes/sync.ts` to customize:
- Which fields to sync
- Which collections to sync
- Sync behavior

## Advanced

### Add More Collections

To auto-sync additional collections:

1. **Add hook in `pb_hooks/auto_sync.pb.js`**:
```javascript
onRecordAfterCreateRequest((e) => {
  if (e.collection.name === "your_collection") {
    triggerSync("your_collection", "create", e.record.id);
  }
}, "your_collection");
```

2. **Add sync logic in `backend/src/routes/sync.ts`**:
```typescript
else if (collection === "your_collection") {
  await syncYourCollection(recordId);
}
```

3. **Restart services**

### Custom Sync Intervals

For batch syncing instead of real-time:
- Remove immediate hooks
- Add cron job to run `npm run sync-to-sheets` periodically

## Summary

✅ **Automatic syncing is now enabled!**
✅ **Changes in PocketBase → Instantly appear in Google Sheets**
✅ **No manual commands needed**
✅ **Just restart services to activate**

---

**Last Updated**: 2026-05-21  
**Version**: 1.0.0  
**Status**: ✅ Ready to Use
