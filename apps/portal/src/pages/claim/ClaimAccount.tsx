import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ClaimAccount() {
  const [admissionCode, setAdmissionCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admissionCode, password }),
      });
      if (res.ok) {
        alert('Account claimed successfully! Please login.');
        navigate('/login');
      } else {
        const data = (await res.json()) as any;
        alert(data?.error || 'Failed to claim account');
      }
    } catch (err) {
      alert('An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded shadow">
        <h2 className="text-2xl font-bold mb-6 text-center">Claim Your Student Account</h2>
        <form onSubmit={handleClaim} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Admission Code</label>
            <input 
              type="text" 
              className="w-full border p-2 rounded" 
              value={admissionCode} 
              onChange={e => setAdmissionCode(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">New Password</label>
            <input 
              type="password" 
              className="w-full border p-2 rounded" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700" 
            disabled={loading}
          >
            {loading ? 'Claiming...' : 'Claim Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
