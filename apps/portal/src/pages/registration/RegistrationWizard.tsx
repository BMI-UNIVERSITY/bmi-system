import { useState } from 'react';

const STEPS = ['Personal Details', 'Address', 'Programme', 'Modules', 'Fees', 'Confirm'];

export default function RegistrationWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    setLoading(true);
    try {
      // Mock saving state
      await fetch(`/api/registration/${STEPS[currentStep].toLowerCase().replace(' ', '_')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      });
      setCurrentStep(s => Math.min(s + 1, STEPS.length - 1));
    } catch (e) {
      alert('Failed to save step.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Registration Workflow</h1>
      
      <div className="flex justify-between mb-8">
        {STEPS.map((step, index) => (
          <div key={step} className={`text-sm font-medium ${index === currentStep ? 'text-blue-600' : 'text-gray-400'}`}>
            {index + 1}. {step}
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded shadow min-h-[300px]">
        <h2 className="text-xl mb-4">{STEPS[currentStep]}</h2>
        <p className="text-gray-600 mb-8">Complete the information for this step.</p>
        
        {currentStep === STEPS.length - 1 ? (
          <button 
            className="bg-green-600 text-white px-4 py-2 rounded"
            onClick={() => alert('Registration Complete!')}
          >
            Finish Enrollment
          </button>
        ) : (
          <button 
            className="bg-blue-600 text-white px-4 py-2 rounded"
            onClick={handleNext}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save & Continue'}
          </button>
        )}
      </div>
    </div>
  );
}
