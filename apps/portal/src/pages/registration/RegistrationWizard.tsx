import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

const STEP_LABELS = ['Personal Details', 'Address', 'Program', 'Modules', 'Fees', 'Confirm'] as const;

const COUNTRIES = [
  { name: 'Liberia', code: '+231' },
  { name: 'Kenya', code: '+254' },
  { name: 'Nigeria', code: '+234' },
  { name: 'Ghana', code: '+233' },
  { name: 'Sierra Leone', code: '+232' },
  { name: 'South Africa', code: '+27' },
  { name: 'Uganda', code: '+256' },
  { name: 'Tanzania', code: '+255' },
  { name: 'Rwanda', code: '+250' },
  { name: 'Egypt', code: '+20' },
  { name: 'Ethiopia', code: '+251' },
  { name: 'United States', code: '+1' },
  { name: 'United Kingdom', code: '+44' },
  { name: 'Canada', code: '+1' },
  { name: 'Australia', code: '+61' },
  { name: 'India', code: '+91' },
  { name: 'China', code: '+86' },
  { name: 'Brazil', code: '+55' },
  { name: 'Other', code: '+' }
].sort((a, b) => a.name === 'Liberia' ? -1 : b.name === 'Liberia' ? 1 : a.name.localeCompare(b.name));

interface PersonalDetails {
  first_name: string; last_name: string; date_of_birth: string;
  gender: string; nationality: string; phone: string;
}
interface Address {
  current_address: string; city: string; state: string; country: string;
  emergency_contact_name: string; emergency_contact_phone: string;
}
interface DbProgram {
  id: string; name: string; code: string; level: string; degree_type: string;
}
interface Program {
  program_id: string; program_name: string; level: string;
  study_mode: 'full_time' | 'part_time' | 'distance';
}
interface ModuleItem {
  id: string; code: string; name: string; credits: number; level: string;
}
interface Modules {
  selected_course_ids: string[]; total_credits: number;
}
interface Fees {
  accepted_fee_structure: boolean; payment_method: string;
  scholarship_claimed: boolean; scholarship_details?: string;
}
interface Confirm {
  accepted_terms: boolean; data_accuracy_confirmed: boolean;
  signed_name: string; signed_date: string;
}
interface RegistrationData {
  personal_details?: PersonalDetails;
  address?: Address;
  program?: Program;
  modules?: Modules;
  fees?: Fees;
  confirm?: Confirm;
}

