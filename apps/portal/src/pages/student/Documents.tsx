import { useState } from 'react';
import { api } from '../../lib/api';

export default function Documents() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('File must be less than 10MB');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await api.student.uploadDocument(docType, file);
      setSuccess(`Successfully uploaded ${docType.replace('_', ' ')}`);
      // Reload page to update layout state or dashboard checklist state
      setTimeout(() => window.location.href = '/student/dashboard', 1500);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to upload document');
    } finally {
      setLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="page" style={{ padding: '5rem 1.5rem 3rem', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', marginBottom: '1rem' }}>My Documents</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Manage your student profile documents.
        </p>

        {error && (
          <div style={{ padding: '1rem', background: 'var(--danger-light, #fee2e2)', color: 'var(--danger)', borderRadius: '6px', marginBottom: '1.5rem', border: '1px solid var(--danger)' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ padding: '1rem', background: 'var(--success-light, #dcfce7)', color: 'var(--success)', borderRadius: '6px', marginBottom: '1.5rem', border: '1px solid var(--success)' }}>
            {success}
          </div>
        )}

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Student ID Photo</h2>
          <p style={{ color: 'var(--slate)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            Please upload a clear, recent photo of yourself for your Student ID card. This must be a passport-style photo with a plain background.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <label className="btn btn-primary" style={{ cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Uploading...' : 'Choose File'}
              <input 
                type="file" 
                accept="image/jpeg,image/png,image/webp" 
                style={{ display: 'none' }}
                disabled={loading}
                onChange={(e) => handleUpload(e, 'id_document')}
              />
            </label>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>JPEG, PNG, or WebP. Max 10MB.</span>
          </div>
        </div>

      </div>
    </div>
  );
}
