import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import type { Application, RecommendationRequest, StatusLogEntry } from '../lib/api';

const STATUS_STEPS: Record<string, { label: string; icon: string; pct: number }> = {
  draft: { label: 'Draft', icon: '📝', pct: 10 },
  submitted: { label: 'Submitted', icon: '📬', pct: 30 },
  under_review: { label: 'Under Review', icon: '🔍', pct: 60 },
  accepted: { label: 'Accepted', icon: '🎉', pct: 100 },
  rejected: { label: 'Decision Made', icon: '📋', pct: 100 },
  waitlisted: { label: 'Waitlisted', icon: '⏳', pct: 80 },
};

const DOC_TYPES = ['transcript', 'id_document', 'other'];

export default function Status() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [app, setApp] = useState<Application | null>(null);
  const [recs, setRecs] = useState<RecommendationRequest[]>([]);
  const [logs, setLogs] = useState<StatusLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [uploadStatus, setUploadStatus] = useState<Record<string, string>>({});
  const [docType, setDocType] = useState('transcript');
  const fileRef = useRef<HTMLInputElement>(null);

  const [recName, setRecName] = useState('');
  const [recEmail, setRecEmail] = useState('');
  const [recLoading, setRecLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const appData = await api.applications.getMyApplication();
      setApp(appData);
      if (appData) {
        const [recData, logData] = await Promise.all([
          api.recommendations.list(appData.id),
          api.applications.getStatusLogs(appData.id).catch(() => [] as StatusLogEntry[]),
        ]);
        setRecs(recData);
        setLogs(logData);
      }
    } catch {
      setApp(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const id = setInterval(loadData, 30000);
    return () => clearInterval(id);
  }, [loadData]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !app) return;
    if (file.size > 10 * 1024 * 1024) {
      setUploadStatus(s => ({ ...s, [docType]: 'File is too large (max 10 MB)' }));
      return;
    }
    setUploadStatus(s => ({ ...s, [docType]: 'uploading' }));
    try {
      const result: any = await api.documents.upload(app.id, docType, file);
      if (result.success) {
        setUploadStatus(s => ({ ...s, [docType]: 'done' }));
        loadData();
      } else {
        setUploadStatus(s => ({ ...s, [docType]: result.error || 'Upload failed' }));
      }
    } catch (err: unknown) {
      setUploadStatus(s => ({ ...s, [docType]: err instanceof Error ? err.message : 'Upload failed' }));
    }
  };

  const handleRequestRec = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!app) return;
    setRecLoading(true);
    setError('');
    try {
      await api.recommendations.request(app.id, recName, recEmail);
      setRecName('');
      setRecEmail('');
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to request recommendation');
    } finally {
      setRecLoading(false);
    }
  };

  const statusInfo = app ? STATUS_STEPS[app.status] ?? STATUS_STEPS.submitted : null;

  if (loading) return (
    <div className="page-center">
      <div className="spinner" style={{ width: 40, height: 40 }} />
    </div>
  );

  return (
    <div className="page" style={{ padding: '5rem 1.5rem 3rem', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 900, marginBottom: '0.5rem' }}>
          My Application
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem' }}>Welcome back, {user?.first_name}. Page auto-refreshes every 30 seconds.</p>

        {params.get('submitted') && (
          <div className="alert alert-success" style={{ marginBottom: '2rem' }} role="alert">
            🎉 Your application has been successfully submitted! Check your email for a confirmation. Our admissions team will review it within 5–10 business days.
          </div>
        )}

        {error && <div className="alert alert-danger" style={{ marginBottom: '2rem' }} role="alert">{error}</div>}

        {!app ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
            <h2 style={{ marginBottom: '0.5rem' }}>No Application Found</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>You haven't submitted an application yet.</p>
            <a href="/apply" className="btn btn-gold">Start Application →</a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ marginBottom: '0.25rem' }}>{app.program}</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'capitalize' }}>{app.degree_level} Program</p>
                </div>
                <div>
                  <span className={`badge badge-${app.status}`} style={{ fontSize: '0.85rem' }}>
                    {statusInfo?.icon} {statusInfo?.label}
                  </span>
                </div>
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <div style={{ background: 'var(--border)', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                  <div style={{ width: `${statusInfo?.pct ?? 0}%`, background: app.status === 'accepted' ? 'var(--success)' : app.status === 'rejected' ? 'var(--danger)' : 'var(--gold)', height: '100%', borderRadius: 999, transition: 'width 0.8s ease' }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {['Submitted', 'Under Review', 'Decision'].map((label) => (
                  <span key={label} style={{ fontSize: '0.75rem', color: 'var(--slate)', fontWeight: 500 }}>{label}</span>
                ))}
              </div>
            </div>

            {logs.length > 0 && (
              <div className="card">
                <h3 style={{ marginBottom: '1rem' }}>Activity Timeline</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {logs.map((log, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', marginTop: '0.5rem', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>
                          {new Date(log.changed_at).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, textTransform: 'capitalize' }}>
                          {log.old_status ? `${log.old_status.replace('_', ' ')} → ` : ''}{log.new_status.replace('_', ' ')}
                        </div>
                        {log.notes && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{log.notes}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card">
              <h3 style={{ marginBottom: '0.25rem' }}>Letters of Recommendation</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Enter the contact information of your referee. They will receive a secure link to upload their recommendation letter (link expires after 30 days). Maximum 3 referees.
              </p>
              
              {recs.length < 3 && (
                <form onSubmit={handleRequestRec} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
                    <label className="form-label" htmlFor="rec-name">Referee Name</label>
                    <input id="rec-name" className="form-input" required value={recName} onChange={e => setRecName(e.target.value)} placeholder="Dr. Jane Smith" />
                  </div>
                  <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
                    <label className="form-label" htmlFor="rec-email">Referee Email</label>
                    <input id="rec-email" className="form-input" type="email" required value={recEmail} onChange={e => setRecEmail(e.target.value)} placeholder="jane.smith@example.com" />
                  </div>
                  <button type="submit" className="btn btn-navy" disabled={recLoading}>
                    {recLoading ? 'Sending...' : 'Send Request'}
                  </button>
                </form>
              )}
              {recs.length >= 3 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>Maximum of 3 recommendation requests reached.</p>
              )}

              {recs.length > 0 && (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead><tr><th>Referee</th><th>Status</th><th>Requested</th></tr></thead>
                    <tbody>
                      {recs.map(r => (
                        <tr key={r.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{r.referee_name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.referee_email}</div>
                          </td>
                          <td>
                            <span className={`badge ${r.status === 'submitted' ? 'badge-accepted' : 'badge-under_review'}`}>
                              {r.status}
                            </span>
                          </td>
                          <td>{new Date(r.requested_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {app.status !== 'rejected' && (
              <div className="card">
                <h3 style={{ marginBottom: '0.25rem' }}>Supporting Documents</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                  Upload your transcripts and ID documents. Accepted formats: PDF, JPEG, PNG, Word. Max 10 MB. Max 20 documents per application.
                </p>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <label htmlFor="doc-type-select" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>Document type</label>
                  <select id="doc-type-select" className="form-select" style={{ width: 'auto' }} value={docType} onChange={e => setDocType(e.target.value)}>
                    {DOC_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                  </select>
                  <button className="btn btn-outline" onClick={() => fileRef.current?.click()} aria-label="Upload document">
                    📎 Upload Document
                  </button>
                  <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={handleUpload} style={{ display: 'none' }} aria-hidden="true" />
                  {uploadStatus[docType] && (
                    <span className={`alert ${uploadStatus[docType] === 'done' ? 'alert-success' : uploadStatus[docType] === 'uploading' ? 'alert-info' : 'alert-danger'}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} role="status">
                      {uploadStatus[docType] === 'uploading' ? '⏳ Uploading...' : uploadStatus[docType] === 'done' ? '✓ Uploaded!' : uploadStatus[docType]}
                    </span>
                  )}
                </div>
                {app.documents && app.documents.length > 0 ? (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead><tr><th>Document Type</th><th>File Name</th><th>Uploaded</th></tr></thead>
                      <tbody>
                        {app.documents.map(d => (
                          <tr key={d.id}>
                            <td><span className={`badge ${d.doc_type === 'recommendation' ? 'badge-waitlisted' : 'badge-submitted'}`}>{d.doc_type.replace('_', ' ')}</span></td>
                            <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.file_name}</td>
                            <td>{new Date(d.uploaded_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: 'var(--slate)', fontSize: '0.875rem' }}>No documents uploaded yet.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
