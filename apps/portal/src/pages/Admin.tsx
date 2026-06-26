import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { Application, StatusLogEntry, DocumentMeta, AuditLog } from '../lib/api';

const STATUS_COLORS: Record<string, string> = {
  submitted: 'badge-submitted',
  under_review: 'badge-under_review',
  accepted: 'badge-accepted',
  rejected: 'badge-rejected',
  waitlisted: 'badge-waitlisted',
};

const NEXT_STATUSES: Record<string, string[]> = {
  submitted: ['under_review', 'rejected'],
  under_review: ['accepted', 'rejected', 'waitlisted'],
  waitlisted: ['accepted', 'rejected'],
  accepted: [],
  rejected: [],
};

const ROLE_OPTIONS = ['applicant', 'student', 'staff', 'admin'];

export default function Admin() {
  const [tab, setTab] = useState<'applications' | 'users' | 'audit-logs'>('applications');

  return (
    <div className="page" style={{ padding: '5rem 1.5rem 3rem', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 900 }}>Admin Dashboard</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Manage applications, users, and security audit logs.</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }} role="tablist">
          <button onClick={() => setTab('applications')} className={`btn btn-sm ${tab === 'applications' ? 'btn-navy' : 'btn-outline'}`} role="tab" aria-selected={tab === 'applications'}>Applications</button>
          <button onClick={() => setTab('users')} className={`btn btn-sm ${tab === 'users' ? 'btn-navy' : 'btn-outline'}`} role="tab" aria-selected={tab === 'users'}>Users</button>
          <button onClick={() => setTab('audit-logs')} className={`btn btn-sm ${tab === 'audit-logs' ? 'btn-navy' : 'btn-outline'}`} role="tab" aria-selected={tab === 'audit-logs'}>Audit Logs</button>
        </div>

        {tab === 'applications' && <ApplicationsTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'audit-logs' && <AuditLogsTab />}
      </div>
    </div>
  );
}

