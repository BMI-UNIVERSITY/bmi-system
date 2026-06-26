import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';

export default function Login() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [tempLoginData, setTempLoginData] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (requiresMfa && tempLoginData) {
        const res = await api.auth.login(tempLoginData.email, tempLoginData.password, mfaToken);
        setUser(res.user!);
        const dest = res.user?.role === 'admin' || res.user?.role === 'staff' ? '/admin' : res.user?.role === 'student' ? '/student/dashboard' : '/status';
        navigate(dest);
      } else {
        const res = await api.auth.login(email, password);
        if (res.requires_mfa) {
          setTempLoginData({ email, password });
          setRequiresMfa(true);
        } else {
          setUser(res.user);
          const dest = res.user?.role === 'admin' || res.user?.role === 'staff' ? '/admin' : res.user?.role === 'student' ? '/student/dashboard' : '/status';
          navigate(dest);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed.';
      if (msg.includes('verify your email')) {
        setError(`${msg} <a href="/register" style="color:#d4af37;font-weight:600;">Resend verification email</a>`);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-center" style={{ background: 'linear-gradient(150deg, #f8fafc 0%, #eef2ff 50%, #faf5e4 100%)' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link to="/" style={{ display: 'inline-block' }}>
            <img src="/bmi-logo.png" alt="BMI University Portal" style={{ height: '64px' }} />
          </Link>
          <h1 style={{ color: 'var(--navy)', fontSize: '1.8rem', marginTop: '1rem' }}>Welcome Back</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {requiresMfa ? 'Enter your two-factor authentication code' : 'Sign in to your account'}
          </p>
        </div>
        <div className="card">
          {error && (
            <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }} dangerouslySetInnerHTML={{ __html: error }} />
          )}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {!requiresMfa ? (
              <>
                <div className="form-group">
                  <label className="form-label" htmlFor="login-email">Email Address</label>
                  <input id="login-email" className="form-input" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="login-password">Password</label>
                  <input id="login-password" className="form-input" type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Link to="/forgot-password" style={{ color: 'var(--gold)', fontSize: '0.9rem' }}>Forgot Password?</Link>
                </div>
              </>
            ) : (
              <div className="form-group">
                <label className="form-label" htmlFor="mfa-token">6-Digit Code</label>
                <input id="mfa-token" className="form-input" type="text" required value={mfaToken} onChange={e => setMfaToken(e.target.value)} placeholder="123456" maxLength={6} autoFocus />
              </div>
            )}
            <button type="submit" className="btn btn-gold btn-full" disabled={loading} style={{ marginTop: '0.5rem' }}>
              {loading ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Signing In...</> : requiresMfa ? 'Verify Code →' : 'Sign In →'}
            </button>
            {requiresMfa && (
              <button type="button" className="btn btn-secondary btn-full" onClick={() => { setRequiresMfa(false); setTempLoginData(null); setMfaToken(''); }} style={{ marginTop: 0 }}>
                Back
              </button>
            )}
          </form>
          {!requiresMfa && (
            <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Don't have an account? <Link to="/register" style={{ color: 'var(--gold)', fontWeight: 600 }}>Apply Now</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
