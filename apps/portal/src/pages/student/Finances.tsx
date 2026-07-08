import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

export default function Finances() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [alert, setAlert] = useState({ type: '', msg: '' });

  const loadFinances = async () => {
    try {
      const result = await api.student.getFinances();
      setData(result);
    } catch (e: any) {
      setAlert({ type: 'danger', msg: e.message || 'Failed to load finances' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinances();
  }, []);

  const handlePay = async (invoiceId: string) => {
    setPaying(invoiceId);
    try {
      await api.student.payInvoice(invoiceId);
      setAlert({ type: 'success', msg: 'Payment successful!' });
      loadFinances();
    } catch (e: any) {
      setAlert({ type: 'danger', msg: e.message || 'Payment failed' });
    } finally {
      setPaying(null);
    }
  };

  return (
    <div className="page" style={{ padding: '5rem 1.5rem 3rem', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', margin: 0 }}>Financial Services</h1>
          <span className="badge badge-draft" style={{ marginLeft: '1rem', padding: '0.3rem 0.6rem', fontSize: '0.9rem' }}>Sandbox Mode</span>
        </div>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Manage your tuition, fees, and view account balance. Note: Payments are simulated in sandbox mode.
        </p>

        {alert.msg && (
          <div className={`alert alert-${alert.type}`} style={{ marginBottom: '1.5rem' }} role="alert" aria-live="assertive">
            {alert.msg}
            <button onClick={() => setAlert({ type: '', msg: '' })} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }} aria-label="Close alert">✕</button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }}>
          
          <div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Invoices</h2>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" /></div>
            ) : data?.invoices?.length > 0 ? (
              <div className="table-wrap">
                <table className="data-table" aria-label="Invoices Table">
                  <thead>
                    <tr>
                      <th scope="col">Date Issued</th>
                      <th scope="col">Due Date</th>
                      <th scope="col">Status</th>
                      <th scope="col">Amount</th>
                      <th scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.invoices.map((inv: any) => (
                      <tr key={inv.id}>
                        <td>{new Date(inv.created_at).toLocaleDateString()}</td>
                        <td>{new Date(inv.due_date).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge badge-${inv.status === 'paid' ? 'accepted' : 'draft'}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td><strong>${inv.amount.toLocaleString()}</strong></td>
                        <td>
                          {inv.status === 'unpaid' && (
                            <button 
                              className="btn btn-gold btn-sm"
                              onClick={() => handlePay(inv.id)}
                              disabled={paying === inv.id}
                              aria-label={`Pay invoice of $${inv.amount}`}
                            >
                              {paying === inv.id ? 'Processing...' : 'Pay Now'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                No invoices found.
              </div>
            )}
          </div>

          <div>
            <div className="card" style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Current Balance</h3>
              <div style={{ fontSize: '3rem', fontWeight: 900, fontFamily: 'var(--font-heading)', color: data?.balance > 0 ? 'var(--danger)' : 'var(--slate)' }}>
                ${(data?.balance || 0).toLocaleString()}
              </div>
              {data?.balance > 0 && (
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  Please pay your outstanding balance to avoid late fees.
                </p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
