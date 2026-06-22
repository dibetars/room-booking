'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { BookingIntent } from '@/types';

interface AdminBooking {
  id?: number;
  roomId: number;
  arrival: string;
  departure: string;
  numAdult: number;
  numChild: number;
  guestFirstName: string;
  guestLastName: string;
  email: string;
  phone?: string;
  status: string;
  price?: number;
  referer?: string;
  info?: string;
  intent: BookingIntent | null;
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-800',
  request: 'bg-yellow-100 text-yellow-800',
  new: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
};

const PAYMENT_COLORS: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-800',
  PAID: 'bg-blue-100 text-blue-800',
  HELD: 'bg-yellow-100 text-yellow-800',
  PAYMENT_PENDING: 'bg-yellow-100 text-yellow-800',
  CANCELLED: 'bg-red-100 text-red-800',
  RECONCILE_NEEDED: 'bg-orange-100 text-orange-800',
};

const CHANNEL_BADGES: Record<string, { label: string; className: string }> = {
  'booking.com':    { label: 'Booking.com',   className: 'bg-blue-100 text-blue-700' },
  'airbnb':         { label: 'Airbnb',         className: 'bg-rose-100 text-rose-700' },
  'hostelworld':    { label: 'Hostelworld',    className: 'bg-purple-100 text-purple-700' },
  'expedia':        { label: 'Expedia',        className: 'bg-yellow-100 text-yellow-800' },
  'bokoboko admin': { label: 'Admin',          className: 'bg-gray-100 text-gray-600' },
};

function channelBadge(referer?: string) {
  if (!referer) return { label: 'Direct', className: 'bg-green-100 text-green-700' };
  return CHANNEL_BADGES[referer.toLowerCase()] ?? { label: referer, className: 'bg-gray-100 text-gray-600' };
}

const ROOM_NAMES: Record<number, string> = {
  2634263: 'Bungalow 1',
  2509568: 'Bungalow 2',
  2634338: 'Bungalow 3a',
  2634343: 'Bungalow 3b',
  2509563: 'Family Suite',
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' });
}

function nights(arrival: string, departure: string) {
  return Math.round((new Date(departure).getTime() - new Date(arrival).getTime()) / 86400000);
}

function isToday(d: string) {
  return d === new Date().toISOString().slice(0, 10);
}

