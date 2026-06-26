import { useState, useEffect } from 'react';
import { api, SupportTicket } from '../../lib/api';

export default function Support() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState({ type: '', msg: '' });

  const loadTickets = async () => {
    try {
      const data = await api.student.getSupportTickets();
      setTickets(data);
    } catch (e: any) {
      setAlert({ type: 'danger', msg: e.message || 'Failed to load support tickets' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setAlert({ type: '', msg: '' });
    try {
      await api.student.createSupportTicket(subject, description);
      setAlert({ type: 'success', msg: 'Support ticket submitted successfully.' });
      setSubject('');
      setDescription('');
      loadTickets();
    } catch (e: any) {
      setAlert({ type: 'danger', msg: e.message || 'Failed to submit ticket' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page" style={{ padding: '5rem 1.5rem 3rem', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', marginBottom: '0.5rem' }}>Student Support</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Get help with IT issues or contact your academic advisor.</p>

        {alert.msg && (
          <div className={`alert alert-${alert.type}`} style={{ marginBottom: '1.5rem' }} role="alert" aria-live="assertive">
            {alert.msg}
            <button onClick={() => setAlert({ type: '', msg: '' })} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }} aria-label="Close alert">✕</button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }}>
          <div>
            <div className="card" style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Submit a Request</h2>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1rem' }}>
                  <label htmlFor="subject" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Subject</label>
                  <input 
                    id="subject"
                    type="text" 
                    className="input" 
                    value={subject} 
                    onChange={e => setSubject(e.target.value)} 
                    required 
                    placeholder="Brief description of the issue"
                  />
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="description" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Details</label>
                  <textarea 
                    id="description"
                    className="input" 
                    rows={4} 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    required 
                    placeholder="Provide as much detail as possible..."
                  />
                </div>
                <button type="submit" className="btn btn-navy" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </form>
            </div>

            <div className="card">
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>My Tickets</h2>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" /></div>
              ) : tickets.length > 0 ? (
                <div className="table-wrap">
                  <table className="data-table" aria-label="Support Tickets">
                    <thead>
                      <tr>
                        <th scope="col">Date</th>
                        <th scope="col">Subject</th>
                        <th scope="col">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.map(t => (
                        <tr key={t.id}>
                          <td>{new Date(t.created_at).toLocaleDateString()}</td>
                          <td><strong>{t.subject}</strong></td>
                          <td>
                            <span className="badge" style={{ background: t.status === 'resolved' || t.status === 'closed' ? '#e1effe' : '#fef3c7', color: t.status === 'resolved' || t.status === 'closed' ? 'var(--navy)' : '#92400e' }}>
                              {t.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>You have no support tickets.</p>
              )}
            </div>
          </div>

          <div>
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Academic Advisor</h3>
              <p style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Dr. Sarah Jenkins</p>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Office: Building A, Room 402</p>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Email: advising@bmi.edu</p>
              <button className="btn btn-outline btn-sm" style={{ width: '100%' }}>Schedule Appointment</button>
            </div>
            
            <div className="card">
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Quick Links</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem' }}>
                <li><a href="#" style={{ color: 'var(--navy)' }}>Library Resources</a></li>
                <li><a href="#" style={{ color: 'var(--navy)' }}>Student Handbook</a></li>
                <li><a href="#" style={{ color: 'var(--navy)' }}>Campus Map</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
