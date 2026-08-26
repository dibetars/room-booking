'use client';

import { useState, useEffect } from 'react';

type SetupState = 'loading' | 'ready' | 'verifying' | 'verified' | 'error';

export default function TotpSetupPage() {
  const [secret, setSecret] = useState('');
  const [uri, setUri] = useState('');
  const [token, setToken] = useState('');
  const [state, setState] = useState<SetupState>('loading');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const isEnabled = !!process.env.NEXT_PUBLIC_TOTP_ENABLED;

  useEffect(() => {
    fetch('/api/admin/totp-setup')
      .then(r => r.json())
      .then(d => { setSecret(d.secret); setUri(d.uri); setState('ready'); })
      .catch(() => setState('error'));
  }, []);

  function regenerate() {
    setState('loading');
    setToken('');
    setError('');
    fetch('/api/admin/totp-setup')
      .then(r => r.json())
      .then(d => { setSecret(d.secret); setUri(d.uri); setState('ready'); })
      .catch(() => setState('error'));
  }

  async function verify() {
    setState('verifying');
    setError('');
    const res = await fetch('/api/admin/totp-setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, token }),
    });
    const data = await res.json();
    if (data.valid) {
      setState('verified');
    } else {
      setError('Code incorrect — check your authenticator and try again.');
      setState('ready');
    }
  }

  function copySecret() {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const qrUrl = uri ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(uri)}` : '';
  const formattedSecret = secret.match(/.{1,4}/g)?.join(' ') ?? secret;

  return (
    <div className="px-6 py-8 max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Two-Factor Authentication Setup</h1>
      <p className="text-sm text-gray-400 mb-6">
        Use any TOTP authenticator app — Google Authenticator, Authy, 1Password, or similar.
      </p>

      {isEnabled && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-6 text-sm text-green-800">
          ✓ TOTP is currently <strong>active</strong> on this account. You can generate a new secret below if you need to re-enroll.
        </div>
      )}

      {state === 'loading' && <p className="text-gray-400 text-sm">Generating secret…</p>}
      {state === 'error' && <p className="text-red-600 text-sm">Failed to generate secret.</p>}

      {(state === 'ready' || state === 'verifying' || state === 'verified') && (
        <div className="space-y-6">

          {/* Step 1 — Scan */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <p className="text-sm font-semibold text-gray-700">Step 1 — Scan the QR code</p>
            <p className="text-xs text-gray-400">Open your authenticator app, tap the + button, and scan:</p>
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrUrl} alt="TOTP QR code" width={200} height={200} className="rounded-lg border border-gray-100" />
            </div>
            <p className="text-xs text-gray-400 text-center">Can't scan? Enter the key manually instead:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-sm font-mono text-gray-700 tracking-widest break-all">
                {formattedSecret}
              </code>
              <button onClick={copySecret} className="text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300 transition-colors shrink-0">
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <button onClick={regenerate} className="text-xs text-gray-400 hover:text-gray-600">
              ↻ Generate a new secret instead
            </button>
          </div>

          {/* Step 2 — Verify */}
          {state !== 'verified' ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <p className="text-sm font-semibold text-gray-700">Step 2 — Verify it works</p>
              <p className="text-xs text-gray-400">Enter the 6-digit code your app shows now to confirm it's set up correctly.</p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={token}
                onChange={e => setToken(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-center text-2xl font-mono tracking-[0.5em] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2d5a27]"
              />
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                onClick={verify}
                disabled={token.length !== 6 || state === 'verifying'}
                className="w-full bg-[#2d5a27] text-white font-semibold py-2.5 rounded-lg hover:bg-[#245020] transition-colors disabled:opacity-50"
              >
                {state === 'verifying' ? 'Checking…' : 'Verify code'}
              </button>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 space-y-3">
              <p className="text-green-800 font-semibold">✓ Verified — code is working correctly</p>
              <p className="text-sm text-green-700">Now add the following environment variable to Coolify (or wherever you host this app), then redeploy:</p>
              <div className="bg-white rounded-lg border border-green-200 px-4 py-3 font-mono text-sm text-gray-800 break-all select-all">
                ADMIN_TOTP_SECRET={secret}
              </div>
              <p className="text-xs text-green-600">
                After the redeploy, every login will require your password <strong>and</strong> the authenticator code.
                Keep the secret backed up — if you lose it you will need to generate a new one and update the env var.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
