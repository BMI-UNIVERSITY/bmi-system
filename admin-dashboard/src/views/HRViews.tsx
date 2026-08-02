import React, { useEffect, useState } from 'react';
import { adminApi, StaffMember, LeaveRequest } from '../lib/api';

export const HRStaffView: React.FC = () => {
  const [staff, setStaff]   = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  useEffect(() => {
    adminApi.getStaff()
      .then(setStaff)
      .finally(() => setLoading(false));
  }, []);

  const filtered = staff.filter((s) =>
    `${s.jobTitle} ${s.department}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header fade-up">
        <h1>Staff Records</h1>
        <p>View and manage all BMI staff members across departments.</p>
      </div>

      <div className="stat-grid fade-up fade-up-delay-1">
        <div className="stat-card">
          <div className="stat-icon violet">👥</div>
          <div className="stat-body">
            <div className="stat-label">Total Staff</div>
            <div className="stat-value">{loading ? '…' : staff.length}</div>
            <div className="stat-sub">Across all departments</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">🏢</div>
          <div className="stat-body">
            <div className="stat-label">Departments</div>
            <div className="stat-value">{loading ? '…' : new Set(staff.map(s => s.department)).size}</div>
            <div className="stat-sub">Unique departments</div>
          </div>
        </div>
      </div>

      <div className="card fade-up fade-up-delay-2">
        <div className="card-header">
          <div>
            <div className="card-title">All Staff</div>
            <div className="card-subtitle">{filtered.length} records</div>
          </div>
          <input
            className="form-input"
            placeholder="Search by title or department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '240px' }}
          />
        </div>

        {loading ? <div className="empty-state"><p>Loading…</p></div> : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <p>No staff records found.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Job Title</th><th>Department</th><th>Hire Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.id}</strong></td>
                    <td>{s.jobTitle}</td>
                    <td><span className="badge badge-violet">{s.department}</span></td>
                    <td>{new Date(s.hireDate).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export const HRLeaveView: React.FC = () => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  useEffect(() => {
    adminApi.getLeaveRequests()
      .then(setRequests)
      .finally(() => setLoading(false));
  }, []);

  const handleUpdate = async (id: number, status: 'approved' | 'rejected') => {
    setUpdating(id);
    try {
      const updated = await adminApi.updateLeaveRequest(id, status);
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: updated.status } : r));
    } catch (e) {
      console.error('Failed to update leave request', e);
    } finally {
      setUpdating(null);
    }
  };

  const pending   = requests.filter((r) => r.status === 'pending').length;
  const approved  = requests.filter((r) => r.status === 'approved').length;
  const rejected  = requests.filter((r) => r.status === 'rejected').length;

  return (
    <div>
      <div className="page-header fade-up">
        <h1>Leave Requests</h1>
        <p>Review, approve, or reject staff leave applications.</p>
      </div>

      <div className="stat-grid fade-up fade-up-delay-1">
        <div className="stat-card"><div className="stat-icon amber">⏳</div><div className="stat-body"><div className="stat-label">Pending</div><div className="stat-value">{pending}</div></div></div>
        <div className="stat-card"><div className="stat-icon green">✅</div><div className="stat-body"><div className="stat-label">Approved</div><div className="stat-value">{approved}</div></div></div>
        <div className="stat-card"><div className="stat-icon red">❌</div><div className="stat-body"><div className="stat-label">Rejected</div><div className="stat-value">{rejected}</div></div></div>
      </div>

      <div className="card fade-up fade-up-delay-2">
        <div className="card-header">
          <div className="card-title">All Leave Requests</div>
        </div>
        {loading ? <div className="empty-state"><p>Loading…</p></div> : requests.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🗓️</div><p>No leave requests found.</p></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Staff ID</th><th>Start</th><th>End</th><th>Reason</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td><strong>#{r.staffId}</strong></td>
                    <td>{r.startDate}</td>
                    <td>{r.endDate}</td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.reason ?? '—'}
                    </td>
                    <td>
                      <span className={`badge ${r.status === 'approved' ? 'badge-green' : r.status === 'rejected' ? 'badge-red' : 'badge-yellow'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      {r.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            id={`approve-leave-${r.id}`}
                            className="btn btn-ghost"
                            style={{ padding: '4px 10px', fontSize: '0.78rem', color: '#34d399', borderColor: 'rgba(16,185,129,0.3)' }}
                            disabled={updating === r.id}
                            onClick={() => handleUpdate(r.id, 'approved')}
                          >
                            {updating === r.id ? '…' : '✓ Approve'}
                          </button>
                          <button
                            id={`reject-leave-${r.id}`}
                            className="btn btn-danger"
                            style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                            disabled={updating === r.id}
                            onClick={() => handleUpdate(r.id, 'rejected')}
                          >
                            ✗ Reject
                          </button>
                        </div>
                      ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