export default function RegistrationWizard() {

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);
  const [availableModules, setAvailableModules] = useState<ModuleItem[]>([]);
  const [availablePrograms, setAvailablePrograms] = useState<DbProgram[]>([]);
  const [data, setData] = useState<RegistrationData>({});

  useEffect(() => {
    fetchRegistrationStatus();
    fetchModules();
    fetchPrograms();
  }, []);

  const fetchRegistrationStatus = async () => {
    try {
      const res = await api.registration.getStatus();
      if (res) {
        setData(res.current_data || {});
        if (res.registration_complete) setCompleted(true);
        const lastIndex = STEP_LABELS.length - 1 - [...STEP_LABELS].reverse().findIndex(
          (_, i) => res.current_data?.[STEP_LABELS[STEP_LABELS.length - 1 - i]?.toLowerCase().replace(/ /g, '_')]
        );
        setCurrentStep(Math.max(0, STEP_LABELS.length - 1 - lastIndex));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchModules = async () => {
    try {
      const res = await api.registration.getModules();
      if (Array.isArray(res)) setAvailableModules(res);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPrograms = async () => {
    try {
      const res = await api.registration.getPrograms();
      if (Array.isArray(res)) setAvailablePrograms(res.filter(p => p.id && p.name));
    } catch (err) {
      console.error(err);
    }
  };

  const updateField = (step: string, field: string, value: any) => {
    setData(prev => ({
      ...prev,
      [step]: { ...(prev as any)[step], [field]: value }
    }));
  };

  const saveStep = async (stepIdx: number) => {
    setLoading(true);
    setError('');
    try {
      let stepKey = STEP_LABELS[stepIdx].toLowerCase().replace(/ /g, '_');
      if (stepKey === 'programme') stepKey = 'program';
      await api.registration.saveStep(stepKey, (data as any)[stepKey] || {});
      return true;
    } catch (err: any) {
      setError(err.message || 'Network error saving step');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    const ok = await saveStep(currentStep);
    if (ok) setCurrentStep(s => Math.min(s + 1, STEP_LABELS.length - 1));
  };

  const handlePrevious = () => {
    setCurrentStep(s => Math.max(0, s - 1));
  };

  const handleSubmit = async () => {
    const ok = await saveStep(currentStep);
    if (!ok) return;
    setSubmitting(true);
    setError('');
    try {
      await api.registration.complete();
      setCompleted(true);
    } catch (err: any) {
      setError(err.message || 'Network error completing registration');
    } finally {
      setSubmitting(false);
    }
  };

  if (completed) {
    return (
      <div className="page-center">
        <div className="card" style={{ maxWidth: 520, textAlign: 'center', padding: '3.5rem 3rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎓</div>
          <div className="gold-bar" style={{ margin: '0 auto 1.5rem' }} />
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', color: 'var(--navy)', marginBottom: '1rem' }}>
            Registration Complete!
          </h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.7 }}>
            Welcome to BMI University. You can now access your courses, view your timetable, and begin your academic journey.
          </p>
          <a href="/student/dashboard" className="btn btn-gold btn-full">Go to Dashboard</a>
        </div>
      </div>
    );
  }

  const stepContent = (step: number) => {
    switch (step) {
      case 0: return renderPersonalDetails();
      case 1: return renderAddress();
      case 2: return renderProgram();
      case 3: return renderModules();
      case 4: return renderFees();
      case 5: return renderConfirm();
      default: return null;
    }
  };

  const renderPersonalDetails = () => {
    const d = data.personal_details || {} as PersonalDetails;
    return (
      <div className="form-grid-2">
        <div className="form-group">
          <label className="form-label">First Name</label>
          <input type="text" className="form-input" value={d.first_name || ''} onChange={e => updateField('personal_details', 'first_name', e.target.value)} placeholder="Your first name" />
        </div>
        <div className="form-group">
          <label className="form-label">Last Name</label>
          <input type="text" className="form-input" value={d.last_name || ''} onChange={e => updateField('personal_details', 'last_name', e.target.value)} placeholder="Your last name" />
        </div>
        <div className="form-group">
          <label className="form-label">Date of Birth</label>
          <input type="date" className="form-input" value={d.date_of_birth || ''} onChange={e => updateField('personal_details', 'date_of_birth', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Gender</label>
          <select className="form-select" value={d.gender || ''} onChange={e => updateField('personal_details', 'gender', e.target.value)}>
            <option value="">Select...</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Nationality</label>
          <select 
            className="form-select" 
            value={(data.personal_details as any)?.nationality || ''} 
            onChange={(e) => {
              const nationality = e.target.value;
              updateField('personal_details', 'nationality', nationality);
              const country = COUNTRIES.find(c => c.name === nationality);
              if (country) {
                const currentPhone = (data.personal_details as any)?.phone || '';
                // Only replace/prepend if empty or doesn't have a specific dial code yet
                if (!currentPhone || (!currentPhone.startsWith('+') && currentPhone.length < 5) || currentPhone === '+') {
                  updateField('personal_details', 'phone', country.code + (currentPhone === '+' ? '' : currentPhone));
                } else {
                  // If it starts with + but is a different code, we could replace it, but let's be safe and just prepend if they delete the old one
                  const existingMatch = COUNTRIES.find(c => currentPhone.startsWith(c.code));
                  if (existingMatch && existingMatch.code !== country.code) {
                     updateField('personal_details', 'phone', currentPhone.replace(existingMatch.code, country.code));
                  } else if (!currentPhone.startsWith('+')) {
                     updateField('personal_details', 'phone', country.code + currentPhone);
                  }
                }
              }
            }}
          >
            <option value="">Select...</option>
            {COUNTRIES.map(c => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Phone</label>
          <input type="tel" className="form-input" value={d.phone || ''} onChange={e => updateField('personal_details', 'phone', e.target.value)} placeholder="+231..." />
        </div>
      </div>
    );
  };

  const renderAddress = () => {
    const d = data.address || {} as Address;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="form-group">
          <label className="form-label">Current Address</label>
          <textarea className="form-textarea" value={d.current_address || ''} onChange={e => updateField('address', 'current_address', e.target.value)} rows={2} placeholder="Street, town/city" style={{ minHeight: 80 }} />
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">City</label>
            <input type="text" className="form-input" value={d.city || ''} onChange={e => updateField('address', 'city', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">State / County</label>
            <input type="text" className="form-input" value={d.state || ''} onChange={e => updateField('address', 'state', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Country</label>
            <input type="text" className="form-input" value={d.country || ''} onChange={e => updateField('address', 'country', e.target.value)} placeholder="e.g., Liberia" />
          </div>
        </div>
        <div style={{ borderTop: '1.5px solid var(--border)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
          <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--navy)', marginBottom: '1rem', fontSize: '0.95rem' }}>
            🚨 Emergency Contact
          </p>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Contact Name</label>
              <input type="text" className="form-input" value={d.emergency_contact_name || ''} onChange={e => updateField('address', 'emergency_contact_name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Phone</label>
              <input type="tel" className="form-input" value={d.emergency_contact_phone || ''} onChange={e => updateField('address', 'emergency_contact_phone', e.target.value)} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProgram = () => {
    const d = data.program || {} as Program;
    const modes = [
      { value: 'full_time', label: 'Full Time', icon: '🏛️', desc: 'On-campus, standard academic schedule' },
      { value: 'part_time', label: 'Part Time', icon: '📅', desc: 'Flexible schedule for working students' },
      { value: 'distance', label: 'Distance Learning', icon: '🌐', desc: 'Online, study from anywhere' },
    ] as const;
    // Group programs by level for a clean optgroup layout
    const LEVEL_LABELS: Record<string, string> = {
      undergraduate: 'Undergraduate',
      graduate: 'Graduate',
      doctorate: 'Doctorate',
      certificate: 'Graduate Certificates',
    };
    const LEVEL_ORDER = ['undergraduate', 'graduate', 'doctorate', 'certificate'];
    const grouped = LEVEL_ORDER.reduce<Record<string, DbProgram[]>>((acc, lvl) => {
      const items = availablePrograms.filter(p => p.level === lvl);
      if (items.length) acc[lvl] = items;
      return acc;
    }, {});

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="form-group">
          <label className="form-label">Program</label>
          <select className="form-select" value={d.program_id || ''} onChange={e => {
            const opt = e.target.options[e.target.selectedIndex];
            updateField('program', 'program_id', e.target.value);
            updateField('program', 'program_name', opt.dataset.name || '');
            updateField('program', 'level', opt.dataset.level || '');
          }}>
            <option value="">{availablePrograms.length === 0 ? 'Loading programmes…' : 'Select a programme…'}</option>
            {Object.entries(grouped).map(([lvl, progs]) => (
              <optgroup key={lvl} label={LEVEL_LABELS[lvl] ?? lvl}>
                {progs.map(p => (
                  <option key={p.id} value={p.id} data-name={p.name} data-level={p.level}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Study Mode</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {modes.map(mode => (
              <label key={mode.value} style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '1rem 1.25rem', borderRadius: 'var(--radius-sm)',
                border: `2px solid ${d.study_mode === mode.value ? 'var(--gold)' : 'var(--border)'}`,
                background: d.study_mode === mode.value ? 'rgba(212,175,55,0.06)' : 'white',
                cursor: 'pointer', transition: 'all 0.2s',
              }}>
                <input type="radio" name="study_mode" value={mode.value} checked={d.study_mode === mode.value}
                  onChange={e => updateField('program', 'study_mode', e.target.value)}
                  style={{ accentColor: 'var(--gold)', width: 18, height: 18, flexShrink: 0 }} />
                <span style={{ fontSize: '1.3rem' }}>{mode.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '0.95rem' }}>{mode.label}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>{mode.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderModules = () => {
    const d = data.modules || { selected_course_ids: [], total_credits: 0 };
    const toggleModule = (courseId: string) => {
      const selected = d.selected_course_ids.includes(courseId)
        ? d.selected_course_ids.filter(id => id !== courseId)
        : [...d.selected_course_ids, courseId];
      const totalCredits = availableModules
        .filter(m => selected.includes(m.id))
        .reduce((sum, m) => sum + m.credits, 0);
      setData(prev => ({
        ...prev,
        modules: { selected_course_ids: selected, total_credits: totalCredits }
      }));
    };

    if (availableModules.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--slate)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📚</div>
          <p>No modules available yet. Please select a program first.</p>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Select modules for this semester:</p>
          <span style={{
            background: 'var(--navy)', color: 'var(--gold)', padding: '0.35rem 1rem',
            borderRadius: 999, fontSize: '0.85rem', fontWeight: 700, fontFamily: 'var(--font-heading)'
          }}>
            {d.total_credits || 0} Credits
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 380, overflowY: 'auto', paddingRight: 4 }}>
          {availableModules.map(m => {
            const selected = d.selected_course_ids.includes(m.id);
            return (
              <label key={m.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.9rem 1.1rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                border: `2px solid ${selected ? 'var(--gold)' : 'var(--border)'}`,
                background: selected ? 'rgba(212,175,55,0.06)' : 'white', transition: 'all 0.2s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input type="checkbox" checked={selected} onChange={() => toggleModule(m.id)}
                    style={{ accentColor: 'var(--gold)', width: 16, height: 16 }} />
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '0.9rem' }}>{m.code}</span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem', fontSize: '0.9rem' }}>{m.name}</span>
                  </div>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--slate)', fontWeight: 600, flexShrink: 0 }}>{m.credits} cr</span>
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  const renderFees = () => {
    const d = data.fees || {} as Fees;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="alert alert-warning">
          <strong>💰 Tuition &amp; Fees</strong><br />
          <span style={{ fontSize: '0.9rem', marginTop: '0.4rem', display: 'block' }}>
            Tuition fees vary by program and study mode. A detailed invoice will be generated after registration.
            You agree to pay all applicable fees as outlined in the university fee schedule.
          </span>
        </div>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={d.accepted_fee_structure || false}
            onChange={e => updateField('fees', 'accepted_fee_structure', e.target.checked)}
            style={{ accentColor: 'var(--gold)', width: 18, height: 18, marginTop: 2, flexShrink: 0 }} />
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            I accept the fee structure and agree to pay all applicable tuition and fees
          </span>
        </label>
        <div className="form-group">
          <label className="form-label">Preferred Payment Method</label>
          <select className="form-select" value={d.payment_method || ''} onChange={e => updateField('fees', 'payment_method', e.target.value)}>
            <option value="">Select payment method...</option>
            <option value="bank_transfer">Bank Transfer / Wire</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="card">Credit / Debit Card</option>
            <option value="scholarship">Full Scholarship</option>
            <option value="sponsor">Sponsor / Employer</option>
          </select>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={d.scholarship_claimed || false}
            onChange={e => updateField('fees', 'scholarship_claimed', e.target.checked)}
            style={{ accentColor: 'var(--gold)', width: 18, height: 18 }} />
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>I am claiming a scholarship or sponsorship</span>
        </label>
        {d.scholarship_claimed && (
          <div className="form-group">
            <label className="form-label">Scholarship / Sponsor Details</label>
            <textarea className="form-textarea" value={d.scholarship_details || ''} onChange={e => updateField('fees', 'scholarship_details', e.target.value)}
              rows={2} placeholder="Name of scholarship / sponsor organisation" style={{ minHeight: 80 }} />
          </div>
        )}
      </div>
    );
  };

  const renderConfirm = () => {
    const d = data.confirm || {} as Confirm;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{
          background: 'var(--bg)', borderRadius: 'var(--radius-sm)',
          border: '1.5px solid var(--border)', padding: '1.25rem',
        }}>
          <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--navy)', marginBottom: '1rem' }}>
            Registration Summary
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            {data.personal_details && <div><strong style={{ color: 'var(--navy)' }}>Name:</strong> {data.personal_details.first_name} {data.personal_details.last_name}</div>}
            {data.program && <div><strong style={{ color: 'var(--navy)' }}>Program:</strong> {data.program.program_name} ({data.program.study_mode.replace('_', ' ')})</div>}
            {data.modules && <div><strong style={{ color: 'var(--navy)' }}>Modules Selected:</strong> {data.modules.selected_course_ids.length} ({data.modules.total_credits} credits)</div>}
            {data.address && <div><strong style={{ color: 'var(--navy)' }}>Location:</strong> {data.address.city}, {data.address.country}</div>}
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={d.data_accuracy_confirmed || false}
            onChange={e => updateField('confirm', 'data_accuracy_confirmed', e.target.checked)}
            style={{ accentColor: 'var(--gold)', width: 18, height: 18, marginTop: 2, flexShrink: 0 }} />
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>I confirm that all information provided is accurate and complete</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={d.accepted_terms || false}
            onChange={e => updateField('confirm', 'accepted_terms', e.target.checked)}
            style={{ accentColor: 'var(--gold)', width: 18, height: 18, marginTop: 2, flexShrink: 0 }} />
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>I accept BMI University's terms and conditions</span>
        </label>
        <div className="form-group">
          <label className="form-label">Digital Signature — type your full legal name</label>
          <input type="text" className="form-input" value={d.signed_name || ''} onChange={e => updateField('confirm', 'signed_name', e.target.value)} placeholder="Your full legal name" />
          <span className="form-hint">By typing your name you are providing a digital signature</span>
        </div>
      </div>
    );
  };

  const stepIcons = ['👤', '🏠', '🎓', '📚', '💳', '✅'];

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.9rem', color: 'var(--navy)', marginBottom: '0.4rem' }}>
            Student Registration
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Complete all steps to finalise your enrollment at BMI University.</p>
          <div className="gold-bar" style={{ marginTop: '0.75rem' }} />
        </div>

        {/* Step Indicator */}
        <div className="steps" style={{ marginBottom: '2rem', overflowX: 'auto', paddingBottom: 4 }}>
          {STEP_LABELS.map((label, idx) => (
            <div key={label} className="step" style={{ minWidth: 0 }}>
              <div className={`step-circle ${idx < currentStep ? 'done' : idx === currentStep ? 'active' : ''}`}>
                {idx < currentStep ? '✓' : idx + 1}
              </div>
              <span className="step-label" style={{
                color: idx === currentStep ? 'var(--gold-dark)' : idx < currentStep ? 'var(--navy)' : 'var(--slate)',
                fontWeight: idx === currentStep ? 700 : 500,
                whiteSpace: 'nowrap', marginLeft: '0.4rem'
              }}>
                {label}
              </span>
              {idx < STEP_LABELS.length - 1 && (
                <div className={`step-line ${idx < currentStep ? 'done' : ''}`} />
              )}
            </div>
          ))}
        </div>

        {/* Error banner */}
        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>{error}</div>
        )}

        {/* Step card */}
        <div className="card" style={{ minHeight: 380 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>{stepIcons[currentStep]}</span>
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', color: 'var(--navy)', lineHeight: 1.2 }}>
                {STEP_LABELS[currentStep]}
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--slate)', marginTop: 2 }}>
                Step {currentStep + 1} of {STEP_LABELS.length}
              </p>
            </div>
          </div>
          {stepContent(currentStep)}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="btn btn-outline"
          >
            Previous
          </button>
          {currentStep < STEP_LABELS.length - 1 ? (
            <button onClick={handleNext} disabled={loading} className="btn btn-gold">
              {loading ? 'Saving...' : 'Save & Continue'}
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting} className="btn btn-navy">
              {submitting ? 'Submitting...' : 'Complete Registration'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}