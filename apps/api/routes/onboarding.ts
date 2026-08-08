import { ok, error } from '../lib/types';
import type { Env } from '../lib/types';
import { createCoreDb } from '../lib/db';
import { documents, applications, invoices } from '../schema/core';
import { enrollments, studentHolds } from '../schema/academic';
import { eq, and } from 'drizzle-orm';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function handleGetOnboardingStatus(_request: Request, env: Env, userId: string): Promise<Response> {
  const db = createCoreDb(env);

  // Check if they uploaded an ID document
  const idDoc = (await db.select({ id: documents.id })
    .from(documents)
    .where(and(eq(documents.user_id, userId), eq(documents.doc_type, 'id_document')))
    .limit(1)
    .execute())[0];
  const hasUploadedID = !!idDoc;

  // Check if they have enrolled in any class
  const enrollment = (await db.select({ id: enrollments.id })
    .from(enrollments)
    .where(eq(enrollments.student_id, userId))
    .limit(1)
    .execute())[0];
  const hasRegisteredClasses = !!enrollment;

  // Check if they have paid at least one invoice
  const invoice = (await db.select({ id: invoices.id })
    .from(invoices)
    .where(and(eq(invoices.student_id, userId), eq(invoices.status, 'paid')))
    .limit(1)
    .execute())[0];
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

  const db = createCoreDb(env);

  const app = (await db.select({ id: applications.id })
    .from(applications)
    .where(eq(applications.user_id, userId))
    .limit(1)
    .execute())[0];

  let applicationId = app?.id;
  if (!applicationId) {
    applicationId = `STUDENT-PROFILE-${userId}`;
    await db.insert(applications).values({
      id: applicationId,
      user_id: userId,
      status: 'draft',
      program: 'General',
      degree_level: 'undergraduate',
    }).onConflictDoNothing();
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
  await db.insert(documents).values({
    id: docId,
    application_id: applicationId,
    user_id: userId,
    doc_type: docType,
    file_name: safeFileName,
    r2_key: r2Key,
    mime_type: detectedMime,
    file_size_bytes: file.size,
  });

  if (docType === 'id_document') {
    await db.update(studentHolds)
      .set({ is_active: 0, resolved_at: new Date() })
      .where(and(
        eq(studentHolds.student_id, userId),
        eq(studentHolds.hold_type, 'document'),
        eq(studentHolds.is_active, 1)
      ));
  }

  return ok({ document_id: docId, file_name: safeFileName, doc_type: docType });
}
