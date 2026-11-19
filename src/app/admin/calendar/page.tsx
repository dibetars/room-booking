'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ROOMS } from '@/lib/rooms';
import type { BookingIntent } from '@/types';

interface CalendarBooking {
  id?: number;
  roomId: number;
  arrival: string;
  departure: string;
  numAdult: number;
  numChild: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: string;
  price?: number;
  referer?: string;
  channel?: string;
  info?: string;
  intent: BookingIntent | null;
}

const CHANNEL_STYLE: Record<string, { bar: string; text: string; label: string }> = {
  booking: { bar: 'bg-blue-500', text: 'text-white', label: 'Booking.com' },
  'booking.com': { bar: 'bg-blue-500', text: 'text-white', label: 'Booking.com' },
  airbnb: { bar: 'bg-rose-500', text: 'text-white', label: 'Airbnb' },
  admin: { bar: 'bg-gray-600', text: 'text-white', label: 'Admin' },
  direct: { bar: 'bg-emerald-600', text: 'text-white', label: 'Website' },
  external: { bar: 'bg-violet-500', text: 'text-white', label: 'External' },
};

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(iso: string, days: number) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return ymd(d);
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function channelStyle(b: CalendarBooking) {
  const ch = (b.channel || b.referer || '').toLowerCase();
  if (ch.includes('booking')) return CHANNEL_STYLE['booking.com'];
  if (ch.includes('airbnb')) return CHANNEL_STYLE.airbnb;
  if (ch.includes('admin')) return CHANNEL_STYLE.admin;
  if (ch.includes('direct') || ch.includes('website') || ch.includes('bokoboko')) return CHANNEL_STYLE.direct;
  if (b.intent) {
    const src = (b.intent.paystack_raw as { source?: string } | null)?.source;
    if (src === 'admin_manual') return CHANNEL_STYLE.admin;
    if (src === 'beds24_archive') {
      const ref = String((b.intent.beds24_raw as { referer?: string } | null)?.referer || b.referer || '').toLowerCase();
      if (ref.includes('booking')) return CHANNEL_STYLE['booking.com'];
      if (ref.includes('airbnb')) return CHANNEL_STYLE.airbnb;
    }
    return CHANNEL_STYLE.direct;
  }
  return CHANNEL_STYLE.external;
}

function guestLabel(b: CalendarBooking) {
  const name = `${b.firstName || ''} ${b.lastName || ''}`.trim();
  return name || 'Guest';
}

