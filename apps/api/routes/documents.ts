import { ok, error, logAdminAction } from '../lib/types';
import type { Env } from '../lib/types';
import { parseDocumentUploadQuery } from '../lib/schemas';
import { compressImage } from '../lib/compress-image';

function paginate(url: URL) {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const perPage = Math.min(100, parseInt(url.searchParams.get('perPage') || '20'));
  return { page, perPage, offset: (page - 1) * perPage };
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES_PER_APP = 20;

const MAGIC_BYTES: Record<string, Uint8Array[]> = {
  'application/pdf': [new Uint8Array([0x25, 0x50, 0x44, 0x46])],
  'image/jpeg': [new Uint8Array([0xFF, 0xD8, 0xFF])],
  'image/png': [new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])],
  'image/webp': [new Uint8Array([0x52, 0x49, 0x46, 0x46])],
  'application/msword': [new Uint8Array([0xD0, 0xCF, 0x11, 0xE0])],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    new Uint8Array([0x50, 0x4B, 0x03, 0x04]),
    new Uint8Array([0x50, 0x4B, 0x05, 0x06]),
    new Uint8Array([0x50, 0x4B, 0x07, 0x08]),
  ],
};

function detectMimeType(bytes: Uint8Array): string | null {
  for (const [mime, signatures] of Object.entries(MAGIC_BYTES)) {
    for (const sig of signatures) {
      if (bytes.length >= sig.length && sig.every((b, i) => bytes[i] === b)) {
        return mime;
      }
    }
  }
  return null;
}

