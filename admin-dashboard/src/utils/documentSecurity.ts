export interface DocumentSecurityData {
  documentId: string;
  documentType: 'Official Academic Transcript' | 'Tuition Fee Invoice' | 'Payment Receipt' | 'Digital Student ID' | 'Admissions Offer Letter' | 'Exam Seating Pass' | 'Library Clearance Certificate' | 'Degree Diploma';
  studentId: string;
  studentName: string;
  issueDate: string;
  payload: Record<string, any>;
}

export async function generateDocumentHash(data: DocumentSecurityData): Promise<string> {
  try {
    const token = sessionStorage.getItem('bmi_ums_auth_token');
    if (!token) throw new Error('Authentication required for document signing');

    const response = await fetch('/api/documents/sign', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        data: {
          docId: data.documentId,
          type: data.documentType,
          sId: data.studentId,
          sName: data.studentName,
          date: data.issueDate,
          payload: data.payload
        } 
      }),
    });

    if (!response.ok) throw new Error('Failed to sign document server-side');
    const result = await response.json();
    return result.signature;
  } catch (err) {
    console.error('Document signing failed, falling back to insecure client-side hash:', err);
    // Insecure fallback (keeping it for dev/offline but with a warning)
    const serialized = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < serialized.length; i++) {
      const char = serialized.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `INSECURE-${Math.abs(hash).toString(16).padStart(16, '0')}`;
  }
}

export function formatSecurityHash(hash: string): string {
  if (!hash) return 'SEC-0000-0000-0000-0000';
  const clean = hash.toUpperCase();
  return `${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}`;
}

export function getVerificationUrl(docId: string, hash: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bmi.university';
  return `${origin}/verify?doc=${encodeURIComponent(docId)}&hash=${encodeURIComponent(hash.slice(0, 16))}`;
}
