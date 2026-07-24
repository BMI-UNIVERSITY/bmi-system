import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import styles from './Login.module.css';

export default function Login() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [error, setError] = useState('');
  const [showResend, setShowResend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requiresMfa, setRequiresMfa] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          setUser(res.user ?? null);
          const dest = res.user?.role === 'admin' || res.user?.role === 'staff' ? '/admin' : res.user?.role === 'student' ? '/student/dashboard' : '/status';
          navigate(dest);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed.';
      if (msg.includes('verify your email')) {
        setError(msg);
        setShowResend(true);
      } else {
        setShowResend(false);
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      
      {/* Removed Left Panel as it conflicts with global Navbar */}


      {/* Right Login Panel */}
      <div className={styles.rightPanel}>
        <div className={styles.formWrapper}>
          
          <div className={styles.header}>

            <h1>Welcome Back</h1>
            <p>{requiresMfa ? 'Enter your two-factor authentication code' : 'Sign in to your account'}</p>
          </div>

          {error && (
            <div className={styles.errorAlert}>
              <span>{error}</span>
              {showResend && (
                <Link to="/register">Resend verification email</Link>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {!requiresMfa ? (
              <>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    autoFocus
                    className={styles.input}
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.label}>Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={styles.input}
                  />
                  <Link to="/forgot-password" className={styles.forgotPassword}>
                    Forgot Password?
                  </Link>
                </div>
              </>
            ) : (
              <div className={styles.formGroup}>
                <label className={styles.label}>6-Digit Code</label>
                <input
                  type="text"
                  required
                  value={mfaToken}
                  onChange={e => setMfaToken(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  autoFocus
                  className={styles.input}
                />
              </div>
            )}

            <button type="submit" disabled={loading} className={styles.submitBtn}>
              {loading ? <div className={styles.spinner} /> : (requiresMfa ? 'Verify Code →' : 'Sign In →')}
            </button>
            
            {requiresMfa && (
              <button 
                type="button" 
                className={styles.backBtn}
                onClick={() => { setRequiresMfa(false); setTempLoginData(null); setMfaToken(''); }}
              >
                Back
              </button>
            )}
          </form>

          {!requiresMfa && (
            <div className={styles.footer}>
              Don't have an account? <Link to="/register">Apply Now</Link>
            </div>
          )}
          
        </div>
      </div>
      
    </div>
  );
}
