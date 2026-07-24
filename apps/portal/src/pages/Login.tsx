import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { Button, Input, Card, CardContent } from '@bmi/ui';

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
        <Card className="border-0 shadow-xl">
          <CardContent>
            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6 text-sm">
                {error}
                {showResend && (
                  <> <Link to="/register" className="font-semibold underline ml-1">Resend verification email</Link></>
                )}
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {!requiresMfa ? (
                <>
                  <Input 
                    label="Email Address" 
                    type="email" 
                    required 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    placeholder="your@email.com" 
                    autoFocus 
                  />
                  <div className="relative">
                    <Input 
                      label="Password" 
                      type="password" 
                      required 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      placeholder="Your password" 
                    />
                    <div className="absolute right-0 top-0">
                      <Link to="/forgot-password" style={{ color: 'var(--gold)', fontSize: '0.75rem', fontWeight: 600 }}>Forgot Password?</Link>
                    </div>
                  </div>
                </>
              ) : (
                <Input 
                  label="6-Digit Code" 
                  type="text" 
                  required 
                  value={mfaToken} 
                  onChange={e => setMfaToken(e.target.value)} 
                  placeholder="123456" 
                  maxLength={6} 
                  autoFocus 
                />
              )}
              <Button type="submit" variant="primary" isLoading={loading} className="mt-2 w-full bg-[#d4af37] hover:bg-[#b8962c] text-white">
                {requiresMfa ? 'Verify Code →' : 'Sign In →'}
              </Button>
              {requiresMfa && (
                <Button type="button" variant="outline" className="w-full" onClick={() => { setRequiresMfa(false); setTempLoginData(null); setMfaToken(''); }}>
                  Back
                </Button>
              )}
            </form>
            {!requiresMfa && (
              <p className="text-center mt-6 text-sm text-gray-500">
                Don't have an account? <Link to="/register" style={{ color: 'var(--gold)', fontWeight: 600 }}>Apply Now</Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