export async function handleUploadDocument(request: Request, env: Env, userId: string): Promise<Response> {
  const url = new URL(request.url);
  const queryParsed = parseDocumentUploadQuery(url);
  if (queryParsed instanceof Response) return queryParsed;
  const { application_id: applicationId, doc_type: docType } = queryParsed;

  const app = await env.PLATFORM_CONTEXT!.db.prepare('SELECT id, user_id FROM applications WHERE id = ? AND user_id = ?')
    .bind(applicationId, userId).first();
  if (!app) return error('Application not found or access denied', 404);

  const docCount = await env.PLATFORM_CONTEXT!.db.prepare(
    'SELECT COUNT(*) as count FROM documents WHERE application_id = ?'
  ).bind(applicationId).first<{ count: number }>();

  if (docCount && docCount.count >= MAX_FILES_PER_APP) {
    return error(`Maximum of ${MAX_FILES_PER_APP} documents per application reached`, 400);
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) return error('No file provided');
  if (file.size > MAX_FILE_SIZE) return error('File too large. Maximum size is 10 MB.');
  if (file.size === 0) return error('File is empty');

  let fileBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(fileBuffer.slice(0, 12));
  const detectedMime = detectMimeType(bytes);

  if (!detectedMime) {
    return error('File type could not be verified. Please upload a PDF, JPEG, PNG, or Word document.', 400);
  }

  // Compress images to save Cloudflare R2 storage/bandwidth
  let compressedBuffer = Buffer.from(fileBuffer);
  if (['image/jpeg', 'image/png'].includes(detectedMime)) {
    compressedBuffer = await compressImage(compressedBuffer, detectedMime);
  }

  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 200);

  const ext = safeFileName.split('.').pop()?.toLowerCase() || 'bin';
  const allowedExts = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'doc', 'docx'];
  if (!allowedExts.includes(ext)) {
    return error('File extension not allowed');
  }

  const r2Key = `documents/${userId}/${applicationId}/${docType}-${crypto.randomUUID()}.${ext}`;

  await env.PLATFORM_CONTEXT!.storage.upload({
    key: r2Key,
    data: compressedBuffer,
    mimeType: detectedMime,
    metadata: { userId, applicationId, docType, originalName: safeFileName },
  });

  const docId = crypto.randomUUID();
  await env.PLATFORM_CONTEXT!.db.prepare(
    `INSERT INTO documents (id, application_id, user_id, doc_type, file_name, r2_key, mime_type, file_size_bytes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(docId, applicationId, userId, docType, safeFileName, r2Key, detectedMime, compressedBuffer.length).run();

  return ok({ document_id: docId, file_name: safeFileName, doc_type: docType });
}

/**
 * Serve a document to an authenticated user (or admin/staff).
 *
 * Security & Privacy:
 *  - Auth gate: only the owning user OR staff/admin may access.
 *  - All accesses are recorded in admin_audit_logs (GDPR access trail).
 *  - Content is served directly from R2 through the Worker — the R2 bucket
 *    itself has no public access, so there is no URL to guess or share.
 *  - Cache-Control: private prevents CDN/proxy caching; max-age=300 lets
 *    the *browser* cache the response so repeated opens in the same tab
 *    don't re-hit R2 (saves free-tier Class B operations).
 *
 * Viewing strategy (free-tier optimised):
 *  - PDFs and images → Content-Disposition: inline  (browser opens inline)
 *  - Word/other      → Content-Disposition: attachment (force download)
 *  This avoids needing R2 presigned URLs (which require additional API
 *  credentials) while still letting admins view files without saving them.
 */
export async function handleDownloadDocument(
  request: Request,
  env: Env,
  docId: string,
  userId: string,
  userRole: string
): Promise<Response> {
  const doc = await env.PLATFORM_CONTEXT!.db.prepare(
    'SELECT id, user_id, r2_key, file_name, mime_type FROM documents WHERE id = ?'
  ).bind(docId).first<{ id: string; user_id: string; r2_key: string; file_name: string; mime_type: string }>();

  if (!doc) return error('Document not found', 404);

  // Auth gate: owner OR admin/staff only
  const isAdminOrStaff = ['staff', 'admin'].includes(userRole);
  if (!isAdminOrStaff && doc.user_id !== userId) {
    return error('Access denied', 403);
  }

  const buffer = await env.PLATFORM_CONTEXT!.storage.download(doc.r2_key);
  if (!buffer) return error('File not found in storage', 404);

  // Inline-viewable MIME types — browser renders these natively
  const INLINE_TYPES = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ]);

  const disposition = INLINE_TYPES.has(doc.mime_type)
    ? `inline; filename="${doc.file_name}"`          // opens in browser tab
    : `attachment; filename="${doc.file_name}"`;      // forces download

  // Increment document view count
  // Fire-and-forget
  env.PLATFORM_CONTEXT!.db.prepare(
    `UPDATE documents SET view_count = view_count + 1 WHERE id = ?`
  ).bind(docId).run().catch(e => console.error('View count increment failed:', e));

  // Audit: log every document access for GDPR compliance trail
  // Fire-and-forget — don't await so it doesn't slow the response
  env.PLATFORM_CONTEXT!.db.prepare(
    `INSERT INTO admin_audit_logs (id, user_id, action, target_type, target_id, details, ip_address, user_agent)
     VALUES (?, ?, 'view_document', 'document', ?, ?, ?, ?)`
  ).bind(
    crypto.randomUUID(),
    userId,
    docId,
    JSON.stringify({ file_name: doc.file_name, mime_type: doc.mime_type, viewer_role: userRole }),
    request.headers.get('CF-Connecting-IP') || null,
    request.headers.get('User-Agent') || null
  ).run().catch(e => console.error('Audit log write failed:', e));

  return new Response(buffer, {
    headers: {
      'Content-Type': doc.mime_type,
      'Content-Disposition': disposition,
      // Private: browser may cache, CDN/proxies must not
      // 5-minute TTL keeps R2 reads low without staling the data
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
      // Prevent document from embedding our portal in an iframe
      'X-Frame-Options': 'DENY',
      // Restricts what the opened document page can do
      'Content-Security-Policy': "default-src 'none'; object-src 'none'",
    },
  });
}


export async function handleDeleteDocument(
  request: Request,
  env: Env,
  docId: string,
  adminId: string
): Promise<Response> {
  const doc = await env.PLATFORM_CONTEXT!.db.prepare('SELECT r2_key, file_name FROM documents WHERE id = ?')
    .bind(docId).first<{ r2_key: string; file_name: string }>();

  if (!doc) return error('Document not found', 404);

  await env.PLATFORM_CONTEXT!.storage.delete(doc.r2_key);
  await env.PLATFORM_CONTEXT!.db.prepare('DELETE FROM documents WHERE id = ?').bind(docId).run();

  await logAdminAction(env, adminId, 'delete_document', 'document', docId, { file_name: doc.file_name }, request);

  return ok({ deleted: true });
}

export async function handleListDocuments(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const { page, perPage, offset } = paginate(url);

  const userId = url.searchParams.get('user_id');
  const applicationId = url.searchParams.get('application_id');
  const docType = url.searchParams.get('doc_type');

  const whereClauses: string[] = [];
  const bindings: unknown[] = [];

  if (userId) {
    whereClauses.push('d.user_id = ?');
    bindings.push(userId);
  }
  if (applicationId) {
    whereClauses.push('d.application_id = ?');
    bindings.push(applicationId);
  }
  if (docType) {
    whereClauses.push('d.doc_type = ?');
    bindings.push(docType);
  }

  const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countRow = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT COUNT(*) as total FROM documents d ${where}`
  ).bind(...bindings).first<{ total: number }>();

  const docs = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT d.*, u.email as user_email, u.first_name, u.last_name
     FROM documents d
     JOIN users u ON d.user_id = u.id
     ${where}
     ORDER BY d.uploaded_at DESC
     LIMIT ? OFFSET ?`
  ).bind(...bindings, perPage, offset).all();

  return ok({
    items: docs.results,
    page,
    perPage,
    total: countRow?.total ?? 0
  });
}
