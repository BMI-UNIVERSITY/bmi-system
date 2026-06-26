import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function MfaSetup() {
  const [otpAuthUrl, setOtpAuthUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function setup() {
      try {
        const res = await api.auth.mfaSetup();
        setSecret(res.secret);
        setOtpAuthUrl(res.otp_auth_url);

        const qrSvg = generateQRCode(res.otp_auth_url);
        setQrDataUrl('data:image/svg+xml,' + encodeURIComponent(qrSvg));
      } catch (err: any) {
        setError(err.response?.data?.error || err.message);
      }
    }
    setup();
  }, []);

  async function handleEnable(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.auth.mfaEnable(token);
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    }
  }

  function generateQRCode(text: string): string {
    const size = 256;
    const cellSize = 8;
    const padding = 16;
    const innerSize = size - padding * 2;
    const cells = innerSize / cellSize;

    function xor(a: number, b: number) { return a ^ b; }

    function rsEncode(data: number[]): number[] {
      const gen = [1, 2, 4, 8, 16, 32, 64, 128];
      const res = [...data, 0, 0, 0, 0, 0, 0, 0];
      for (let i = 0; i < data.length; i++) {
        if (res[i] !== 0) {
          const lead = res[i];
          for (let j = 0; j < gen.length; j++) {
            res[i + j] = xor(res[i + j], gen[j]);
          }
        }
      }
      return res;
    }

    function padData(data: number[]): number[] {
      const totalBits = cells * cells;
      const dataBits = data.length * 8;
      const remaining = totalBits - dataBits;
      const padBytes = Math.floor(remaining / 8) - 4;
      for (let i = 0; i < padBytes; i++) {
        data.push(i % 2 === 0 ? 236 : 17);
      }
      return data;
    }

    function getMatrix(data: number[]): number[][] {
      const matrix: number[][] = Array.from({ length: cells }, () => Array(cells).fill(0));
      let idx = 0;
      for (let row = 0; row < cells; row++) {
        for (let col = 0; col < cells; col++) {
          if (idx < data.length * 8) {
            const byteIdx = Math.floor(idx / 8);
            const bitIdx = 7 - (idx % 8);
            matrix[row][col] = (data[byteIdx] >> bitIdx) & 1;
            idx++;
          }
        }
      }
      return matrix;
    }

    const encoder = new TextEncoder();
    const utf8Bytes = Array.from(encoder.encode(text));
    const dataBytes = [text.length, ...utf8Bytes];
    const padded = padData(dataBytes);
    const matrix = getMatrix(padded);

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" fill="white"/>`;
    for (let row = 0; row < cells; row++) {
      for (let col = 0; col < cells; col++) {
        if (matrix[row][col]) {
          const x = padding + col * cellSize;
          const y = padding + row * cellSize;
          svg += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
        }
      }
    }
    svg += '</svg>';
    return svg;
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-[#0f172a]">Set Up Two-Factor Authentication</h2>
          <p className="mt-2 text-sm text-gray-600">Add an extra layer of security to your account.</p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">MFA enabled successfully! Redirecting...</div>}

        {secret && (
          <form onSubmit={handleEnable} className="mt-8 space-y-6">
            <div className="text-center">
              <div className="bg-gray-100 p-4 rounded-lg inline-block mb-4">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Code" className="w-48 h-48 mx-auto" />
                ) : (
                  <div className="w-48 h-48 bg-gray-200 rounded-md flex items-center justify-center">
                    <span className="text-gray-500">QR Code</span>
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-600 mb-2">Scan this QR code with your authenticator app (like Google Authenticator or Authy).</p>
              <p className="text-sm text-gray-500">Or enter this secret key manually:</p>
              <p className="font-mono text-lg text-[#d4af37] mt-2">{secret}</p>
            </div>

            <div>
              <label htmlFor="token" className="block text-sm font-medium text-gray-700">Enter the 6-digit code from your app</label>
              <input
                type="text"
                id="token"
                name="token"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                maxLength={6}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-[#d4af37] focus:border-[#d4af37]"
                placeholder="123456"
              />
            </div>

            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-[#0f172a] bg-[#d4af37] hover:bg-[#c19d2e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#d4af37]"
            >
              Enable Two-Factor Authentication
            </button>
          </form>
        )}

        <div className="text-center">
          <button onClick={() => navigate('/dashboard')} className="text-sm text-gray-600 hover:text-[#d4af37]">
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