function nights(arrival: string, departure: string) {
  return Math.max(
    1,
    Math.round((new Date(departure + 'T12:00:00').getTime() - new Date(arrival + 'T12:00:00').getTime()) / 86400000)
  );
}

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCancelled, setShowCancelled] = useState(false);
  const [selected, setSelected] = useState<CalendarBooking | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const monthStart = `${year}-${pad(month + 1)}-01`;
  const dim = daysInMonth(year, month);
  const monthEnd = `${year}-${pad(month + 1)}-${pad(dim)}`;
  const today = ymd(new Date());

  const dayCols = useMemo(
    () => Array.from({ length: dim }, (_, i) => `${year}-${pad(month + 1)}-${pad(i + 1)}`),
    [year, month, dim]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Pad window so multi-month stays still render into this month
      const from = addDays(monthStart, -7);
      const to = addDays(monthEnd, 7);
      const res = await fetch(
        `/api/admin/bookings?from=${from}&to=${to}&dateType=staying`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load bookings');
      setBookings(data.bookings ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [monthStart, monthEnd]);

  useEffect(() => {
    load();
  }, [load]);

  function shiftMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setSelected(null);
  }

  function goToday() {
    const n = new Date();
    setYear(n.getFullYear());
    setMonth(n.getMonth());
    setSelected(null);
  }

  const visible = useMemo(() => {
    return bookings.filter((b) => {
      if (!showCancelled && b.status === 'cancelled') return false;
      // Overlaps this calendar month (nights = [arrival, departure))
      return b.arrival < addDays(monthEnd, 1) && b.departure > monthStart;
    });
  }, [bookings, showCancelled, monthStart, monthEnd]);

  const byRoom = useMemo(() => {
    const map = new Map<number, CalendarBooking[]>();
    for (const room of ROOMS) map.set(room.id, []);
    for (const b of visible) {
      const list = map.get(b.roomId) ?? [];
      list.push(b);
      map.set(b.roomId, list);
    }
    return map;
  }, [visible]);

  /** Position a stay bar within the month grid (1-based day columns). */
  function barLayout(b: CalendarBooking) {
    const startDay = b.arrival < monthStart ? 1 : Number(b.arrival.slice(8, 10));
    // departure day is exclusive for nights; clamp into month
    const endExclusive = b.departure > addDays(monthEnd, 1) ? dim + 1 : Number(b.departure.slice(8, 10));
    const endDay = Math.max(startDay, endExclusive); // grid column after last night
    const span = Math.max(1, endDay - startDay);
    // If checkout is day 1 of month and arrival was previous month, still show a thin marker
    const colStart = startDay;
    return { colStart, span, startsBefore: b.arrival < monthStart, endsAfter: b.departure > addDays(monthEnd, 1) };
  }

  async function runAction(action: 'cancel' | 'confirm' | 'mark_paid') {
    if (!selected) return;
    setActionBusy(true);
    try {
      const id = selected.id ?? selected.intent?.beds24_booking_id ?? 0;
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reference: selected.intent?.reference }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');
      setSelected(null);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionBusy(false);
    }
  }

  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-GH', {
    month: 'long',
    year: 'numeric',
  });

  const occupiedNights = visible
    .filter((b) => b.status !== 'cancelled')
    .reduce((sum, b) => {
      const start = b.arrival < monthStart ? monthStart : b.arrival;
      const end = b.departure > addDays(monthEnd, 1) ? addDays(monthEnd, 1) : b.departure;
      return sum + Math.max(0, nights(start, end));
    }, 0);

  return (
    <div className="p-6 lg:p-8 space-y-5 max-w-[1600px]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Room occupancy from the local store and synced iCal feeds
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ← Prev
          </button>
          <button
            type="button"
            onClick={goToday}
            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Next →
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="px-3 py-2 rounded-lg bg-[#2d5a27] text-white text-sm font-semibold hover:bg-[#245020] disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <h2 className="text-lg font-semibold text-gray-800 min-w-[180px]">{monthLabel}</h2>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showCancelled}
            onChange={(e) => setShowCancelled(e.target.checked)}
            className="rounded border-gray-300"
          />
          Show cancelled
        </label>
        <p className="text-sm text-gray-500">
          {visible.filter((b) => b.status !== 'cancelled').length} stays · {occupiedNights} room-nights this month
        </p>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        {Object.values(CHANNEL_STYLE).map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5 text-gray-600">
            <span className={`w-3 h-3 rounded-sm ${s.bar}`} />
            {s.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 text-gray-600">
          <span className="w-3 h-3 rounded-sm bg-red-300 opacity-70" />
          Cancelled
        </span>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <div
            className="min-w-[900px]"
            style={{
              display: 'grid',
              gridTemplateColumns: `140px repeat(${dim}, minmax(28px, 1fr))`,
            }}
          >
            {/* Header */}
            <div className="sticky left-0 z-20 bg-gray-50 border-b border-r border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500">
              Room
            </div>
            {dayCols.map((d) => {
              const dayNum = Number(d.slice(8, 10));
              const dow = new Date(d + 'T12:00:00').getDay();
              const isWeekend = dow === 0 || dow === 6;
              const isTod = d === today;
              return (
                <div
                  key={d}
                  className={`border-b border-gray-200 px-0.5 py-2 text-center text-[10px] font-semibold ${
                    isTod
                      ? 'bg-[#2d5a27] text-white'
                      : isWeekend
                        ? 'bg-amber-50 text-amber-800'
                        : 'bg-gray-50 text-gray-500'
                  }`}
                >
                  <div className="opacity-70">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'][dow]}
                  </div>
                  <div className="text-xs">{dayNum}</div>
                </div>
              );
            })}

            {/* Rows */}
            {ROOMS.map((room) => {
              const roomBookings = byRoom.get(room.id) ?? [];
              return (
                <div key={room.id} className="contents">
                  <div className="sticky left-0 z-10 bg-white border-b border-r border-gray-100 px-3 py-3 text-sm font-semibold text-gray-800 flex items-center">
                    {room.name}
                  </div>
                  <div
                    className="relative border-b border-gray-100"
                    style={{
                      gridColumn: `2 / span ${dim}`,
                      display: 'grid',
                      gridTemplateColumns: `repeat(${dim}, minmax(28px, 1fr))`,
                      minHeight: 56,
                    }}
                  >
                    {/* Day grid lines */}
                    {dayCols.map((d) => {
                      const dow = new Date(d + 'T12:00:00').getDay();
                      const isWeekend = dow === 0 || dow === 6;
                      const isTod = d === today;
                      return (
                        <div
                          key={d}
                          className={`border-r border-gray-50 ${
                            isTod ? 'bg-emerald-50/60' : isWeekend ? 'bg-amber-50/40' : ''
                          }`}
                        />
                      );
                    })}

                    {/* Booking bars */}
                    {roomBookings.map((b, idx) => {
                      const { colStart, span, startsBefore, endsAfter } = barLayout(b);
                      const style = channelStyle(b);
                      const cancelled = b.status === 'cancelled';
                      const key = `${b.id ?? b.intent?.reference ?? idx}-${b.arrival}`;
                      return (
                        <button
                          key={key}
                          type="button"
                          title={`${guestLabel(b)} · ${b.arrival} → ${b.departure} · ${b.status}`}
                          onClick={() => setSelected(b)}
                          className={`absolute top-2 bottom-2 z-[1] px-1.5 flex items-center overflow-hidden text-left rounded-md shadow-sm hover:brightness-110 hover:z-[2] focus:outline-none focus:ring-2 focus:ring-[#2d5a27] ${
                            cancelled ? 'bg-red-200 text-red-800 line-through opacity-70' : `${style.bar} ${style.text}`
                          } ${startsBefore ? 'rounded-l-none' : ''} ${endsAfter ? 'rounded-r-none' : ''}`}
                          style={{
                            left: `calc((100% / ${dim}) * ${colStart - 1} + 2px)`,
                            width: `calc((100% / ${dim}) * ${span} - 4px)`,
                          }}
                        >
                          <span className="truncate text-[10px] font-semibold leading-tight">
                            {guestLabel(b)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {loading && (
          <div className="px-4 py-8 text-center text-sm text-gray-400">Loading calendar…</div>
        )}
        {!loading && visible.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-400">
            No bookings in this month.
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setSelected(null)}>
          <aside
            className="w-full max-w-md h-full bg-white shadow-xl p-6 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Booking</p>
                <h3 className="text-xl font-bold text-gray-900 mt-0.5">{guestLabel(selected)}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-700 text-sm font-medium"
              >
                Close
              </button>
            </div>

            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Room</dt>
                <dd className="font-medium text-gray-900 text-right">
                  {ROOMS.find((r) => r.id === selected.roomId)?.name ?? selected.roomId}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Dates</dt>
                <dd className="font-medium text-gray-900 text-right">
                  {selected.arrival} → {selected.departure}
                  <span className="block text-xs text-gray-400 font-normal">
                    {nights(selected.arrival, selected.departure)} night
                    {nights(selected.arrival, selected.departure) === 1 ? '' : 's'}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Guests</dt>
                <dd className="font-medium text-gray-900">
                  {selected.numAdult} adult{selected.numAdult === 1 ? '' : 's'}
                  {selected.numChild ? `, ${selected.numChild} child` : ''}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Channel</dt>
                <dd>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${channelStyle(selected).bar} ${channelStyle(selected).text}`}>
                    {channelStyle(selected).label}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Status</dt>
                <dd className="font-medium capitalize text-gray-900">{selected.status}</dd>
              </div>
              {selected.email && (
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Email</dt>
                  <dd className="font-medium text-gray-900 text-right break-all">{selected.email}</dd>
                </div>
              )}
              {selected.phone && (
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Phone</dt>
                  <dd className="font-medium text-gray-900">{selected.phone}</dd>
                </div>
              )}
              {selected.intent?.reference && (
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Reference</dt>
                  <dd className="font-mono text-xs text-gray-800">{selected.intent.reference}</dd>
                </div>
              )}
              {selected.id != null && (
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Booking ID</dt>
                  <dd className="font-mono text-xs text-gray-800">{selected.id}</dd>
                </div>
              )}
              {selected.info && (
                <div>
                  <dt className="text-gray-500 mb-1">Notes</dt>
                  <dd className="text-gray-800 bg-gray-50 rounded-lg p-3 text-xs whitespace-pre-wrap">
                    {selected.info}
                  </dd>
                </div>
              )}
            </dl>

            {selected.intent && selected.status !== 'cancelled' && (
              <div className="mt-6 flex flex-wrap gap-2">
                {selected.intent.status !== 'CONFIRMED' && (
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => runAction('confirm')}
                    className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    Confirm
                  </button>
                )}
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => runAction('mark_paid')}
                  className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50"
                >
                  Mark paid
                </button>
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => {
                    if (confirm('Cancel this booking?')) runAction('cancel');
                  }}
                  className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            )}

            <a
              href="/admin"
              className="mt-6 inline-block text-sm font-medium text-[#2d5a27] hover:underline"
            >
              Open bookings list →
            </a>
          </aside>
        </div>
      )}
    </div>
  );
}
