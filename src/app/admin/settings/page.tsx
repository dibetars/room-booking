'use client';

import { useEffect, useState } from 'react';
import type { ExchangeRateInfo } from '@/lib/exchange-rate';

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
            the dates are held and you arrange payment manually, then confirm.
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

// ─── Exchange Rate (Live + 30-day Historical Buffer) ─────────────────────────

function ExchangeRateSection() {
  const [fx, setFx] = useState<ExchangeRateInfo | null>(null);
  const [overrideInput, setOverrideInput] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function loadFx() {
    fetch('/api/exchange-rate')
      .then((r) => r.json())
      .then((d: ExchangeRateInfo) => {
        setFx(d);
        setOverrideInput(d.adminOverride ? String(d.adminOverride.rate) : '');
        setNote(d.adminOverride?.note ?? '');
      })
      .catch(() => {});
  }

  useEffect(() => {
    loadFx();
  }, []);

  async function saveOverride() {
    const rate = Number(overrideInput);
    if (!Number.isFinite(rate) || rate < 1 || rate > 100) {
      setError('Enter a rate between 1 and 100 GHS per USD');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fxAdminOverrideRate: rate, fxAdminOverrideNote: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      if (data.exchangeRate) setFx(data.exchangeRate);
      else loadFx();
      setMessage(`Override saved — guests are charged GH₵ ${rate.toFixed(2)} / $1. Live FX still updates in the background.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function clearOverride() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fxAdminOverrideRate: null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Clear failed');
      if (data.exchangeRate) {
        setFx(data.exchangeRate);
        setOverrideInput('');
        setNote('');
      } else loadFx();
      setMessage('Override cleared — automated live FX is charging again.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clear failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-bold text-gray-800">USD → GHS Exchange Rate</h2>
            {fx?.source === 'admin_override' && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                Admin override GH₵ {fx.effectiveRate.toFixed(2)}
              </span>
            )}
            {fx?.source === 'fixed_30d' && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                Locked at GH₵ {fx.effectiveRate.toFixed(2)} until {fx.fixedUntil}
              </span>
            )}
            {fx?.source === 'live' && fx.droppedBelowHistorical && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                +10% Buffer Active
              </span>
            )}
            {fx?.source === 'live' && !fx.droppedBelowHistorical && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                Spot Rate Active
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1 max-w-xl">
            Live USD→GHS keeps updating daily (with +10% when spot is below the 30-day average).
            You can overwrite the <strong>charged</strong> rate below without stopping automation —
            clear the override anytime to resume. A weekly fluctuation email goes to the admin email every Monday.
          </p>
        </div>
        {!fx && <span className="text-xs text-gray-400 shrink-0">Loading…</span>}
      </div>

      {fx && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-gray-100 pt-4">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">Live Spot</p>
            <p className="text-lg font-bold text-gray-800 mt-0.5">GH₵ {fx.spotRate.toFixed(2)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">30-Day Avg</p>
            <p className="text-lg font-bold text-gray-800 mt-0.5">GH₵ {fx.historical30dAvg.toFixed(2)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">Automated</p>
            <p className="text-lg font-bold text-gray-800 mt-0.5">
              GH₵ {(fx.automatedRate ?? fx.effectiveRate).toFixed(2)}
              {fx.markupPct > 0 && fx.source !== 'admin_override' && (
                <span className="text-xs font-medium ml-1">(+{fx.markupPct}%)</span>
              )}
            </p>
          </div>
          <div className="bg-[#f0f5ee] rounded-xl p-3">
            <p className="text-[11px] uppercase tracking-wide text-[#2d5a27] font-semibold">Charged</p>
            <p className="text-lg font-bold text-[#2d5a27] mt-0.5">GH₵ {fx.effectiveRate.toFixed(2)}</p>
          </div>
        </div>
      )}

      <div className="border-t border-gray-100 pt-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">Admin override</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <label className="block">
            <span className="text-xs text-gray-500">GHS per USD</span>
            <input
              type="number"
              step="0.01"
              min="1"
              max="100"
              value={overrideInput}
              onChange={(e) => setOverrideInput(e.target.value)}
              placeholder={fx ? String(fx.automatedRate ?? fx.effectiveRate) : '11.50'}
              className="mt-1 block w-36 rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block flex-1 min-w-[180px]">
            <span className="text-xs text-gray-500">Note (optional)</span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Hold rate for Easter weekend"
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={saveOverride}
            disabled={saving || !overrideInput}
            className="px-3.5 py-2 rounded-lg bg-[#2d5a27] text-white text-sm font-semibold hover:bg-[#245020] disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save override'}
          </button>
          {fx?.adminOverride && (
            <button
              type="button"
              onClick={clearOverride}
              disabled={saving}
              className="px-3.5 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Clear override
            </button>
          )}
        </div>
        {fx?.adminOverride && (
          <p className="text-xs text-purple-700">
            Override active since {new Date(fx.adminOverride.updatedAt).toLocaleString('en-GH')}
            {fx.adminOverride.note ? ` — ${fx.adminOverride.note}` : ''}.
            Automated rate would be GH₵ {(fx.automatedRate ?? fx.spotRate).toFixed(2)}.
          </p>
        )}
        {message && <p className="text-sm text-green-700">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}

// ─── Direct Channel Management (No-Beds24 Path) ──────────────────────────────

interface RoomChannelRow {
  roomId: number;
  name: string;
  exportIcsUrl: string;
  airbnbUrl: string;
  bookingComUrl: string;
  otherUrl: string;
  syncedEventCount: number;
}

function DirectChannelsSection() {
  const [channelMode, setChannelMode] = useState<'beds24' | 'direct'>('direct');
  const [rooms, setRooms] = useState<RoomChannelRow[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [copiedRoom, setCopiedRoom] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/channels')
      .then((r) => r.json())
      .then((d) => {
        if (d.channelMode === 'direct') setChannelMode('direct');
        setRooms(d.rooms ?? []);
        setLastSyncedAt(d.lastSyncedAt ?? null);
      })
      .catch(() => setError('Failed to load channel settings'))
      .finally(() => setLoading(false));
  }, []);

  function updateRoomField(roomId: number, field: 'airbnbUrl' | 'bookingComUrl', value: string) {
    setRooms((prev) =>
      prev.map((r) => (r.roomId === roomId ? { ...r, [field]: value } : r))
    );
  }

  function copyIcs(roomId: number, url: string) {
    navigator.clipboard.writeText(url);
    setCopiedRoom(roomId);
    setTimeout(() => setCopiedRoom(null), 2000);
  }

  async function saveChannels(nextMode?: 'beds24' | 'direct') {
    setSaving(true);
    setError('');
    setMessage('');
    const modeToSave = nextMode ?? channelMode;
    const res = await fetch('/api/admin/channels', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelMode: modeToSave,
        feeds: rooms.map((r) => ({
          roomId: r.roomId,
          airbnbUrl: r.airbnbUrl,
          bookingComUrl: r.bookingComUrl,
          otherUrl: r.otherUrl,
        })),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? 'Failed to save channel settings');
      return;
    }
    setChannelMode(modeToSave);
    setMessage('Channel settings saved.');
  }

  async function syncNow() {
    setSyncing(true);
    setError('');
    setMessage('');
    await saveChannels();
    const res = await fetch('/api/admin/channels', { method: 'POST' });
    const d = await res.json().catch(() => ({}));
    setSyncing(false);
    if (!res.ok) {
      setError(d.error ?? 'iCal sync failed');
      return;
    }
    setLastSyncedAt(d.lastSyncedAt ?? new Date().toISOString());
    setMessage(`Synced ${d.totalSyncedEvents ?? 0} external calendar blocks.`);
    // Refresh room counts
    fetch('/api/admin/channels')
      .then((r) => r.json())
      .then((fresh) => { if (fresh.rooms) setRooms(fresh.rooms); })
      .catch(() => {});
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-gray-800">Direct Channel Management (Airbnb &amp; Booking.com iCal)</h2>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                channelMode === 'direct'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-blue-50 text-blue-700'
              }`}
            >
              {channelMode === 'direct' ? 'Direct (No Beds24)' : 'Beds24 + iCal Hybrid'}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1 max-w-xl">
            Bookings now come from the archived Beds24 export plus local website/admin reservations. Keep Airbnb &amp; Booking.com in sync with the iCal links below. Direct mode should stay on.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => saveChannels(channelMode === 'direct' ? 'beds24' : 'direct')}
            disabled={saving || loading}
            className="text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Switch to {channelMode === 'direct' ? 'Beds24 Mode' : 'Direct Mode (No Beds24)'}
          </button>
          <button
            type="button"
            onClick={syncNow}
            disabled={syncing || loading}
            className="text-xs font-semibold px-3.5 py-2 rounded-lg bg-[#2d5a27] text-white hover:bg-[#245020] disabled:opacity-50"
          >
            {syncing ? 'Syncing…' : 'Save & Sync iCal Now'}
          </button>
        </div>
      </div>

      {lastSyncedAt && (
        <p className="text-xs text-gray-400">
          Last iCal sync: {new Date(lastSyncedAt).toLocaleString('en-GH')}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading rooms…</p>
      ) : (
        <div className="space-y-4 border-t border-gray-100 pt-4">
          {rooms.map((r) => (
            <div key={r.roomId} className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50/50">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <span className="font-semibold text-sm text-gray-800">{r.name}</span>
                  <span className="text-xs text-gray-400 ml-2">#{r.roomId}</span>
                  {r.syncedEventCount > 0 && (
                    <span className="ml-2 text-xs text-[#2d5a27] font-medium">
                      · {r.syncedEventCount} external block{r.syncedEventCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => copyIcs(r.roomId, r.exportIcsUrl)}
                  className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-gray-900"
                >
                  {copiedRoom === r.roomId ? '✓ Copied .ics URL' : 'Copy BokoBoko .ics URL'}
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Airbnb iCal (.ics) import URL</label>
                  <input
                    type="url"
                    value={r.airbnbUrl}
                    onChange={(e) => updateRoomField(r.roomId, 'airbnbUrl', e.target.value)}
                    placeholder="https://www.airbnb.com/calendar/ical/..."
                    className="w-full border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2d5a27]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Booking.com iCal (.ics) import URL</label>
                  <input
                    type="url"
                    value={r.bookingComUrl}
                    onChange={(e) => updateRoomField(r.roomId, 'bookingComUrl', e.target.value)}
                    placeholder="https://ical.booking.com/v1/export?t=..."
                    className="w-full border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2d5a27]"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {message && !error && <p className="text-green-600 text-sm">{message}</p>}
    </div>
  );
}

// ─── Email OTP section ───────────────────────────────────────────────────────

function EmailOtpSection() {
  const [active, setActive] = useState<boolean | null>(null);
  const [emailHint, setEmailHint] = useState('');

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => {
        setActive(d.emailOtpActive === true);
        setEmailHint(d.emailOtpHint ?? '');
      })
      .catch(() => setActive(false));
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-gray-800">Email login codes</h2>
            {active === true && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>
            )}
            {active === false && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Off</span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1 max-w-md">
            After the password step, a 6-digit code is emailed to the admin address. Requires
            {' '}<code className="text-xs bg-gray-50 px-1 rounded">RESEND_API_KEY</code> and
            {' '}<code className="text-xs bg-gray-50 px-1 rounded">EMAIL_FROM</code>.
          </p>
        </div>
        {active === null && <span className="text-xs text-gray-400 shrink-0">Loading…</span>}
      </div>

      {active === true && (
        <div className="flex items-center gap-2 text-sm text-[#2d5a27] font-medium border-t border-gray-100 pt-4">
          <span className="w-2 h-2 rounded-full bg-[#2d5a27]" />
          Codes go to {emailHint || 'the configured admin email'}.
        </div>
      )}

      {active === false && (
        <div className="border-t border-gray-100 pt-4 space-y-2">
          <p className="text-sm text-gray-600">
            Set this environment variable, then redeploy:
          </p>
          <div className="bg-gray-50 rounded-lg border border-gray-200 px-4 py-3 font-mono text-sm text-gray-800 select-all">
            ADMIN_EMAIL=you@example.com
          </div>
          <p className="text-xs text-gray-400">
            You can remove <code className="bg-gray-50 px-1 rounded">ADMIN_TOTP_SECRET</code> if it is still set — authenticator codes are no longer used.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Payments, exchange rate, direct channels, and security</p>
      </div>
      <PaymentsSection />
      <ExchangeRateSection />
      <DirectChannelsSection />
      <EmailOtpSection />
    </div>
  );
}
