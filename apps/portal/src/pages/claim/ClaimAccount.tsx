import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';

export default function ClaimAccount() {
  const [searchParams] = useSearchParams();
  const [admissionCode, setAdmissionCode] = useState(searchParams.get('code') || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

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
      await api.auth.claim(admissionCode, password);
      navigate('/login', { state: { message: 'Account claimed successfully! You can now log in.' } });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to claim account. Code may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-center" style={{ background: 'linear-gradient(150deg, #f8fafc 0%, #eef2ff 50%, #faf5e4 100%)', minHeight: '100vh' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/bmi-logo.png" alt="BMI University" style={{ height: 72, margin: '0 auto 1.5rem' }} />
          <h1 style={{ color: 'var(--navy)', marginBottom: '0.5rem', fontSize: '1.8rem' }}>Activate Student Account</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5, padding: '0 1rem' }}>
            Welcome to BMI University! Enter your admission code and set a password to access your portal.
          </p>
        </div>

        <div className="card">

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
    </div>
  );
}