function ApplicationsTab() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<Application | null>(null);
  const [notes, setNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [alert, setAlert] = useState({ type: '', msg: '' });
  const [selectedLogs, setSelectedLogs] = useState<StatusLogEntry[]>([]);
  const [logModalApp, setLogModalApp] = useState<string | null>(null);
  const [detailApp, setDetailApp] = useState<Application | null>(null);

  const load = async (status?: string) => {
    setLoading(true);
    try {
      const data = await api.admin.listApplications(status ? { status } : {});
      setApps(data);
    } catch (e: unknown) {
      setAlert({ type: 'danger', msg: e instanceof Error ? e.message : 'Failed to load applications' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(filter || undefined); }, [filter]);

  const updateStatus = async (newStatus: string) => {
    if (!selected) return;
    setUpdating(true);
    try {
      await api.admin.updateStatus(selected.id, newStatus, notes);
      setAlert({ type: 'success', msg: `Application updated to "${newStatus}" successfully.` });
      setSelected(null);
      setNotes('');
      load(filter || undefined);
    } catch (e: unknown) {
      setAlert({ type: 'danger', msg: e instanceof Error ? e.message : 'Update failed' });
    } finally {
      setUpdating(false);
    }
  };

  const viewLogs = async (appId: string) => {
    try {
      const logData = await api.applications.getStatusLogs(appId);
      setSelectedLogs(logData);
      setLogModalApp(appId);
    } catch {
      setAlert({ type: 'danger', msg: 'Failed to load audit logs' });
    }
  };

  const viewDetail = async (appId: string) => {
    try {
      const app = await api.admin.getApplication(appId);
      setDetailApp(app);
    } catch (e: unknown) {
      setAlert({ type: 'danger', msg: e instanceof Error ? e.message : 'Failed to load application details' });
    }
  };

  const stats = {
    total: apps.length,
    submitted: apps.filter(a => a.status === 'submitted').length,
    under_review: apps.filter(a => a.status === 'under_review').length,
    accepted: apps.filter(a => a.status === 'accepted').length,
  };

  return (
    <>
      {alert.msg && (
        <div className={`alert alert-${alert.type}`} style={{ marginBottom: '1.5rem' }} role="alert">
          {alert.msg} <button onClick={() => setAlert({ type: '', msg: '' })} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }} aria-label="Dismiss">✕</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total', value: stats.total, color: 'var(--navy)' },
          { label: 'Awaiting Review', value: stats.submitted, color: 'var(--info)' },
          { label: 'Under Review', value: stats.under_review, color: 'var(--warning)' },
          { label: 'Accepted', value: stats.accepted, color: 'var(--success)' },
        ].map(s => (
          <div key={s.label} className="card card-sm" style={{ textAlign: 'center', borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: '2rem', fontFamily: 'var(--font-heading)', fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.25rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }} role="tablist" aria-label="Filter by status">
        {['', 'submitted', 'under_review', 'accepted', 'rejected', 'waitlisted'].map(s => (
          <button
            key={s || 'all'}
            onClick={() => setFilter(s)}
            className={`btn btn-sm ${filter === s ? 'btn-navy' : 'btn-outline'}`}
            style={{ textTransform: s ? 'capitalize' : undefined }}
            role="tab"
            aria-selected={filter === s}
          >
            {s ? s.replace('_', ' ') : 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" style={{ width: 36, height: 36 }} /></div>
      ) : apps.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No applications found.</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Program</th>
                <th>Level</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {apps.map(a => (
                <tr key={a.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{a.first_name} {a.last_name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{a.email}</div>
                  </td>
                  <td style={{ maxWidth: 200 }}><div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{a.program}</div></td>
                  <td style={{ textTransform: 'capitalize', fontSize: '0.875rem' }}>{a.degree_level}</td>
                  <td><span className={`badge ${STATUS_COLORS[a.status] || 'badge-draft'}`}>{a.status.replace('_', ' ')}</span></td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{a.submitted_at ? new Date(a.submitted_at).toLocaleDateString() : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button className="btn btn-sm btn-outline" onClick={() => viewDetail(a.id)} title="View details and documents">
                        View
                      </button>
                      <button className="btn btn-sm btn-outline" onClick={() => viewLogs(a.id)} title="View audit log">
                        📋 Log
                      </button>
                      {NEXT_STATUSES[a.status]?.length > 0 ? (
                        <button className="btn btn-sm btn-outline" onClick={() => { setSelected(a); setNotes(''); }}>
                          Update Status
                        </button>
                      ) : (
                        <span style={{ color: 'var(--slate)', fontSize: '0.8rem' }}>—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }} onClick={e => { if (e.target === e.currentTarget) setSelected(null); }} role="dialog" aria-modal="true" aria-label="Update application status">
          <div className="card" style={{ maxWidth: 480, width: '100%' }}>
            <h3 style={{ marginBottom: '0.25rem' }}>Update Application Status</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              {selected.first_name} {selected.last_name} — <strong>{selected.program}</strong>
            </p>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" htmlFor="admin-notes">Internal Notes (optional)</label>
              <textarea id="admin-notes" className="form-textarea" style={{ minHeight: 100 }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add notes for your records or to share with the applicant..." />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {NEXT_STATUSES[selected.status].map(status => (
                <button
                  key={status}
                  disabled={updating}
                  onClick={() => updateStatus(status)}
                  className={`btn btn-sm ${status === 'accepted' ? 'btn-gold' : status === 'rejected' ? 'btn-danger' : 'btn-navy'}`}
                  style={{ textTransform: 'capitalize' }}
                >
                  {status === 'accepted' ? '✓ Accept' : status === 'rejected' ? '✕ Reject' : status.replace('_', ' ')}
                </button>
              ))}
              <button className="btn btn-sm btn-outline" onClick={() => setSelected(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {logModalApp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }} onClick={e => { if (e.target === e.currentTarget) setLogModalApp(null); }} role="dialog" aria-modal="true" aria-label="Application audit log">
          <div className="card" style={{ maxWidth: 520, width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Audit Log</h3>
              <button onClick={() => setLogModalApp(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }} aria-label="Close">✕</button>
            </div>
            {selectedLogs.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No status changes recorded yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {selectedLogs.map((log, i) => (
                  <div key={i} style={{ padding: '0.75rem', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--slate)', marginBottom: '0.25rem' }}>
                      {new Date(log.changed_at).toLocaleString()} — by {log.changed_by_name}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', textTransform: 'capitalize' }}>
                      {log.old_status ? `${log.old_status.replace('_', ' ')} → ` : ''}{log.new_status.replace('_', ' ')}
                    </div>
                    {log.notes && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{log.notes}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {detailApp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }} onClick={e => { if (e.target === e.currentTarget) setDetailApp(null); }} role="dialog" aria-modal="true" aria-label="Application details">
          <div className="card" style={{ maxWidth: 640, width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ margin: 0 }}>{detailApp.first_name} {detailApp.last_name}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>{detailApp.email}</p>
              </div>
              <button onClick={() => setDetailApp(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }} aria-label="Close">✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <strong style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Program</strong>
                <span>{detailApp.program}</span>
              </div>
              <div>
                <strong style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Level</strong>
                <span style={{ textTransform: 'capitalize' }}>{detailApp.degree_level}</span>
              </div>
              <div>
                <strong style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Status</strong>
                <span className={`badge ${STATUS_COLORS[detailApp.status] || 'badge-draft'}`}>{detailApp.status.replace('_', ' ')}</span>
              </div>
              <div>
                <strong style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Submitted</strong>
                <span>{detailApp.submitted_at ? new Date(detailApp.submitted_at).toLocaleDateString() : 'Not yet'}</span>
              </div>
            </div>

            {detailApp.personal_statement && (
              <div style={{ marginBottom: '1.5rem' }}>
                <strong style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Personal Statement</strong>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', background: 'var(--bg)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>{detailApp.personal_statement}</p>
              </div>
            )}

            {detailApp.documents && detailApp.documents.length > 0 && (() => {
              const VIEWABLE_EXTS = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif'];
              return (
                <div>
                  <strong style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.75rem' }}>
                    Documents ({detailApp.documents.length})
                  </strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {detailApp.documents.map((doc: DocumentMeta) => {
                      const ext = doc.file_name.split('.').pop()?.toLowerCase() || '';
                      const isViewable = VIEWABLE_EXTS.includes(ext);
                      return (
                        <a
                          key={doc.id}
                          href={api.documents.downloadUrl(doc.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={isViewable ? 'Opens in browser tab' : 'Downloads file'}
                          style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '0.75rem 1rem', background: 'var(--bg)',
                            borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                            textDecoration: 'none', color: 'var(--text)',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', textTransform: 'capitalize' }}>
                              {doc.doc_type.replace(/_/g, ' ')}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{doc.file_name}</div>
                          </div>
                          <span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            {isViewable ? '👁 View' : '↓ Download'}
                          </span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      )}
    </>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ type: '', msg: '' });
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; email: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.admin.listUsers();
      setUsers(res.users);
    } catch (e: unknown) {
      setAlert({ type: 'danger', msg: e instanceof Error ? e.message : 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const changeRole = async (userId: string, role: string) => {
    setActionLoading(userId + '-role');
    try {
      await api.admin.updateUserRole(userId, role);
      setAlert({ type: 'success', msg: `User role updated to "${role}".` });
      load();
    } catch (e: unknown) {
      setAlert({ type: 'danger', msg: e instanceof Error ? e.message : 'Failed to update role' });
    } finally {
      setActionLoading(null);
    }
  };

  const sendPasswordReset = async (userId: string, email: string) => {
    setActionLoading(userId + '-reset');
    try {
      const res = await api.admin.resetUserPassword(userId);
      setAlert({ type: 'success', msg: res.message || `Password reset email sent to ${email}.` });
    } catch (e: unknown) {
      setAlert({ type: 'danger', msg: e instanceof Error ? e.message : 'Failed to send reset email' });
    } finally {
      setActionLoading(null);
    }
  };

  const deleteUser = async () => {
    if (!confirmDelete) return;
    setActionLoading(confirmDelete.id + '-delete');
    try {
      const res = await api.admin.deleteUser(confirmDelete.id);
      setAlert({ type: 'success', msg: res.message || 'User deleted successfully.' });
      setConfirmDelete(null);
      load();
    } catch (e: unknown) {
      setAlert({ type: 'danger', msg: e instanceof Error ? e.message : 'Failed to delete user' });
      setConfirmDelete(null);
    } finally {
      setActionLoading(null);
    }
  };

  const btnStyle: React.CSSProperties = {
    background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    cursor: 'pointer', padding: '0.25rem 0.6rem', fontSize: '0.78rem', fontWeight: 600,
    transition: 'all 0.15s',
  };

  return (
    <>
      {alert.msg && (
        <div className={`alert alert-${alert.type}`} style={{ marginBottom: '1.5rem' }} role="alert">
          {alert.msg} <button onClick={() => setAlert({ type: '', msg: '' })} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }} aria-label="Dismiss">✕</button>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '1rem' }}
             role="dialog" aria-modal="true" aria-label="Confirm user deletion">
          <div className="card" style={{ maxWidth: 440, width: '100%' }}>
            <h3 style={{ color: 'var(--danger, #dc2626)', margin: '0 0 0.75rem' }}>⚠ Permanently Delete User?</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              This will permanently delete <strong>{confirmDelete.email}</strong> and all their applications,
              documents, and enrollment records. <strong>This action cannot be undone.</strong>
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline btn-sm" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button
                className="btn btn-sm"
                style={{ background: 'var(--danger)', color: '#fff', border: 'none' }}
                onClick={deleteUser}
                disabled={!!actionLoading}
              >
                {actionLoading ? 'Deleting…' : 'Yes, Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" style={{ width: 36, height: 36 }} /></div>
      ) : users.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No users found.</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Verified</th>
                <th>Change Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td><span style={{ fontWeight: 600 }}>{u.first_name} {u.last_name}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'badge-accepted' : u.role === 'staff' ? 'badge-under_review' : u.role === 'student' ? 'badge-submitted' : 'badge-draft'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>{u.is_verified ? '✓' : '—'}</td>
                  <td>
                    <select
                      value={u.role}
                      onChange={e => changeRole(u.id, e.target.value)}
                      className="form-select"
                      style={{ width: 'auto', padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                      disabled={actionLoading === u.id + '-role'}
                    >
                      {ROLE_OPTIONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <button
                        style={{ ...btnStyle, color: 'var(--navy)' }}
                        onClick={() => sendPasswordReset(u.id, u.email)}
                        disabled={!!actionLoading}
                        title="Send password reset email to this user"
                        id={`reset-pwd-${u.id}`}
                      >
                        {actionLoading === u.id + '-reset' ? '…' : '🔑 Reset Pwd'}
                      </button>
                      {u.role !== 'admin' && (
                        <button
                          style={{ ...btnStyle, color: 'var(--danger)', borderColor: 'var(--danger)' }}
                          onClick={() => setConfirmDelete({ id: u.id, email: u.email })}
                          disabled={!!actionLoading}
                          title="Permanently delete this user and all their data"
                          id={`delete-user-${u.id}`}
                        >
                          🗑 Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function AuditLogsTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ type: '', msg: '' });
  const [actionFilter, setActionFilter] = useState('');

  const ACTION_LABELS: Record<string, string> = {
    update_user_role: '🔄 Role Changed',
    delete_user: '🗑 User Deleted',
    admin_reset_password: '🔑 Pwd Reset Sent',
    update_application_status: '📋 Status Updated',
    delete_document: '📄 Doc Deleted',
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.admin.getAuditLogs(actionFilter ? { action: actionFilter } : {});
      setLogs(res.logs);
    } catch (e: unknown) {
      setAlert({ type: 'danger', msg: e instanceof Error ? e.message : 'Failed to load audit logs' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [actionFilter]);

  const parseDetails = (details: string | null) => {
    if (!details) return null;
    try {
      const obj = JSON.parse(details);
      return Object.entries(obj)
        .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
        .join(' · ');
    } catch {
      return details;
    }
  };

  return (
    <>
      {alert.msg && (
        <div className={`alert alert-${alert.type}`} style={{ marginBottom: '1.5rem' }} role="alert">
          {alert.msg} <button onClick={() => setAlert({ type: '', msg: '' })} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }} aria-label="Dismiss">✕</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Filter by action:</label>
        <select
          className="form-select"
          style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.875rem' }}
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
        >
          <option value="">All Actions</option>
          {Object.entries(ACTION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <button className="btn btn-outline btn-sm" onClick={load}>↻ Refresh</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" style={{ width: 36, height: 36 }} /></div>
      ) : logs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No audit log entries found.
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Details</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{log.actor_name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{log.actor_email}</div>
                  </td>
                  <td>
                    <span className={`badge ${
                      log.action === 'delete_user' ? 'badge-rejected' :
                      log.action === 'update_user_role' ? 'badge-under_review' :
                      log.action === 'admin_reset_password' ? 'badge-waitlisted' :
                      'badge-submitted'
                    }`} style={{ whiteSpace: 'nowrap' }}>
                      {ACTION_LABELS[log.action] || log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: 280 }}>
                    {parseDetails(log.details)}
                  </td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {log.ip_address || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
