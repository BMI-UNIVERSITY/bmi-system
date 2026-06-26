import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState({ type: '', msg: '' });
  
  const [settings, setSettings] = useState({
    directory_release: true,
    communications_opt_in: true
  });

  useEffect(() => {
    api.student.getSettings()
      .then(data => {
        setSettings({
          directory_release: Boolean(data.directory_release),
          communications_opt_in: Boolean(data.communications_opt_in)
        });
      })
      .catch(e => {
        setAlert({ type: 'danger', msg: e.message || 'Failed to load settings' });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setAlert({ type: '', msg: '' });
    try {
      await api.student.updateSettings(settings);
      setAlert({ type: 'success', msg: 'Settings updated successfully.' });
    } catch (e: any) {
      setAlert({ type: 'danger', msg: e.message || 'Failed to update settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page" style={{ padding: '5rem 1.5rem', textAlign: 'center' }}>
        <div className="spinner" style={{ width: 40, height: 40 }}></div>
      </div>
    );
  }

  return (
    <div className="page" style={{ padding: '5rem 1.5rem 3rem', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', marginBottom: '0.5rem' }}>Privacy Settings</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Manage your FERPA preferences and communication settings.</p>

        {alert.msg && (
          <div className={`alert alert-${alert.type}`} style={{ marginBottom: '1.5rem' }} role="alert" aria-live="assertive">
            {alert.msg}
            <button onClick={() => setAlert({ type: '', msg: '' })} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }} aria-label="Close alert">✕</button>
          </div>
        )}

        <div className="card">
          <form onSubmit={handleSave}>
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>FERPA Directory Information</h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                The Family Educational Rights and Privacy Act (FERPA) allows the university to release "Directory Information" without your prior consent unless you explicitly opt out. Directory information includes your name, major, dates of attendance, and degrees received.
              </p>
              
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={settings.directory_release}
                  onChange={e => setSettings(s => ({ ...s, directory_release: e.target.checked }))}
                  style={{ marginTop: '0.25rem' }}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>Allow release of Directory Information</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>If unchecked, the university will not release your information to third parties, including prospective employers, without your written consent.</div>
                </div>
              </label>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Communications</h2>
              
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={settings.communications_opt_in}
                  onChange={e => setSettings(s => ({ ...s, communications_opt_in: e.target.checked }))}
                  style={{ marginTop: '0.25rem' }}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>Receive non-essential communications</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Opt in to receive campus newsletters, event invitations, and promotional materials.</div>
                </div>
              </label>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', textAlign: 'right' }}>
              <button type="submit" className="btn btn-navy" disabled={saving}>
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
