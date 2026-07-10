
# BMI Document Handling Guide
## Last Updated: 2026-07-11

---

## Overview
This document outlines best practices for handling student and applicant documents in the BMI system, ensuring data security, privacy compliance, and efficient use of Cloudflare free-tier resources.

---

## 1. Data Privacy & Security Guidelines
### 1.1 Access Control
- **Role-Based Access**: Only Admin and Staff users can access documents. Applicants/Students can only access their own documents.
- **Audit Trails**: Every document view and download is logged in `admin_audit_logs` for compliance.
- **No Public Links**: Documents are never exposed through public URLs; they are only served through authenticated API endpoints.

### 1.2 Sensitive Documents
- Mark documents containing PII (e.g., transcripts, ID cards) as sensitive using the `is_sensitive` flag.
- Sensitive documents should be viewed inline in the browser rather than downloaded when possible.
- Avoid storing sensitive documents locally on personal devices.

### 1.3 Data Retention
- Default retention period: 5 years from upload date.
- After retention period, documents are automatically archived to backup storage and then purged.
- Archiving process is handled via scheduled Cloudflare Worker jobs.

---

## 2. Cloudflare Free-Tier Optimization
### 2.1 Storage Limits (R2)
- **Free Limit**: 10 GB total storage
- **Usage Monitoring**: Check the System Health dashboard for current storage usage (in MB and % of limit).
- **Optimization Tips**:
  - Images are automatically compressed on upload to reduce file size.
  - Encourage applicants to upload compressed documents.
  - Archive old documents regularly.

### 2.2 Request/Operation Limits
- **Class A Operations (Write/Delete)**: 1,000,000/month
- **Class B Operations (Read/List)**: 10,000,000/month
- **Optimization Tips**:
  - Documents are cached in the browser for 5 minutes (Cache-Control: private, max-age=300) to reduce duplicate reads.
  - Use pagination when listing documents.

---

## 3. Admin Standard Operating Procedures (SOPs)
### 3.1 Viewing Documents
1. Navigate to the **Document Registry** in the Admin portal.
2. Use search/filters to locate the desired document.
3. Click the **View** button (eye icon) to open documents inline (PDFs and images).
4. Avoid downloading documents unless absolutely necessary (for compliance and to save local storage).

### 3.2 Downloading Documents
1. Only download documents when required for official business (e.g., printing, offline review).
2. Delete local copies after use (to maintain data security).
3. All downloads are logged for audit purposes.

### 3.3 Uploading Documents (Admin-Assisted)
1. If an applicant is unable to upload a document, use the admin upload functionality.
2. Select the correct document type and verify the file format before uploading.
3. Ensure file size is under 10 MB (system-enforced limit).

### 3.4 Deleting Documents
1. Only delete documents that are no longer needed for business or compliance purposes.
2. Deleting a document removes it both from the database and R2 storage.
3. Deletions are permanent (unless you restore from backup within 30 days).

### 3.5 Monitoring Usage
1. Check the **System Health** page regularly for R2 storage usage alerts.
2. If usage exceeds 80%:
   - Archive old documents manually
   - Encourage applicants to upload compressed files
   - Consider upgrading to a paid Cloudflare plan if needed

---

## 4. Technical Details (For Developers/IT Admins)
### 4.1 Document Storage Architecture
- **Database**: D1 (SQLite) stores document metadata (filename, mime type, size, upload date, R2 key, etc.).
- **File Storage**: Cloudflare R2 stores the actual file blobs (no public access).
- **Delivery**: Documents are served through API endpoints that check authentication before returning the file.

### 4.2 Scheduled Jobs
- **Backup Job**: Runs daily to backup the database to R2.
- **Archival Job**: Runs daily to archive old records (including documents) and purge expired data.

### 4.3 API Endpoints for Documents
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/documents/:id/download` | GET | Download/view a document (requires auth) |
| `/api/documents/upload` | POST | Upload a new document (requires auth) |
| `/api/admin/documents` | GET | List all documents (admin/staff only) |
| `/api/admin/documents/:id` | DELETE | Delete a document (admin only) |

---

## 5. Compliance
### 5.1 GDPR
- All document accesses are logged (who accessed, when, what document).
- Data subjects (students/applicants) can request access to or deletion of their documents.

### 5.2 FERPA (U.S. Students)
- Student education records are protected; ensure proper authorization before accessing.

---

## 6. Troubleshooting
### 6.1 Documents Won't Preview Inline
- Check if the file format is supported: PDF, JPEG, PNG, WebP, GIF.
- Try downloading the file instead.

### 6.2 Storage Limit Warning
- Go to the System Health page to check current usage.
- Archive old documents, or request applicants to re-upload compressed versions of large files.

---

## 7. Changelog
- **2026-07-11**: Initial version, added compression, archiving, and usage monitoring.
