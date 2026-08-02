import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminApi, StaffMember, LeaveRequest, Book } from '../lib/api';

interface StatCardProps {
  icon: string;
  iconClass: string;
  label: string;
  value: string | number;
  sub: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, iconClass, label, value, sub }) => (
  <div className="stat-card">
    <div className={`stat-icon ${iconClass}`}>{icon}</div>
    <div className="stat-body">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  </div>
);

export const OverviewView: React.FC = () => {
  const { user } = useAuth();
  const [staff, setStaff]           = useState<StaffMember[]>([]);
  const [leaves, setLeaves]         = useState<LeaveRequest[]>([]);
  const [books, setBooks]           = useState<Book[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.allSettled([
      adminApi.getStaff(),
      adminApi.getLeaveRequests(),
      adminApi.getBooks(),
    ]).then(([s, l, b]) => {
      if (s.status === 'fulfilled') setStaff(s.value);
      if (l.status === 'fulfilled') setLeaves(l.value);
      if (b.status === 'fulfilled') setBooks(b.value);
    }).finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const pendingLeaves = leaves.filter((l) => l.status === 'pending').length;

  return (
    <div>
      <div className="page-header fade-up">
        <h1>{greeting}, {user?.name?.split(' ')[0] ?? 'Administrator'} 👋</h1>
        <p>Here's a real-time snapshot of BMI's operational status across all modules.</p>
      </div>

      {/* Stats */}
      <div className="stat-grid fade-up fade-up-delay-1">
        <StatCard icon="👥" iconClass="violet" label="Total Staff" value={loading ? '…' : staff.length} sub="On record in HR" />
        <StatCard icon="🗓️" iconClass="amber"  label="Pending Leave Requests" value={loading ? '…' : pendingLeaves} sub="Awaiting approval" />
        <StatCard icon="📖" iconClass="blue"   label="Books in Catalog" value={loading ? '…' : books.length} sub="Library inventory" />
        <StatCard icon="✅" iconClass="green"  label="Leave Approved" value={loading ? '…' : leaves.filter(l => l.status === 'approved').length} sub="This period" />
      </div>

      <div className="grid-2 fade-up fade-up-delay-2" style={{ marginBottom: '20px' }}>
        {/* Recent Staff */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Recent Staff Additions</div>
              <div className="card-subtitle">Latest 5 records</div>
            </div>
          </div>
          {loading ? <div className="empty-state"><p>Loading…</p></div> : staff.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">👥</div><p>No staff records yet.</p></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Job Title</th><th>Department</th><th>Since</th></tr></thead>
                <tbody>
                  {staff.slice(0, 5).map((s) => (
                    <tr key={s.id}>
                      <td><strong>{s.jobTitle}</strong></td>
                      <td>{s.department}</td>
                      <td>{new Date(s.hireDate).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pending Leave Requests */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Leave Requests</div>
              <div className="card-subtitle">Pending action</div>
            </div>
          </div>
          {loading ? <div className="empty-state"><p>Loading…</p></div> : pendingLeaves === 0 ? (
            <div className="empty-state"><div className="empty-icon">🗓️</div><p>No pending leave requests.</p></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Staff ID</th><th>Start</th><th>End</th><th>Status</th></tr></thead>
                <tbody>
                  {leaves.filter(l => l.status === 'pending').slice(0, 5).map((l) => (
                    <tr key={l.id}>
                      <td><strong>#{l.staffId}</strong></td>
                      <td>{l.startDate}</td>
                      <td>{l.endDate}</td>
                      <td><span className="badge badge-yellow">Pending</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
