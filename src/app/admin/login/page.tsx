'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'password' | 'otp'>('password');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const otpRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (step === 'otp') otpRef.current?.focus();
  }, [step]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const body = step === 'otp' ? { password, otp } : { password };
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.step === 'otp') {
      setStep('otp');
      setLoading(false);
      return;
    }

    if (res.ok && data.ok) {
      router.push('/admin');
      router.refresh();
      return;
    }

    setError(data.error ?? 'Login failed');
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <Image src="/images/Boko-Logo.png" alt="BokoBoko" width={80} height={40} className="h-10 w-auto" />
          <h1 className="text-lg font-bold text-[#333]">Admin Portal</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 'password' ? (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2d5a27]"
              />
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-600">Authenticator code</label>
                <button
                  type="button"
                  onClick={() => { setStep('password'); setOtp(''); setError(''); }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  ← Back
                </button>
              </div>
              <p className="text-xs text-gray-400 mb-3">Enter the 6-digit code from your authenticator app.</p>
              <input
                ref={otpRef}
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-[#2d5a27]"
              />
            </div>
          )}

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2d5a27] text-white font-semibold py-2.5 rounded-lg hover:bg-[#245020] transition-colors disabled:opacity-60"
          >
            {loading ? '…' : step === 'otp' ? 'Verify' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