export default function AdminDashboard() {
  const router = useRouter();
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [filter, setFilter] = useState<'upcoming' | 'today' | 'all'>('upcoming');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await fetch('/api/admin/bookings?daysBack=7&daysAhead=60');
    if (res.status === 401) { router.push('/admin/login'); return; }
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Failed to load'); setLoading(false); return; }
    setBookings(data.bookings ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function doAction(id: number, action: string) {
    setActionLoading(id);
    const res = await fetch(`/api/admin/bookings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    setActionLoading(null);
    if (res.ok) load();
    else alert('Action failed. Please try again.');
  }

  async function logout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.push('/admin/login');
  }

  const today = new Date().toISOString().slice(0, 10);
  const todayArrivals = bookings.filter((b) => b.arrival === today && b.status !== 'cancelled');
  const todayDepartures = bookings.filter((b) => b.departure === today && b.status !== 'cancelled');
  const upcoming = bookings.filter((b) => b.arrival >= today && b.status !== 'cancelled');

  const visible = filter === 'today'
    ? bookings.filter((b) => b.arrival === today || b.departure === today)
    : filter === 'upcoming'
    ? bookings.filter((b) => b.arrival >= today)
    : bookings;

  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      {/* Header */}
      <header className="bg-[#2d5a27] text-white px-5 py-4 flex items-center justify-between">
        <h1 className="font-bold text-lg">BokoBoko Admin</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/new-booking')}
            className="bg-white text-[#2d5a27] font-semibold text-sm px-4 py-1.5 rounded-lg hover:bg-[#f5f0e8] transition-colors"
          >
            + New Booking
          </button>
          <button onClick={logout} className="text-white/70 text-sm hover:text-white transition-colors">
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Today's Arrivals", value: todayArrivals.length, color: 'text-[#2d5a27]' },
            { label: "Today's Departures", value: todayDepartures.length, color: 'text-[#BE6A45]' },
            { label: 'Upcoming (60d)', value: upcoming.length, color: 'text-blue-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl shadow p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {(['upcoming', 'today', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                filter === f ? 'bg-[#2d5a27] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f === 'upcoming' ? 'Upcoming' : f === 'today' ? 'Today' : 'All (7d)'}
            </button>
          ))}
          <button onClick={load} className="ml-auto text-sm text-gray-500 hover:text-gray-700 px-3">
            ↻ Refresh
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          {loading && (
            <div className="py-16 text-center text-gray-400">Loading bookings…</div>
          )}
          {error && (
            <div className="py-8 text-center text-red-600">{error}</div>
          )}
          {!loading && !error && visible.length === 0 && (
            <div className="py-16 text-center text-gray-400">No bookings found.</div>
          )}
          {!loading && !error && visible.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Guest</th>
                    <th className="text-left px-4 py-3">Room</th>
                    <th className="text-left px-4 py-3">Dates</th>
                    <th className="text-left px-4 py-3">Guests</th>
                    <th className="text-left px-4 py-3">Channel</th>
                    <th className="text-left px-4 py-3">Beds24</th>
                    <th className="text-left px-4 py-3">Payment</th>
                    <th className="text-left px-4 py-3">Ref</th>
                    <th className="text-left px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visible.map((b, i) => {
                    const isArriving = isToday(b.arrival);
                    const isDeparting = isToday(b.departure);
                    return (
                      <tr key={b.id ?? i} className={`hover:bg-gray-50 ${isArriving ? 'bg-green-50/40' : isDeparting ? 'bg-orange-50/40' : ''}`}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{b.guestFirstName} {b.guestLastName}</p>
                          <p className="text-xs text-gray-400">{b.email}</p>
                          {b.phone && <p className="text-xs text-gray-400">{b.phone}</p>}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {ROOM_NAMES[b.roomId] ?? `Room ${b.roomId}`}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-gray-800">{fmt(b.arrival)} → {fmt(b.departure)}</p>
                          <p className="text-xs text-gray-400">{nights(b.arrival, b.departure)} night{nights(b.arrival, b.departure) !== 1 ? 's' : ''}
                            {isArriving && <span className="ml-1 text-green-600 font-medium">· Arriving today</span>}
                            {isDeparting && <span className="ml-1 text-orange-600 font-medium">· Departing today</span>}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {b.numAdult}A {b.numChild > 0 ? `${b.numChild}C` : ''}
                        </td>
                        <td className="px-4 py-3">
                          {(() => { const ch = channelBadge(b.referer); return (
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${ch.className}`}>
                              {ch.label}
                            </span>
                          ); })()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {b.intent ? (
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${PAYMENT_COLORS[b.intent.status] ?? 'bg-gray-100 text-gray-600'}`}>
                              {b.intent.status}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                          {b.intent?.reference ?? (b.id ? `#${b.id}` : '—')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5 flex-wrap">
                            {b.status !== 'confirmed' && b.status !== 'cancelled' && (
                              <button
                                onClick={() => b.id && doAction(b.id, 'confirm')}
                                disabled={actionLoading === b.id}
                                className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors disabled:opacity-50"
                              >
                                Confirm
                              </button>
                            )}
                            {b.intent && ['HELD', 'PAID', 'RECONCILE_NEEDED'].includes(b.intent.status) && (
                              <button
                                onClick={() => b.id && doAction(b.id, 'mark_paid')}
                                disabled={actionLoading === b.id}
                                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors disabled:opacity-50"
                              >
                                Mark Paid
                              </button>
                            )}
                            {b.status !== 'cancelled' && (
                              <button
                                onClick={() => b.id && confirm('Cancel this booking?') && doAction(b.id, 'cancel')}
                                disabled={actionLoading === b.id}
                                className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
