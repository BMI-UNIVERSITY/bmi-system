import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { PROGRAMS } from '@bmi/shared';
import { z } from 'zod';

const STEPS = ['Program', 'Personal Info', 'Background', 'Statement', 'Review & Submit'];
const STORAGE_KEY = 'bmi_apply_form';

// Zod schemas (matching backend definitions)
const SubmitApplicationSchema = z.object({
  program: z.string().min(1, 'Program is required'),
  degree_level: z.string().min(1, 'Degree level is required'),
  personal_statement: z.string()
    .min(100, 'Personal statement must be at least 100 characters')
    .max(10000, 'Personal statement must not exceed 10000 characters'),
  prior_education: z.string()
    .min(20, 'Prior education must be at least 20 characters')
    .max(5000, 'Prior education must not exceed 5000 characters'),
});

export default function Apply() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load saved form:', e);
    }
    return {
      program: '',
      degree_level: '',
      prior_education: '',
      personal_statement: '',
    };
  });

  // Auto-save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch (e) {
      console.warn('Failed to save form:', e);
    }
  }, [form]);

  // Auto-save to API (debounced 30s, quota protection)
  const lastSavedAt = useRef<number>(0);
  const saveTimeout = useRef<number | null>(null);
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Session timeout logic
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const sessionTimeoutRef = useRef<number | null>(null);

  const resetSessionTimer = useCallback(() => {
    setShowTimeoutWarning(false);
    if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current as any);
    // 15 minutes = 900000 ms before warning shows
    sessionTimeoutRef.current = setTimeout(() => {
      setShowTimeoutWarning(true);
    }, 15 * 60 * 1000) as any;
  }, []);

  useEffect(() => {
    // Listen to user activity to reset timer
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const handleActivity = () => {
      if (!showTimeoutWarning) {
        resetSessionTimer();
      }
    };
    events.forEach(e => window.addEventListener(e, handleActivity));
    resetSessionTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current as any);
    };
  }, [resetSessionTimer, showTimeoutWarning]);

  useEffect(() => {
    // Only auto-save if >50% complete (Step 2 or higher)
    if (step < 2) return;

    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current as any);
    }

    const now = Date.now();
    const timeSinceLastSave = now - lastSavedAt.current;
    
    // Ensure we don't hit the API more than once every 30 seconds
    const delay = Math.max(30000 - timeSinceLastSave, 2000);

    setDraftStatus('idle'); // Indicate pending save

    saveTimeout.current = setTimeout(() => {
      setDraftStatus('saving');
      api.applications.saveDraft({
        current_step: step,
        application_data: form
      })
      .then(() => {
        lastSavedAt.current = Date.now();
        setDraftStatus('saved');
        setTimeout(() => setDraftStatus('idle'), 3000);
      })
      .catch(err => {
        console.warn('Background draft save failed:', err);
        setDraftStatus('error');
      });
    }, delay);

    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current as any);
    };
  }, [form, step]);

  const update = useCallback((field: string, value: string) => setForm((f: any) => ({ ...f, [field]: value })), []);

  const selectProgram = (p: { label: string; level: string }) => {
    update('program', p.label);
    update('degree_level', p.level);
  };

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep(s => Math.max(s - 1, 0));

  const canProceedStep0 = SubmitApplicationSchema.pick({ program: true, degree_level: true }).safeParse(form).success;
  const canProceedStep1 = true;
  const canProceedStep2 = SubmitApplicationSchema.pick({ prior_education: true }).safeParse(form).success;
  const canProceedStep3 = SubmitApplicationSchema.pick({ personal_statement: true }).safeParse(form).success;

  const handleSubmit = async () => {
    setError('');
    
    const validation = SubmitApplicationSchema.safeParse(form);
    if (!validation.success) {
      setError('Please fix the errors in the form before submitting.');
      return;
    }

    setLoading(true);
    try {
      await api.applications.submit({
        program: form.program,
        degree_level: form.degree_level,
        personal_statement: form.personal_statement,
        prior_education: form.prior_education,
      });
      // Clear saved form on success
      localStorage.removeItem(STORAGE_KEY);
      navigate('/status?submitted=1');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ padding: '5rem 1.5rem 3rem', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 900 }}>
            Your Application
          </h1>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              Welcome, {user?.first_name}. Complete all steps to submit your application.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {step > 1 && (
                <span style={{ fontSize: '0.8rem', color: draftStatus === 'saving' ? 'var(--navy)' : draftStatus === 'saved' ? 'var(--success)' : draftStatus === 'error' ? 'var(--danger)' : 'var(--text-muted)' }}>
                  {draftStatus === 'saving' ? 'Saving draft...' : draftStatus === 'saved' ? '✓ Draft saved' : draftStatus === 'error' ? '⚠️ Save failed' : ''}
                </span>
              )}
              <span className="badge badge-undergraduate" style={{ background: 'var(--slate)', color: 'white' }}>
                Step {step + 1} of {STEPS.length} — {Math.round((step / (STEPS.length - 1)) * 100)}% complete
              </span>
            </div>
          </div>
        </div>

        {showTimeoutWarning && (
          <div className="alert alert-warning" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>Session Timeout Warning</strong>
              <p style={{ margin: 0 }}>You have been inactive for 15 minutes. To prevent data loss, please continue your session.</p>
            </div>
            <button className="btn btn-navy" onClick={resetSessionTimer} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
              Continue Session
            </button>
          </div>
        )}

        <div className="steps">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className="step"
              onClick={() => i < step ? setStep(i) : undefined}
              role="button"
              tabIndex={i < step ? 0 : -1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && i < step) setStep(i);
              }}
              style={{ cursor: i < step ? 'pointer' : 'default' }}
            >
              <div className={`step-circle ${i < step ? 'done' : i === step ? 'active' : ''}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className="step-label" style={{ color: i === step ? 'var(--navy)' : 'var(--slate)' }}>{label}</span>
              {i < STEPS.length - 1 && <div className={`step-line ${i < step ? 'done' : ''}`} />}
            </div>
          ))}
        </div>

        <div className="card">
          {error && <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>{error}</div>}

          {step === 0 && (
            <div>
              <h2 style={{ marginBottom: '0.5rem' }}>Choose Your Program</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Select the degree program you wish to apply to.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {PROGRAMS.map((p) => (
                  <div key={p.label}
                    onClick={() => selectProgram(p)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') selectProgram(p); }}
                    aria-pressed={form.program === p.label}
                    style={{
                      padding: '1rem 1.25rem',
                      borderRadius: 'var(--radius-sm)',
                      border: `2px solid ${form.program === p.label ? 'var(--gold)' : 'var(--border)'}`,
                      background: form.program === p.label ? 'rgba(212,175,55,0.06)' : 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.2s',
                    }}>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{p.label}</span>
                    <span className={`badge badge-${p.level}`} style={{ textTransform: 'capitalize' }}>{p.level}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 style={{ marginBottom: '0.5rem' }}>Personal Information</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Your contact information on file. To update, please contact admissions.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div><strong>Name:</strong> {user?.first_name} {user?.last_name}</div>
                <div><strong>Email:</strong> {user?.email}</div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h2 style={{ marginBottom: '0.25rem' }}>Educational Background</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Tell us about your prior education and academic history.</p>
              <div className="form-group">
                <label className="form-label" htmlFor="prior_education">Prior Education & Academic History *</label>
                <textarea
                  id="prior_education"
                  className="form-textarea"
                  style={{ minHeight: 200 }}
                  value={form.prior_education}
                  onChange={e => update('prior_education', e.target.value)}
                  placeholder="Please describe your educational history, including institutions attended, degrees earned, graduation dates, and any relevant certifications or training..."
                  required
                  aria-describedby="prior-edu-hint"
                  maxLength={5000}
                />
                <span id="prior-edu-hint" className="form-hint">{form.prior_education.length}/5000 characters (minimum 20)</span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h2 style={{ marginBottom: '0.25rem' }}>Personal Statement</h2>
              <div className="alert alert-info" style={{ fontSize: '0.875rem' }} role="note">
                Please address: (1) your vocational goals and calling, (2) your church involvement, (3) why you chose BMI University, and (4) an assessment of your strengths and weaknesses.
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="personal_statement">Personal Statement *</label>
                <textarea
                  id="personal_statement"
                  className="form-textarea"
                  style={{ minHeight: 280 }}
                  value={form.personal_statement}
                  onChange={e => update('personal_statement', e.target.value)}
                  placeholder="Write your personal statement here (1–2 pages recommended)..."
                  required
                  aria-describedby="statement-hint"
                  maxLength={10000}
                />
                <span id="statement-hint" className="form-hint">{form.personal_statement.length}/10000 characters (minimum 100)</span>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 style={{ marginBottom: '0.5rem' }}>Review & Submit</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Please review your application before submitting.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  { label: 'Applicant', value: `${user?.first_name} ${user?.last_name} (${user?.email})` },
                  { label: 'Program', value: form.program },
                  { label: 'Degree Level', value: form.degree_level.charAt(0).toUpperCase() + form.degree_level.slice(1) },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.85rem 1rem', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600 }}>{row.label}</span>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', textAlign: 'right', maxWidth: '60%' }}>{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="alert alert-warning" style={{ marginTop: '1.5rem', fontSize: '0.875rem' }} role="note">
                ⚠️ Once submitted, you cannot edit your application. Document uploads will be available after submission on your status page. You will receive a confirmation email after submission.
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', gap: '1rem' }}>
            {step > 0 ? (
              <button className="btn btn-outline" onClick={prev}>← Back</button>
            ) : <div />}
            {step < STEPS.length - 1 ? (
              <button
                className="btn btn-gold"
                onClick={next}
                disabled={step === 0 ? !canProceedStep0 : step === 2 ? !canProceedStep2 : step === 3 ? !canProceedStep3 : false}
                aria-label={step === 0 ? 'Continue to personal info' : step === 2 ? 'Continue to statement' : 'Continue'}
              >
                Continue →
              </button>
            ) : (
              <button className="btn btn-navy" onClick={handleSubmit} disabled={loading}>
                {loading ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Submitting...</> : '✓ Submit Application'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
