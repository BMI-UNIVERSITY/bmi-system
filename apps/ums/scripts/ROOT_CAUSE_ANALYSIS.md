# Root Cause Analysis: Authentication Loop Issue

## Problem
The import scripts were repeatedly failing with "Failed to authenticate" error, even after creating the admin user successfully.

## Root Cause
**PocketBase API Version Mismatch**

The scripts were using the **OLD PocketBase API** (pre-0.22):
```typescript
await pb.admins.authWithPassword(email, password);
```

But the installed PocketBase version (0.25.0) uses the **NEW API** (0.22+):
```typescript
await pb.collection('_superusers').authWithPassword(email, password);
```

## Evidence
Looking at `backend/src/services/pocketbase.ts`, the existing codebase already uses the correct new API:

```typescript
// Authenticate as superuser (PocketBase 0.22+ API)
export async function authenticateAdmin(): Promise<void> {
  const pb = getPocketBase();
  try {
    // Use _superusers collection (PocketBase 0.22+)
    await pb.collection('_superusers').authWithPassword(
      CONFIG.POCKETBASE_ADMIN_EMAIL,
      CONFIG.POCKETBASE_ADMIN_PASSWORD
    );
    logger.info('PocketBase admin authenticated');
  } catch (error) {
    logger.error('Failed to authenticate PocketBase admin:', error);
    throw new Error('PocketBase authentication failed');
  }
}
```

## Solution
Updated all import scripts to use the new API:

### Files Fixed:
1. ✅ `backend/scripts/clear-students.ts`
2. ✅ `backend/scripts/import-transcript-data.ts`
3. ✅ `backend/scripts/test-auth.ts`

### Change Applied:
```diff
- await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
+ await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
```

## Why This Happened
The import scripts were newly created and didn't follow the existing authentication pattern used in the main codebase. The old `pb.admins` API was deprecated in PocketBase 0.22, but the scripts were written using outdated documentation or examples.

## Prevention
- Always check existing codebase patterns before implementing new features
- Reference the actual PocketBase version in use (0.25.0 in package.json)
- Use the existing service layer (`backend/src/services/pocketbase.ts`) as a reference

## Testing
Run the test script to verify authentication works:
```bash
chmod +x scripts/test-auth.sh
bash scripts/test-auth.sh
```

Then run the import:
```bash
bash scripts/fresh-import.sh
```

## PocketBase API Changes (0.22+)

### Old API (Deprecated):
- `pb.admins.authWithPassword(email, password)`
- `pb.admins.authRefresh()`
- Returns: `{ token, admin }`

### New API (Current):
- `pb.collection('_superusers').authWithPassword(email, password)`
- `pb.collection('_superusers').authRefresh()`
- Returns: `{ token, record }`

The `_superusers` collection is a special system collection that replaced the old `admins` endpoint.
