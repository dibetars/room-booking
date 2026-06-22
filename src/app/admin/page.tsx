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
  const [detailBooking, setDetailBooking] = useState<AdminBooking | null>(null);
  const [daysBack, setDaysBack] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await fetch(`/api/admin/bookings?daysBack=${daysBack}&daysAhead=60`);
    if (res.status === 401) { router.push('/admin/login'); return; }
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Failed to load'); setLoading(false); return; }
    setBookings(data.bookings ?? []);
    setLoading(false);
  }, [router, daysBack]);

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

  function exportCSV() {
    const rows = visible.map((b) => ({
      'Beds24 ID': b.id ?? '',
      'First Name': b.guestFirstName,
      'Last Name': b.guestLastName,
      'Email': b.email,
      'Phone': b.phone ?? '',
      'Room': ROOM_NAMES[b.roomId] ?? `Room ${b.roomId}`,
      'Check-in': b.arrival,
      'Check-out': b.departure,
      'Nights': nights(b.arrival, b.departure),
      'Adults': b.numAdult,
      'Children': b.numChild,
      'Channel': channelBadge(b.referer).label,
      'Beds24 Status': b.status,
      'Payment Status': b.intent?.status ?? '',
      'Reference': b.intent?.reference ?? '',
      'Price (USD)': b.price ?? '',
    }));
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => `"${String(r[h as keyof typeof r] ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
    <>
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
        <div className="flex flex-wrap gap-2">
          {(['upcoming', 'today', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                filter === f ? 'bg-[#2d5a27] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f === 'upcoming' ? 'Upcoming' : f === 'today' ? 'Today' : 'All'}
            </button>
          ))}
          <div className="flex items-center gap-1 bg-white rounded-lg px-2 border border-gray-200">
            <span className="text-xs text-gray-400 pr-1">History:</span>
            {([30, 90, 180, 365] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDaysBack(d)}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                  daysBack === d ? 'bg-[#2d5a27] text-white' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {d === 365 ? '1y' : `${d}d`}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-2">
            <button onClick={load} className="text-sm text-gray-500 hover:text-gray-700 px-3">
              ↻ Refresh
            </button>
            {visible.length > 0 && (
              <button onClick={exportCSV} className="text-sm bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors">
                ↓ Export CSV
              </button>
            )}
          </div>
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
                      <tr key={b.id ?? i} onClick={() => setDetailBooking(b)} className={`cursor-pointer hover:bg-gray-50 ${isArriving ? 'bg-green-50/40' : isDeparting ? 'bg-orange-50/40' : ''}`}>
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
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
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

    {/* Booking Detail Modal */}

    {detailBooking && (() => {
      const b = detailBooking;
      const ch = channelBadge(b.referer);
      const n = nights(b.arrival, b.departure);
      return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setDetailBooking(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-gray-800 text-lg">{b.guestFirstName} {b.guestLastName}</h2>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${ch.className}`}>{ch.label}</span>
              </div>
              <button onClick={() => setDetailBooking(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Stay */}
              <div className="bg-[#f5f0e8] rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Room</p>
                  <p className="font-semibold text-gray-800">{ROOM_NAMES[b.roomId] ?? `Room ${b.roomId}`}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Beds24 ID</p>
                  <p className="font-semibold text-gray-800">#{b.id ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Check-in</p>
                  <p className="font-semibold text-gray-800">{fmt(b.arrival)}{isToday(b.arrival) && <span className="ml-1 text-green-600 text-xs">Today</span>}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Check-out</p>
                  <p className="font-semibold text-gray-800">{fmt(b.departure)}{isToday(b.departure) && <span className="ml-1 text-orange-500 text-xs">Today</span>}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Nights</p>
                  <p className="font-semibold text-gray-800">{n}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Guests</p>
                  <p className="font-semibold text-gray-800">{b.numAdult} adult{b.numAdult !== 1 ? 's' : ''}{b.numChild > 0 ? `, ${b.numChild} child${b.numChild !== 1 ? 'ren' : ''}` : ''}</p>
                </div>
              </div>

              {/* Guest contact */}
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Guest Contact</p>
                <div className="space-y-1.5 text-sm">
                  <p className="text-gray-700"><span className="text-gray-400 w-14 inline-block">Email</span>{b.email}</p>
                  <p className="text-gray-700"><span className="text-gray-400 w-14 inline-block">Phone</span>{b.phone || '—'}</p>
                </div>
              </div>

              {/* Status row */}
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Status</p>
                <div className="flex gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    Beds24: {b.status}
                  </span>
                  {b.intent && (
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${PAYMENT_COLORS[b.intent.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      Payment: {b.intent.status}
                    </span>
                  )}
                </div>
              </div>

              {/* Price & reference */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Price</p>
                  <p className="font-semibold text-gray-800">{b.price != null ? `$${b.price}` : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Reference</p>
                  <p className="font-mono text-xs text-gray-600">{b.intent?.reference ?? '—'}</p>
                </div>
              </div>

              {/* Notes */}
              {b.info && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{b.info}</p>
                </div>
              )}

              {/* Actions */}
              {b.id && b.status !== 'cancelled' && (
                <div className="flex gap-2 pt-1">
                  {b.status !== 'confirmed' && (
                    <button onClick={() => { doAction(b.id!, 'confirm'); setDetailBooking(null); }}
                      className="flex-1 text-sm py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium">
                      Confirm
                    </button>
                  )}
                  {b.intent && ['HELD','PAID','RECONCILE_NEEDED'].includes(b.intent.status) && (
                    <button onClick={() => { doAction(b.id!, 'mark_paid'); setDetailBooking(null); }}
                      className="flex-1 text-sm py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium">
                      Mark Paid
                    </button>
                  )}
                  <button onClick={() => { if (confirm('Cancel this booking?')) { doAction(b.id!, 'cancel'); setDetailBooking(null); } }}
                    className="flex-1 text-sm py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    })()}
    </>
  );
}
