'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ROOMS } from '@/lib/rooms';

function todayStr() { return new Date().toISOString().slice(0, 10); }
function tomorrowStr() {
  const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10);
}

const INPUT = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a27] bg-white';
const LABEL = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5';

export default function NewBookingPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    roomId: ROOMS[0].id,
    checkIn: todayStr(),
    checkOut: tomorrowStr(),
    adults: 2,
    children: 0,
    guestFirstName: '',
    guestLastName: '',
    email: '',
    phone: '',
    notes: '',
    priceOverride: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const room = ROOMS.find((r) => r.id === Number(form.roomId)) ?? ROOMS[0];
  const nights = Math.max(1, Math.round(
    (new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime()) / 86400000
  ));
  const GHS_PER_USD = Number(process.env.NEXT_PUBLIC_GHS_PER_USD ?? '15.5');
  const autoPrice = (room.rackRateUSD * nights).toFixed(2);

  function set(field: string, value: string | number) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    const res = await fetch('/api/admin/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: Number(form.roomId),
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        adults: Number(form.adults),
        children: Number(form.children),
        guestFirstName: form.guestFirstName,
        guestLastName: form.guestLastName,
        email: form.email,
        phone: form.phone || undefined,
        notes: form.notes || undefined,
        priceGHS: form.priceOverride ? Number(form.priceOverride) * GHS_PER_USD : undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Failed to create booking');
      setSubmitting(false);
      return;
    }

    setSuccess(`Booking created — Beds24 ID: ${data.beds24Id}`);
    setSubmitting(false);
  }

  return (
    <div className="px-6 py-8">

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Booking</h1>
        <p className="text-sm text-gray-400 mt-0.5">Create a manual reservation directly in Beds24</p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-5 items-start">

        {/* LEFT col */}
        <div className="space-y-5">
          {/* Stay */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Stay</h2>
            <div>
              <label className={LABEL}>Room</label>
              <select value={form.roomId} onChange={(e) => set('roomId', e.target.value)} className={INPUT}>
                {ROOMS.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} — ${r.rackRateUSD}/night</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Check-in</label>
                <input type="date" value={form.checkIn} min={todayStr()} required
                  onChange={(e) => set('checkIn', e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Check-out</label>
                <input type="date" value={form.checkOut} min={form.checkIn} required
                  onChange={(e) => set('checkOut', e.target.value)} className={INPUT} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Adults</label>
                <select value={form.adults} onChange={(e) => set('adults', e.target.value)} className={INPUT}>
                  {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Children</label>
                <select value={form.children} onChange={(e) => set('children', e.target.value)} className={INPUT}>
                  {[0,1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Guest */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Guest</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>First name</label>
                <input type="text" value={form.guestFirstName} required
                  onChange={(e) => set('guestFirstName', e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Last name</label>
                <input type="text" value={form.guestLastName} required
                  onChange={(e) => set('guestLastName', e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Email</label>
                <input type="email" value={form.email} required
                  onChange={(e) => set('email', e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Phone</label>
                <input type="tel" value={form.phone}
                  onChange={(e) => set('phone', e.target.value)} className={INPUT} />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT col */}
        <div className="space-y-5">
          {/* Summary */}
          <div className="bg-[#1a3518] rounded-2xl p-5 text-white space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-white/60">Summary</h2>
            <div className="flex items-center justify-between">
              <span className="text-white/70 text-sm">{room.name}</span>
              <span className="text-sm font-medium">${room.rackRateUSD}/night</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/70 text-sm">{nights} night{nights !== 1 ? 's' : ''}</span>
              <span className="text-sm font-medium">× {nights}</span>
            </div>
            <div className="border-t border-white/15 pt-3 flex items-center justify-between">
              <span className="text-white/70 text-sm">Total</span>
              <span className="text-xl font-bold text-[#BE6A45]">${autoPrice}</span>
            </div>
          </div>

          {/* Pricing & notes */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Pricing &amp; Notes</h2>
            <div>
              <label className={LABEL}>Price override (USD)</label>
              <input type="number" step="0.01" min="0" value={form.priceOverride}
                placeholder={`Auto: $${autoPrice}`}
                onChange={(e) => set('priceOverride', e.target.value)} className={INPUT} />
              <p className="text-[11px] text-gray-400 mt-1">Leave blank to use rack rate</p>
            </div>
            <div>
              <label className={LABEL}>Internal notes</label>
              <input type="text" value={form.notes}
                placeholder="Stored in Beds24"
                onChange={(e) => set('notes', e.target.value)} className={INPUT} />
            </div>
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">{error}</p>}
          {success && <p className="text-green-700 text-sm font-medium bg-green-50 rounded-xl px-4 py-3">{success}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={() => router.push('/admin')}
              className="flex-1 border border-gray-200 text-gray-600 font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 bg-[#2d5a27] text-white font-semibold py-2.5 rounded-xl hover:bg-[#245020] transition-colors disabled:opacity-60 text-sm">
              {submitting ? 'Creating…' : 'Create Booking'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
