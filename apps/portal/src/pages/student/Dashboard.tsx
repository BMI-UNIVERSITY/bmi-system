import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [onboarding, setOnboarding] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.student.getDashboard(),
      api.student.getOnboardingStatus()
    ])
      .then(([dashData, obData]) => {
        setData(dashData);
        setOnboarding(obData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page" style={{ padding: '5rem 1.5rem', textAlign: 'center' }}>
        <div className="spinner" style={{ width: 40, height: 40 }}></div>
      </div>
    );
  }

  return (
    <div className="page" style={{ padding: '5rem 1.5rem 3rem', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', marginBottom: '2rem' }}>Student Dashboard</h1>

        {onboarding && !onboarding.isComplete && (
          <div className="card" style={{ marginBottom: '2rem', border: '2px solid var(--primary)', background: 'linear-gradient(to right, rgba(234, 179, 8, 0.05), rgba(234, 179, 8, 0.15))' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--primary-dark)' }}>Getting Started</h2>
            <p style={{ color: 'var(--slate)', marginBottom: '1.5rem' }}>Complete these required tasks to finalize your enrollment.</p>
            
            <div style={{ background: 'var(--surface)', borderRadius: '8px', padding: '1rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
                <div style={{ flex: 1, height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${onboarding.progress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.5s ease' }} />
                </div>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>{onboarding.progress}% Complete</span>
              </div>
              
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {onboarding.tasks.map((task: any) => (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: task.completed ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg)', border: `1px solid ${task.completed ? 'var(--success)' : 'var(--border)'}`, borderRadius: '6px', opacity: task.locked ? 0.6 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: task.completed ? 'var(--success)' : 'var(--border)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem' }}>
                        {task.completed ? '✓' : (task.locked ? '🔒' : '•')}
                      </div>
                      <span style={{ fontWeight: task.completed ? 600 : 500, color: task.completed ? 'var(--success)' : 'var(--text)', textDecoration: task.completed ? 'line-through' : 'none' }}>
                        {task.title}
                      </span>
                    </div>
                    {!task.completed && (
                      task.locked ? (
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Locked</span>
                      ) : (
                        <Link to={task.actionUrl} className="btn btn-primary btn-sm">Start</Link>
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          
          <div className="card">
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Upcoming Invoices</h2>
            {data?.upcoming_invoices?.length > 0 ? (
              <div>
                {data.upcoming_invoices.map((inv: any) => (
                  <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
                    <span>Due: {new Date(inv.due_date).toLocaleDateString()}</span>
                    <strong style={{ color: 'var(--danger)' }}>${inv.amount.toLocaleString()}</strong>
                  </div>
                ))}
                <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                  <Link to="/student/finances" className="btn btn-navy btn-sm">Pay Now</Link>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>No upcoming invoices.</p>
            )}
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Announcements</h2>
            {data?.announcements?.map((a: any) => (
              <div key={a.id} style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', margin: 0 }}>{a.title}</h3>
                <small style={{ color: 'var(--slate)' }}>{new Date(a.date).toLocaleDateString()}</small>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{a.content}</p>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Quick Actions</h2>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <Link to="/student/academics" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>📚 Register for Classes</Link>
              <Link to="/student/finances" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>💳 Pay Tuition & Fees</Link>
              <Link to="/student/support" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>🎫 Contact Support</Link>
              <Link to="/student/settings" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>⚙️ Privacy Settings</Link>
            </div>
          </div>

          {/* Degree Progress */}
          <div className="card">
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Degree Progress</h2>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600 }}>Bachelor of Science</span>
                <span style={{ color: 'var(--navy)', fontWeight: 700 }}>24%</span>
              </div>
              <div style={{ width: '100%', background: 'var(--border)', borderRadius: '99px', height: '8px', overflow: 'hidden' }}>
                <div style={{ width: '24%', background: 'var(--gold)', height: '100%' }}></div>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                29 of 120 credits completed.
              </p>
            </div>
          </div>

          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Current Classes</h2>
            {data?.current_classes?.length > 0 ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Title</th>
                      <th>Credits</th>
                      <th>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.current_classes.map((c: any) => (
                      <tr key={c.id}>
                        <td><strong>{c.code}</strong></td>
                        <td>{c.title}</td>
                        <td>{c.credits}</td>
                        <td>{c.grade || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>You are not enrolled in any classes. <Link to="/student/academics" style={{ color: 'var(--navy)', textDecoration: 'underline' }}>Register now</Link>.</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
