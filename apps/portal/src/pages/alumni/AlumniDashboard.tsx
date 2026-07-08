import { useState } from 'react';

export default function AlumniDashboard() {
  const [forwardEmail, setForwardEmail] = useState('');
  
  const handleTransition = async () => {
    const res = await fetch('/api/alumni/transition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ forwardEmail }),
    });
    if (res.ok) {
      alert('Transitioned to Alumni status successfully.');
    } else {
      alert('Failed to transition.');
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Alumni Portal</h1>
      <div className="bg-white p-6 rounded shadow mb-6">
        <h2 className="text-xl mb-4">Welcome Alumni!</h2>
        <p className="text-gray-600 mb-4">
          As an alumnus, you have limited access to request transcripts and update your contact information.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Set Email Forwarding</label>
            <input 
              type="email" 
              placeholder="personal@email.com" 
              className="border p-2 rounded w-full"
              value={forwardEmail}
              onChange={e => setForwardEmail(e.target.value)}
            />
          </div>
          <button 
            onClick={handleTransition}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Save Alumni Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
