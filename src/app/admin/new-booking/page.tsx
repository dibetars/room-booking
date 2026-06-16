'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ROOMS } from '@/lib/rooms';

function todayStr() { return new Date().toISOString().slice(0, 10); }
function tomorrowStr() {
  const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10);
}

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
  const autoPrice = (room.rackRateUSD * nights * GHS_PER_USD).toFixed(2);

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
        priceGHS: form.priceOverride ? Number(form.priceOverride) : undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Failed to create booking');
      setSubmitting(false);
      return;
    }

    setSuccess(`Booking created — Ref: ${data.reference} · Beds24 ID: ${data.beds24Id}`);
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-[#f5f0e8] px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/admin')} className="text-[#2d5a27] text-sm hover:underline">← Dashboard</button>
          <h1 className="text-xl font-bold text-[#333]">New Booking</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-6 space-y-5">
          {/* Room & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-600 mb-1">Room</label>
              <select
                value={form.roomId}
                onChange={(e) => set('roomId', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2d5a27]"
              >
                {ROOMS.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} (${r.rackRateUSD}/night)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Check-in</label>
              <input type="date" value={form.checkIn} min={todayStr()} required
                onChange={(e) => set('checkIn', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2d5a27]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Check-out</label>
              <input type="date" value={form.checkOut} min={form.checkIn} required
                onChange={(e) => set('checkOut', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2d5a27]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Adults</label>
              <select value={form.adults} onChange={(e) => set('adults', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2d5a27]">
                {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Children</label>
              <select value={form.children} onChange={(e) => set('children', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2d5a27]">
                {[0,1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Guest */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">First name</label>
              <input type="text" value={form.guestFirstName} required
                onChange={(e) => set('guestFirstName', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2d5a27]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Last name</label>
              <input type="text" value={form.guestLastName} required
                onChange={(e) => set('guestLastName', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2d5a27]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
              <input type="email" value={form.email} required
                onChange={(e) => set('email', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2d5a27]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
              <input type="tel" value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2d5a27]" />
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Price override (GHS) <span className="text-gray-400 font-normal">— leave blank to use rack rate</span>
              </label>
              <input type="number" step="0.01" min="0" value={form.priceOverride}
                placeholder={`Auto: GHS ${autoPrice} (${nights} night${nights !== 1 ? 's' : ''})`}
                onChange={(e) => set('priceOverride', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2d5a27]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Notes</label>
              <input type="text" value={form.notes}
                placeholder="Internal notes (stored in Beds24)"
                onChange={(e) => set('notes', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2d5a27]" />
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}
          {success && <p className="text-green-700 text-sm font-medium">{success}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => router.push('/admin')}
              className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 bg-[#2d5a27] text-white font-semibold py-2.5 rounded-lg hover:bg-[#245020] transition-colors disabled:opacity-60">
              {submitting ? 'Creating…' : 'Create Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
