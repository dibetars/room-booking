'use client';

import { useEffect, useState } from 'react';

const RULES = [
  {
    code: 'AUGUST_WEEKEND',
    label: 'August Weekend',
    description: 'Check-in on a Friday or Saturday in August 2026. Applies to both website and admin bookings.',
    discountPct: 15,
    period: '1 Aug – 31 Aug 2026',
    days: 'Fri & Sat check-ins',
  },
];

export default function DiscountsPage() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState(0);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => setEnabled(d.augustWeekendDiscount !== false))
      .catch(() => { setError('Failed to load settings'); setEnabled(true); });
  }, []);

  async function toggle(next: boolean) {
    setSaving(true);
    setError('');
    const prev = enabled;
    setEnabled(next);
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ augustWeekendDiscount: next }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? 'Save failed');
      setEnabled(prev);
      return;
    }
    setSavedAt(Date.now());
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Discounts</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage promotional discounts applied at booking time</p>
      </div>

      <div className="space-y-4">
        {RULES.map((rule) => (
          <div key={rule.code} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-bold text-gray-800">{rule.label}</h2>
                  <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    {rule.discountPct}% off
                  </span>
                  {enabled !== null && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {enabled ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-3">{rule.description}</p>
                <div className="flex gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                    {rule.period}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    {rule.days}
                  </span>
                </div>
              </div>

              {enabled === null ? (
                <div className="text-sm text-gray-400 shrink-0">Loading…</div>
              ) : (
                <button
                  role="switch"
                  aria-checked={enabled}
                  disabled={saving}
                  onClick={() => toggle(!enabled)}
                  className={`relative shrink-0 w-14 h-8 rounded-full transition-colors disabled:opacity-60 ${
                    enabled ? 'bg-[#2d5a27]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                      enabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              )}
            </div>

            {enabled && (
              <div className="mt-4 pt-4 border-t border-gray-100 bg-amber-50 rounded-xl p-4 text-sm text-amber-800">
                <strong>How it works:</strong> When a guest or admin selects a Friday or Saturday check-in date in August 2026, the rack rate is automatically reduced by 15%. The discount is recorded in Beds24 notes and the Supabase intent.
              </div>
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
      {savedAt > 0 && (
        <p className="mt-3 text-xs text-green-600 font-medium">Saved.</p>
      )}

      <div className="mt-8 bg-gray-50 border border-gray-200 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-2">Future discounts</h3>
        <p className="text-sm text-gray-500">Additional discount rules (early-bird, long-stay, promo codes) can be added here as new promotions are created.</p>
      </div>
    </div>
  );
}
