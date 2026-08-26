'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

// ─── Payments section ────────────────────────────────────────────────────────

function PaymentsSection() {
  const [paymentsEnabled, setPaymentsEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState(0);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => setPaymentsEnabled(d.paymentsEnabled === true))
      .catch(() => { setError('Failed to load settings'); setPaymentsEnabled(false); });
  }, []);

  async function toggle(next: boolean) {
    setSaving(true);
    setError('');
    const prev = paymentsEnabled;
    setPaymentsEnabled(next);
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentsEnabled: next }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? 'Save failed');
      setPaymentsEnabled(prev);
      return;
    }
    setSavedAt(Date.now());
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="font-bold text-gray-800">Online Payments (Paystack)</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-md">
            When <strong>on</strong>, guests pay instantly via Paystack (Mobile Money / card) and
            bookings are auto-confirmed. When <strong>off</strong>, guests submit a booking request —
            the dates are held in Beds24 and you arrange payment manually, then confirm.
          </p>
        </div>
        {paymentsEnabled === null ? (
          <div className="text-sm text-gray-400 shrink-0">Loading…</div>
        ) : (
          <button
            role="switch"
            aria-checked={paymentsEnabled}
            disabled={saving}
            onClick={() => toggle(!paymentsEnabled)}
            className={`relative shrink-0 w-14 h-8 rounded-full transition-colors disabled:opacity-60 ${paymentsEnabled ? 'bg-[#2d5a27]' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${paymentsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        )}
      </div>
      <div className="mt-5 pt-5 border-t border-gray-100">
        {paymentsEnabled === false && (
          <div className="flex items-center gap-2 text-sm text-[#BE6A45] font-medium">
            <span className="w-2 h-2 rounded-full bg-[#BE6A45]" />
            Manual mode active — guests submit requests, no payment is taken online.
          </div>
        )}
        {paymentsEnabled === true && (
          <div className="flex items-center gap-2 text-sm text-[#2d5a27] font-medium">
            <span className="w-2 h-2 rounded-full bg-[#2d5a27]" />
            Live — guests pay online via Paystack.
          </div>
        )}
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        {savedAt > 0 && !error && <p className="text-green-600 text-sm mt-2">Saved.</p>}
      </div>
    </div>
  );
}

// ─── 2FA / TOTP section ──────────────────────────────────────────────────────

const ACCENT_INPUT = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2d5a27]';

function TotpSection() {
  const [secret, setSecret] = useState('');
  const [uri, setUri] = useState('');
  const [token, setToken] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'verifying' | 'verified'>('idle');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const hasLoaded = useRef(false);

  const loadSecret = useCallback(() => {
    setState('loading');
    fetch('/api/admin/totp-setup')
      .then(r => r.json())
      .then(d => { setSecret(d.secret); setUri(d.uri); setState('ready'); setToken(''); setError(''); })
      .catch(() => setState('idle'));
  }, []);

  async function verify() {
    setState('verifying');
    setError('');
    const res = await fetch('/api/admin/totp-setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, token }),
    });
    const data = await res.json();
    if (data.valid) { setState('verified'); }
    else { setError('Code incorrect — try again.'); setState('ready'); }
  }

  function copySecret() {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const qrUrl = uri ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(uri)}` : '';
  const formattedSecret = secret.match(/.{1,4}/g)?.join(' ') ?? secret;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-bold text-gray-800">Two-Factor Authentication (TOTP)</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-md">
            Require a 6-digit code from an authenticator app (Google Authenticator, Authy, 1Password) on every login.
            Active when <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">ADMIN_TOTP_SECRET</code> is set in your environment.
          </p>
        </div>
        {state === 'idle' && (
          <button onClick={() => { if (!hasLoaded.current) { hasLoaded.current = true; loadSecret(); } else { setState('ready'); } }}
            className="shrink-0 text-sm font-semibold text-white bg-[#2d5a27] px-4 py-2 rounded-lg hover:bg-[#245020] transition-colors">
            Set up 2FA
          </button>
        )}
      </div>

      {state === 'loading' && <p className="text-sm text-gray-400">Generating secret…</p>}

      {(state === 'ready' || state === 'verifying' || state === 'verified') && (
        <div className="border-t border-gray-100 pt-4 space-y-5">
          {/* QR + secret */}
          {state !== 'verified' && (
            <div className="flex gap-5 items-start flex-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrUrl} alt="TOTP QR code" width={180} height={180} className="rounded-lg border border-gray-100 shrink-0" />
              <div className="flex-1 min-w-[200px] space-y-3">
                <p className="text-sm text-gray-600">
                  <strong>Step 1.</strong> Scan the QR code in your authenticator app, or enter the key manually:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-xs font-mono text-gray-700 tracking-widest break-all">{formattedSecret}</code>
                  <button onClick={copySecret} className="text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-800 shrink-0 transition-colors">
                    {copied ? '✓' : 'Copy'}
                  </button>
                </div>
                <p className="text-sm text-gray-600 pt-1">
                  <strong>Step 2.</strong> Enter the 6-digit code to verify:
                </p>
                <input
                  type="text" inputMode="numeric" maxLength={6}
                  value={token} onChange={e => setToken(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className={`${ACCENT_INPUT} text-center text-xl font-mono tracking-[0.4em]`}
                />
                {error && <p className="text-red-600 text-sm">{error}</p>}
                <div className="flex gap-2">
                  <button onClick={verify} disabled={token.length !== 6 || state === 'verifying'}
                    className="flex-1 bg-[#2d5a27] text-white text-sm font-semibold py-2 rounded-lg hover:bg-[#245020] transition-colors disabled:opacity-50">
                    {state === 'verifying' ? 'Checking…' : 'Verify code'}
                  </button>
                  <button onClick={loadSecret} className="text-xs text-gray-400 hover:text-gray-600 px-3 py-2 border border-gray-200 rounded-lg transition-colors">
                    New secret
                  </button>
                  <button onClick={() => setState('idle')} className="text-xs text-gray-400 hover:text-gray-600 px-3 py-2 border border-gray-200 rounded-lg transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {state === 'verified' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
              <p className="text-green-800 font-semibold text-sm">✓ Code verified — set this environment variable then redeploy:</p>
              <div className="bg-white rounded-lg border border-green-200 px-4 py-3 font-mono text-sm text-gray-800 break-all select-all">
                ADMIN_TOTP_SECRET={secret}
              </div>
              <p className="text-xs text-green-600">After the redeploy, every login will require your password + authenticator code. Keep this secret backed up.</p>
              <button onClick={() => { setState('idle'); setSecret(''); setUri(''); setToken(''); }}
                className="text-xs text-green-700 underline">Done</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Payments, security, and account configuration</p>
      </div>
      <PaymentsSection />
      <TotpSection />
    </div>
  );
}
