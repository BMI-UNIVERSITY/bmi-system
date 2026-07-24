
import { ok, error } from '../lib/types';
import type { Env } from '../lib/types';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function handleGetOnboardingStatus(_request: Request, env: Env, userId: string): Promise<Response> {
  // Check if they uploaded an ID document
  const idDoc = await env.PLATFORM_CONTEXT!.db.prepare(
    'SELECT id FROM documents WHERE user_id = ? AND doc_type = ?'
  ).bind(userId, 'id_document').first();
  const hasUploadedID = !!idDoc;

  // Check if they have enrolled in any class
  const enrollment = await env.PLATFORM_CONTEXT!.db.prepare(
    'SELECT id FROM enrollments WHERE student_id = ?'
  ).bind(userId).first();
  const hasRegisteredClasses = !!enrollment;

  // Check if they have paid at least one invoice
  const invoice = await env.PLATFORM_CONTEXT!.db.prepare(
    'SELECT id FROM invoices WHERE student_id = ? AND status = ?'
  ).bind(userId, 'paid').first();
  const hasPaidInvoice = !!invoice;

  const tasks = [
    {
      id: 'upload_id',
      title: 'Upload Student ID Photo',
      completed: hasUploadedID,
      locked: false,
      actionUrl: '/student/documents'
    },
    {
      id: 'register_classes',
      title: 'Register for Classes',
      completed: hasRegisteredClasses,
      locked: !hasUploadedID, // Locked until ID is uploaded
      actionUrl: '/student/academics'
    },
    {
      id: 'pay_invoice',
      title: 'Pay Initial Tuition & Fees',
      completed: hasPaidInvoice,
      locked: !hasRegisteredClasses, // Locked until classes are registered
      actionUrl: '/student/finances'
    }
  ];

  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;

  return ok({
    tasks,
    progress: Math.round((completed / total) * 100),
    isComplete: completed === total
  });
}

const MAGIC_BYTES: Record<string, Uint8Array[]> = {
  'application/pdf': [new Uint8Array([0x25, 0x50, 0x44, 0x46])],
  'image/jpeg': [new Uint8Array([0xFF, 0xD8, 0xFF])],
  'image/png': [new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])],
};

function detectMimeType(bytes: Uint8Array): string | null {
  for (const [mime, signatures] of Object.entries(MAGIC_BYTES)) {
    for (const sig of signatures) {
      if (bytes.length >= sig.length && sig.every((b, i) => bytes[i] === b)) return mime;
    }
  }
  return null;
}

export async function handleUploadStudentDocument(request: Request, env: Env, userId: string): Promise<Response> {
  const url = new URL(request.url);
  const docType = url.searchParams.get('doc_type');
  if (!docType) return error('doc_type is required', 400);

  const app = await env.PLATFORM_CONTEXT!.db.prepare('SELECT id FROM applications WHERE user_id = ?').bind(userId).first<{id: string}>();
  let applicationId = app?.id;
  if (!applicationId) {
    applicationId = `STUDENT-PROFILE-${userId}`;
    // Insert a minimal application to satisfy foreign key constraint
    await env.PLATFORM_CONTEXT!.db.prepare(
      `INSERT OR IGNORE INTO applications (id, user_id, status, program, degree_level) VALUES (?, ?, 'draft', 'General', 'undergraduate')`
    ).bind(applicationId, userId).run();
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) return error('No file provided', 400);
  if (file.size > MAX_FILE_SIZE) return error('File too large', 400);

  const fileBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(fileBuffer.slice(0, 12));
  const detectedMime = detectMimeType(bytes);

  if (!detectedMime) return error('File type not allowed', 400);

  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 200);
  const ext = safeFileName.split('.').pop()?.toLowerCase() || 'bin';
  
  const r2Key = `documents/${userId}/profile/${docType}-${crypto.randomUUID()}.${ext}`;

  await env.PLATFORM_CONTEXT!.storage.upload({
    key: r2Key,
    data: Buffer.from(fileBuffer),
    mimeType: detectedMime,
    metadata: { userId, applicationId, docType, originalName: safeFileName },
  });

  const docId = crypto.randomUUID();
  await env.PLATFORM_CONTEXT!.db.prepare(
    `INSERT INTO documents (id, application_id, user_id, doc_type, file_name, r2_key, mime_type, file_size_bytes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(docId, applicationId, userId, docType, safeFileName, r2Key, detectedMime, file.size).run();

  if (docType === 'id_document') {
    await env.PLATFORM_CONTEXT!.db.prepare(
      `UPDATE student_holds SET is_active = 0, resolved_at = datetime('now')
       WHERE student_id = ? AND hold_type = 'document' AND is_active = 1`
    ).bind(userId).run();
  }

  return ok({ document_id: docId, file_name: safeFileName, doc_type: docType });
}
