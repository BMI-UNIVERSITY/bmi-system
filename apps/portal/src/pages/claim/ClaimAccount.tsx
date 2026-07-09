import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_WORKER_URL } from '@bmi/shared';

export default function ClaimAccount() {
  const [searchParams] = useSearchParams();
  const [admissionCode, setAdmissionCode] = useState(searchParams.get('code') || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const isDev = (import.meta as any).env?.DEV;
  const BASE = (isDev
    ? ((import.meta as any).env?.VITE_API_URL || '')
    : ((import.meta as any).env?.VITE_API_URL || API_WORKER_URL)) + '/api';

  useEffect(() => {
    if (searchParams.get('code')) {
      setAdmissionCode(searchParams.get('code') as string);
    }
  }, [searchParams]);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${BASE}/auth/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admissionCode, password }),
      });
      if (res.ok) {
        navigate('/login', { state: { message: 'Account claimed successfully! You can now log in.' } });
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg((data as any)?.error || 'Failed to claim account. Code may be invalid or expired.');
      }
    } catch (err) {
      setErrorMsg('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="layout-auth">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/bmi-logo.png" alt="BMI University" style={{ height: 80, margin: '0 auto 1.5rem' }} />
          <h1 style={{ color: 'var(--navy)', marginBottom: '0.5rem' }}>Activate Student Account</h1>
          <p style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>
            Welcome to BMI University! Enter your admission code and set a password to access your portal.
          </p>
        </div>

        {errorMsg && (
          <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleClaim}>
          <div className="form-group">
            <label className="form-label" htmlFor="admissionCode">Admission Code</label>
            <input 
              id="admissionCode"
              type="text" 
              className="form-input" 
              value={admissionCode} 
              onChange={e => setAdmissionCode(e.target.value)} 
              placeholder="e.g. A-12345678"
              required 
            />
          </div>
          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label" htmlFor="password">Create Password</label>
            <input 
              id="password"
              type="password" 
              className="form-input" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="Must be at least 8 characters"
              minLength={8}
              required 
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-navy" 
            style={{ width: '100%', padding: '0.875rem' }}
            disabled={loading}
          >
            {loading ? 'Activating Account...' : 'Activate Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
