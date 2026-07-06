import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { PROGRAMS } from '@bmi/shared';

const STEPS = ['Program', 'Personal Info', 'Background', 'Statement', 'Review & Submit'];
const STORAGE_KEY = 'bmi_apply_form';

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

  const update = useCallback((field: string, value: string) => setForm((f: any) => ({ ...f, [field]: value })), []);

  const selectProgram = (p: { label: string; level: string }) => {
    update('program', p.label);
    update('degree_level', p.level);
  };

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep(s => Math.max(s - 1, 0));

  const canProceedStep0 = form.program && form.degree_level;
  const canProceedStep1 = true;
  const canProceedStep2 = form.prior_education.trim().length >= 20;
  const canProceedStep3 = form.personal_statement.trim().length >= 100;

  const handleSubmit = async () => {
    setError('');
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
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Welcome, {user?.first_name}. Complete all steps to submit your application.
          </p>
        </div>

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
