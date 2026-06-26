import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Read prefill params from the university apply page redirect (G-1 fix)
  const prefillEmail = searchParams.get('email') ?? '';
  const prefillFirstName = searchParams.get('first_name') ?? '';
  const prefillLastName = searchParams.get('last_name') ?? '';
  const prefillProgram = searchParams.get('program') ?? '';
  const isPrefilledFromApply = !!(prefillEmail && prefillFirstName && prefillLastName);

  const [form, setForm] = useState({
    first_name: prefillFirstName,
    last_name: prefillLastName,
    email: prefillEmail,
    phone: '',
    password: '',
    confirm_password: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Keep form in sync if params arrive after mount (e.g. client-side navigation)
  useEffect(() => {
    if (prefillEmail || prefillFirstName || prefillLastName) {
      setForm(f => ({
        ...f,
        email: prefillEmail || f.email,
        first_name: prefillFirstName || f.first_name,
        last_name: prefillLastName || f.last_name,
      }));
    }
  }, [prefillEmail, prefillFirstName, prefillLastName]);

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const getPasswordStrength = (pw: string): { label: string; color: string; score: number } => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 2) return { label: 'Weak', color: 'var(--danger)', score };
    if (score <= 4) return { label: 'Medium', color: 'var(--warning)', score };
    return { label: 'Strong', color: 'var(--success)', score };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.password !== form.confirm_password) return setError('Passwords do not match.');
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    if (!/[A-Z]/.test(form.password)) return setError('Password must contain an uppercase letter.');
    if (!/[a-z]/.test(form.password)) return setError('Password must contain a lowercase letter.');
    if (!/[0-9]/.test(form.password)) return setError('Password must contain a number.');
    if (!/[^A-Za-z0-9]/.test(form.password)) return setError('Password must contain a special character.');

    setLoading(true);
    try {
      await api.auth.register({
        email: form.email,
        password: form.password,
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone || undefined,
      });

      if (prefillProgram) {
        // Came from the university apply page — go straight to the application form
        setSuccess('Account created! Please check your email to verify your account, then complete your application.');
        setTimeout(() => navigate('/apply'), 2000);
      } else {
        setSuccess('Account created! Please check your email to verify your account before logging in.');
        setForm({ first_name: '', last_name: '', email: '', phone: '', password: '', confirm_password: '' });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const strength = form.password ? getPasswordStrength(form.password) : null;

  return (
    <div className="page-center" style={{ background: 'linear-gradient(150deg, #f8fafc 0%, #eef2ff 50%, #faf5e4 100%)' }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link to="/" style={{ display: 'inline-block' }}>
            <img src="/bmi-logo.png" alt="BMI University Portal" style={{ height: '64px' }} />
          </Link>
          <h1 style={{ color: 'var(--navy)', fontSize: '1.8rem', marginTop: '1rem' }}>Create Your Account</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {isPrefilledFromApply ? 'One last step — set your password to complete your application.' : 'Start your admissions journey today'}
          </p>
        </div>
        <div className="card">
          {/* Contextual welcome banner when arriving from the university apply page */}
          {isPrefilledFromApply && !success && !error && (
            <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
              <strong>Almost there!</strong> Your account details have been pre-filled from your application.
              {prefillProgram && (
                <> Your selected program — <strong>{prefillProgram}</strong> — will be saved to your application.</>
              )}
              {' '}Just set a password to finish creating your account.
            </div>
          )}

          {error && <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>{success}</div>}

          {!success && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="first_name">First Name *</label>
                  <input
                    id="first_name"
                    className="form-input"
                    type="text"
                    required
                    value={form.first_name}
                    onChange={e => update('first_name', e.target.value)}
                    placeholder="John"
                    autoFocus={!isPrefilledFromApply}
                    readOnly={isPrefilledFromApply}
                    style={isPrefilledFromApply ? { background: '#f1f5f9', color: 'var(--text-muted)' } : undefined}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="last_name">Last Name *</label>
                  <input
                    id="last_name"
                    className="form-input"
                    type="text"
                    required
                    value={form.last_name}
                    onChange={e => update('last_name', e.target.value)}
                    placeholder="Smith"
                    readOnly={isPrefilledFromApply}
                    style={isPrefilledFromApply ? { background: '#f1f5f9', color: 'var(--text-muted)' } : undefined}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="email">Email Address *</label>
                <input
                  id="email"
                  className="form-input"
                  type="email"
                  required
                  value={form.email}
                  onChange={e => update('email', e.target.value)}
                  placeholder="john@example.com"
                  readOnly={isPrefilledFromApply}
                  style={isPrefilledFromApply ? { background: '#f1f5f9', color: 'var(--text-muted)' } : undefined}
                />
              </div>
              {!isPrefilledFromApply && (
                <div className="form-group">
                  <label className="form-label" htmlFor="phone">Phone Number</label>
                  <input id="phone" className="form-input" type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+1 (704) 000-0000" />
                </div>
              )}
              <div className="form-group">
                <label className="form-label" htmlFor="password">Password *</label>
                <input
                  id="password"
                  className="form-input"
                  type="password"
                  required
                  value={form.password}
                  onChange={e => update('password', e.target.value)}
                  placeholder="Min. 8 characters with uppercase, lowercase, number & special char"
                  autoFocus={isPrefilledFromApply}
                />
                {strength && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${(strength.score / 6) * 100}%`, height: '100%', background: strength.color, borderRadius: 2, transition: 'width 0.3s' }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: strength.color, fontWeight: 600 }}>{strength.label}</span>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="confirm_password">Confirm Password *</label>
                <input
                  id="confirm_password"
                  className="form-input"
                  type="password"
                  required
                  value={form.confirm_password}
                  onChange={e => update('confirm_password', e.target.value)}
                  placeholder="Re-enter password"
                />
                {form.confirm_password && form.password !== form.confirm_password && (
                  <span className="form-error">Passwords do not match</span>
                )}
              </div>
              <button type="submit" className="btn btn-gold btn-full" disabled={loading} style={{ marginTop: '0.5rem' }}>
                {loading ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Creating Account...</> : (isPrefilledFromApply ? 'Complete Registration →' : 'Create Account →')}
              </button>
            </form>
          )}
          <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--gold)', fontWeight: 600 }}>Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
