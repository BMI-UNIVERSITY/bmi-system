import { useState, useEffect } from 'react';
import { api, Course } from '../../lib/api';

export default function Academics() {
  const [activeTab, setActiveTab] = useState<'registration' | 'schedule' | 'transcript'>('registration');
  const [courses, setCourses] = useState<Course[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [transcriptData, setTranscriptData] = useState<{ classes: any[]; gpa: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [alert, setAlert] = useState({ type: '', msg: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'registration') {
        const [coursesData, dashData] = await Promise.all([
          api.student.getCourses(),
          api.student.getDashboard()
        ]);
        setCourses(coursesData);
        setDashboardData(dashData);
      } else if (activeTab === 'schedule') {
        const data = await api.student.getDashboard();
        setDashboardData(data);
      } else if (activeTab === 'transcript') {
        const data = await api.student.getTranscript();
        setTranscriptData(data);
      }
    } catch (e: any) {
      setAlert({ type: 'danger', msg: e.message || 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleEnroll = async (courseId: string) => {
    setActionLoading(courseId);
    try {
      await api.student.enroll(courseId);
      setAlert({ type: 'success', msg: 'Successfully enrolled! An invoice has been generated.' });
      loadData();
    } catch (e: any) {
      setAlert({ type: 'danger', msg: e.message || 'Failed to enroll' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDrop = async (courseId: string) => {
    if (!window.confirm("Are you sure you want to drop this course?")) return;
    setActionLoading(courseId);
    try {
      await api.student.dropCourse(courseId);
      setAlert({ type: 'success', msg: 'Course dropped successfully.' });
      loadData();
    } catch (e: any) {
      setAlert({ type: 'danger', msg: e.message || 'Failed to drop course' });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="page" style={{ padding: '5rem 1.5rem 3rem', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', marginBottom: '0.5rem' }}>Academics</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Manage your academic journey.</p>

        {alert.msg && (
          <div className={`alert alert-${alert.type}`} style={{ marginBottom: '1.5rem' }} role="alert" aria-live="assertive">
            {alert.msg}
            <button onClick={() => setAlert({ type: '', msg: '' })} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }} aria-label="Close alert">✕</button>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
          <button 
            onClick={() => setActiveTab('registration')}
            style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'registration' ? '2px solid var(--navy)' : '2px solid transparent', fontWeight: activeTab === 'registration' ? 600 : 400, cursor: 'pointer', color: 'var(--text)' }}
          >
            Course Registration
          </button>
          <button 
            onClick={() => setActiveTab('schedule')}
            style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'schedule' ? '2px solid var(--navy)' : '2px solid transparent', fontWeight: activeTab === 'schedule' ? 600 : 400, cursor: 'pointer', color: 'var(--text)' }}
          >
            My Schedule
          </button>
          <button 
            onClick={() => setActiveTab('transcript')}
            style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'transcript' ? '2px solid var(--navy)' : '2px solid transparent', fontWeight: activeTab === 'transcript' ? 600 : 400, cursor: 'pointer', color: 'var(--text)' }}
          >
            Transcript & Grades
          </button>
        </div>

        <div className="card">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" /></div>
          ) : (
            <>
              {activeTab === 'registration' && (
                <>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Course Catalog (Fall 2026)</h2>
                  <div className="table-wrap">
                    <table className="data-table" aria-label="Course Catalog">
                      <thead>
                        <tr>
                          <th scope="col">Code</th>
                          <th scope="col">Title</th>
                          <th scope="col">Credits</th>
                          <th scope="col">Capacity</th>
                          <th scope="col">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {courses.map(c => (
                          <tr key={c.id}>
                            <td><strong>{c.code}</strong></td>
                            <td>
                              <div>{c.title}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.description}</div>
                            </td>
                            <td>{c.credits}</td>
                            <td>{c.capacity}</td>
                            <td>
                              {dashboardData?.current_classes?.some((cc: any) => cc.course_id === c.id) ? (
                                <button className="btn btn-outline btn-sm" disabled style={{ opacity: 0.7, cursor: 'not-allowed' }}>
                                  Enrolled
                                </button>
                              ) : (
                                <button 
                                  className="btn btn-navy btn-sm" 
                                  onClick={() => handleEnroll(c.id)}
                                  disabled={actionLoading === c.id}
                                  aria-label={`Enroll in ${c.code}`}
                                >
                                  {actionLoading === c.id ? 'Enrolling...' : 'Enroll'}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {activeTab === 'schedule' && (
                <>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>My Schedule</h2>
                  {dashboardData?.current_classes?.length > 0 ? (
                    <div className="table-wrap">
                      <table className="data-table" aria-label="My Schedule">
                        <thead>
                          <tr>
                            <th scope="col">Course</th>
                            <th scope="col">Title</th>
                            <th scope="col">Credits</th>
                            <th scope="col">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboardData.current_classes.map((c: any) => (
                            <tr key={c.id}>
                              <td><strong>{c.code}</strong></td>
                              <td>{c.title}</td>
                              <td>{c.credits}</td>
                              <td>
                                <button 
                                  className="btn btn-outline btn-sm" 
                                  style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                                  onClick={() => handleDrop(c.course_id || c.id)}
                                  disabled={actionLoading === (c.course_id || c.id)}
                                  aria-label={`Drop ${c.code}`}
                                >
                                  {actionLoading === (c.course_id || c.id) ? 'Dropping...' : 'Drop'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)' }}>You are not enrolled in any classes for the current term.</p>
                  )}
                </>
              )}

              {activeTab === 'transcript' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <img src="/bmi-logo.png" alt="BMI University" className="print-logo" style={{ height: '48px', display: 'none' }} />
                      <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Unofficial Transcript</h2>
                    </div>
                    <div style={{ padding: '0.5rem 1rem', background: 'var(--navy)', color: 'white', borderRadius: '8px', fontWeight: 600 }}>
                      Cumulative GPA: {transcriptData?.gpa || 'N/A'}
                    </div>
                  </div>
                  
                  {transcriptData?.classes?.length && transcriptData.classes.length > 0 ? (
                    <div className="table-wrap">
                      <table className="data-table" aria-label="Transcript">
                        <thead>
                          <tr>
                            <th scope="col">Term</th>
                            <th scope="col">Course</th>
                            <th scope="col">Title</th>
                            <th scope="col">Credits</th>
                            <th scope="col">Grade</th>
                            <th scope="col">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transcriptData.classes.map((c: any, i: number) => (
                            <tr key={i}>
                              <td>{c.term}</td>
                              <td><strong>{c.code}</strong></td>
                              <td>{c.title}</td>
                              <td>{c.credits}</td>
                              <td><strong>{c.grade || '—'}</strong></td>
                              <td>
                                <span className="badge" style={{ background: c.status === 'dropped' ? '#fde8e8' : '#e1effe', color: c.status === 'dropped' ? 'var(--danger)' : 'var(--navy)' }}>
                                  {c.status.toUpperCase()}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)' }}>No transcript records found.</p>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
