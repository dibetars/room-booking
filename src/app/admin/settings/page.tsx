'use client';

import { useEffect, useState } from 'react';

export default function SettingsPage() {
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
    setPaymentsEnabled(next); // optimistic
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentsEnabled: next }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? 'Save failed');
      setPaymentsEnabled(prev); // revert
      return;
    }
    setSavedAt(Date.now());
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Control how guests book on the website</p>
      </div>

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
              className={`relative shrink-0 w-14 h-8 rounded-full transition-colors disabled:opacity-60 ${
                paymentsEnabled ? 'bg-[#2d5a27]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  paymentsEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
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

      <p className="text-xs text-gray-400 mt-4">
        Requires the <code>app_settings</code> table in Supabase. If it doesn&apos;t exist yet,
        the site safely defaults to manual mode.
      </p>
    </div>
  );
}
