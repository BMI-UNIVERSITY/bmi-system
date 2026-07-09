import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

const STEP_LABELS = ['Personal Details', 'Address', 'Programme', 'Modules', 'Fees', 'Confirm'] as const;

interface PersonalDetails {
  first_name: string; last_name: string; date_of_birth: string;
  gender: string; nationality: string; phone: string;
}
interface Address {
  current_address: string; city: string; state: string; country: string;
  emergency_contact_name: string; emergency_contact_phone: string;
}
interface Programme {
  programme_id: string; programme_name: string; level: string;
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
  programme?: Programme;
  modules?: Modules;
  fees?: Fees;
  confirm?: Confirm;
}

export default function RegistrationWizard() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);
  const [availableModules, setAvailableModules] = useState<ModuleItem[]>([]);
  const [data, setData] = useState<RegistrationData>({});

  useEffect(() => {
    fetchRegistrationStatus();
    fetchModules();
  }, []);

  const fetchRegistrationStatus = async () => {
    try {
      const res = await fetch('/api/registration/status');
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data.current_data || {});
        if (json.data.registration_complete) setCompleted(true);
        const lastIndex = STEP_LABELS.length - 1 - [...STEP_LABELS].reverse().findIndex(
          (_, i) => json.data.current_data?.[STEP_LABELS[STEP_LABELS.length - 1 - i]?.toLowerCase().replace(/ /g, '_')]
        );
        setCurrentStep(Math.max(0, STEP_LABELS.length - 1 - lastIndex));
      }
    } catch {}
  };

  const fetchModules = async () => {
    try {
      const res = await fetch('/api/registration/modules');
      const json = await res.json();
      if (json.success && json.data) setAvailableModules(json.data);
    } catch {}
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
      const stepKey = STEP_LABELS[stepIdx].toLowerCase().replace(/ /g, '_');
      const res = await fetch(`/api/registration/${stepKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify((data as any)[stepKey] || {}),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'Failed to save step');
        return false;
      }
      return true;
    } catch {
      setError('Network error saving step');
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
      const res = await fetch('/api/registration/complete', { method: 'POST' });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'Failed to complete registration');
        return;
      }
      setCompleted(true);
    } catch {
      setError('Network error completing registration');
    } finally {
      setSubmitting(false);
    }
  };

  if (completed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-12 rounded-xl shadow-lg max-w-lg text-center">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Registration Complete!</h1>
          <p className="text-gray-600 mb-6">Welcome to BMI University. You can now access your courses, view your timetable, and begin your academic journey.</p>
          <a href="/student/dashboard" className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700">Go to Dashboard</a>
        </div>
      </div>
    );
  }

  const stepContent = (step: number) => {
    switch (step) {
      case 0: return renderPersonalDetails();
      case 1: return renderAddress();
      case 2: return renderProgramme();
      case 3: return renderModules();
      case 4: return renderFees();
      case 5: return renderConfirm();
      default: return null;
    }
  };

  const renderPersonalDetails = () => {
    const d = data.personal_details || {} as PersonalDetails;
    return (
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
          <input type="text" value={d.first_name || ''} onChange={e => updateField('personal_details', 'first_name', e.target.value)}
            className="w-full border rounded-lg px-3 py-2" placeholder="Your first name" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
          <input type="text" value={d.last_name || ''} onChange={e => updateField('personal_details', 'last_name', e.target.value)}
            className="w-full border rounded-lg px-3 py-2" placeholder="Your last name" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
          <input type="date" value={d.date_of_birth || ''} onChange={e => updateField('personal_details', 'date_of_birth', e.target.value)}
            className="w-full border rounded-lg px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
          <select value={d.gender || ''} onChange={e => updateField('personal_details', 'gender', e.target.value)}
            className="w-full border rounded-lg px-3 py-2">
            <option value="">Select...</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
          <input type="text" value={d.nationality || ''} onChange={e => updateField('personal_details', 'nationality', e.target.value)}
            className="w-full border rounded-lg px-3 py-2" placeholder="e.g., Liberian" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input type="tel" value={d.phone || ''} onChange={e => updateField('personal_details', 'phone', e.target.value)}
            className="w-full border rounded-lg px-3 py-2" placeholder="+231..." />
        </div>
      </div>
    );
  };

  const renderAddress = () => {
    const d = data.address || {} as Address;
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Address</label>
          <textarea value={d.current_address || ''} onChange={e => updateField('address', 'current_address', e.target.value)}
            className="w-full border rounded-lg px-3 py-2" rows={2} placeholder="Street, town/city" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <input type="text" value={d.city || ''} onChange={e => updateField('address', 'city', e.target.value)}
            className="w-full border rounded-lg px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">State/County</label>
          <input type="text" value={d.state || ''} onChange={e => updateField('address', 'state', e.target.value)}
            className="w-full border rounded-lg px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
          <input type="text" value={d.country || ''} onChange={e => updateField('address', 'country', e.target.value)}
            className="w-full border rounded-lg px-3 py-2" placeholder="e.g., Liberia" />
        </div>
        <div></div>
        <div className="col-span-2 border-t pt-4 mt-2">
          <h3 className="font-medium text-gray-800 mb-3">Emergency Contact</h3>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
          <input type="text" value={d.emergency_contact_name || ''} onChange={e => updateField('address', 'emergency_contact_name', e.target.value)}
            className="w-full border rounded-lg px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
          <input type="tel" value={d.emergency_contact_phone || ''} onChange={e => updateField('address', 'emergency_contact_phone', e.target.value)}
            className="w-full border rounded-lg px-3 py-2" />
        </div>
      </div>
    );
  };

  const renderProgramme = () => {
    const d = data.programme || {} as Programme;
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Programme</label>
          <select value={d.programme_id || ''} onChange={e => {
            const opt = e.target.options[e.target.selectedIndex];
            updateField('programme', 'programme_id', e.target.value);
            updateField('programme', 'programme_name', opt.dataset.name || '');
            updateField('programme', 'level', opt.dataset.level || '');
          }} className="w-full border rounded-lg px-3 py-2">
            <option value="">Select a programme...</option>
            <option value="bsc-cs" data-name="BSc Computer Science" data-level="undergraduate">BSc Computer Science</option>
            <option value="bsc-ba" data-name="BSc Business Administration" data-level="undergraduate">BSc Business Administration</option>
            <option value="bsc-nursing" data-name="BSc Nursing" data-level="undergraduate">BSc Nursing</option>
            <option value="ms-cs" data-name="MSc Computer Science" data-level="graduate">MSc Computer Science</option>
            <option value="ms-ed" data-name="MSc Education" data-level="graduate">MSc Education</option>
            <option value="phd-theology" data-name="PhD Theology" data-level="doctorate">PhD Theology</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Study Mode</label>
          <div className="space-y-2">
            {(['full_time', 'part_time', 'distance'] as const).map(mode => (
              <label key={mode} className="flex items-center gap-2">
                <input type="radio" name="study_mode" value={mode} checked={d.study_mode === mode}
                  onChange={e => updateField('programme', 'study_mode', e.target.value)} className="accent-blue-600" />
                <span className="capitalize">{mode.replace('_', ' ')}</span>
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
      return <p className="text-gray-500 text-center py-8">No modules available yet. Select a programme first.</p>;
    }

    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-600">Select the modules for this semester:</p>
          <span className="text-sm font-medium bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
            {d.total_credits || 0} Credits
          </span>
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {availableModules.map(m => (
            <label key={m.id} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-gray-50 ${d.selected_course_ids.includes(m.id) ? 'border-blue-500 bg-blue-50' : ''}`}>
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={d.selected_course_ids.includes(m.id)}
                  onChange={() => toggleModule(m.id)} className="accent-blue-600" />
                <div>
                  <span className="font-medium text-gray-900">{m.code}</span>
                  <span className="text-gray-600 ml-2">{m.name}</span>
                </div>
              </div>
              <span className="text-sm text-gray-500">{m.credits} cr</span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  const renderFees = () => {
    const d = data.fees || {} as Fees;
    return (
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-800 mb-2">Tuition & Fees</h3>
          <p className="text-sm text-yellow-700">
            Tuition fees vary by programme and study mode. A detailed invoice will be generated after registration.
            You agree to pay all applicable fees as outlined in the university fee schedule.
          </p>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={d.accepted_fee_structure || false}
            onChange={e => updateField('fees', 'accepted_fee_structure', e.target.checked)}
            className="accent-blue-600" />
          <span className="text-sm">I accept the fee structure and agree to pay all applicable tuition and fees</span>
        </label>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
          <select value={d.payment_method || ''} onChange={e => updateField('fees', 'payment_method', e.target.value)}
            className="w-full border rounded-lg px-3 py-2">
            <option value="">Select payment method...</option>
            <option value="bank_transfer">Bank Transfer / Wire</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="card">Credit / Debit Card</option>
            <option value="scholarship">Full Scholarship</option>
            <option value="sponsor">Sponsor / Employer</option>
          </select>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={d.scholarship_claimed || false}
            onChange={e => updateField('fees', 'scholarship_claimed', e.target.checked)}
            className="accent-blue-600" />
          <span className="text-sm">I am claiming a scholarship</span>
        </label>
        {d.scholarship_claimed && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scholarship Details</label>
            <textarea value={d.scholarship_details || ''} onChange={e => updateField('fees', 'scholarship_details', e.target.value)}
              className="w-full border rounded-lg px-3 py-2" rows={2} placeholder="Name of scholarship / sponsor" />
          </div>
        )}
      </div>
    );
  };

  const renderConfirm = () => {
    const d = data.confirm || {} as Confirm;
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Registration Summary</h3>
        <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
          {data.personal_details && <p><strong>Name:</strong> {data.personal_details.first_name} {data.personal_details.last_name}</p>}
          {data.programme && <p><strong>Programme:</strong> {data.programme.programme_name} ({data.programme.study_mode.replace('_', ' ')})</p>}
          {data.modules && <p><strong>Modules Selected:</strong> {data.modules.selected_course_ids.length} ({data.modules.total_credits} credits)</p>}
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={d.data_accuracy_confirmed || false}
            onChange={e => updateField('confirm', 'data_accuracy_confirmed', e.target.checked)}
            className="accent-blue-600" />
          <span className="text-sm">I confirm that all information provided is accurate and complete</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={d.accepted_terms || false}
            onChange={e => updateField('confirm', 'accepted_terms', e.target.checked)}
            className="accent-blue-600" />
          <span className="text-sm">I accept the university's terms and conditions</span>
        </label>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Digital Signature (type your full name)</label>
          <input type="text" value={d.signed_name || ''} onChange={e => updateField('confirm', 'signed_name', e.target.value)}
            className="w-full border rounded-lg px-3 py-2" placeholder="Type your full legal name" />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Registration</h1>
        <p className="text-gray-600 mb-8">Complete all steps to finish your enrollment at BMI University.</p>

        <div className="flex items-center mb-8 overflow-x-auto pb-2">
          {STEP_LABELS.map((label, idx) => (
            <div key={label} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium shrink-0
                ${idx < currentStep ? 'bg-green-500 text-white' : idx === currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {idx < currentStep ? '✓' : idx + 1}
              </div>
              <span className={`ml-2 text-sm font-medium whitespace-nowrap ${idx === currentStep ? 'text-blue-600' : 'text-gray-500'}`}>{label}</span>
              {idx < STEP_LABELS.length - 1 && <div className="w-8 h-0.5 mx-2 bg-gray-300" />}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        <div className="bg-white rounded-xl shadow-sm border p-6 min-h-[350px]">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">{STEP_LABELS[currentStep]}</h2>
          {stepContent(currentStep)}
        </div>

        <div className="flex justify-between mt-6">
          <button onClick={handlePrevious} disabled={currentStep === 0}
            className="px-6 py-2.5 border rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
            Previous
          </button>
          {currentStep < STEP_LABELS.length - 1 ? (
            <button onClick={handleNext} disabled={loading}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Saving...' : 'Save & Continue'}
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting}
              className="px-8 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium">
              {submitting ? 'Submitting...' : 'Complete Registration'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}