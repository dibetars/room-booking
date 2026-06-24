import { NextResponse } from 'next/server';
import { getBookings } from '@/lib/beds24';
import { ROOMS } from '@/lib/rooms';
import { withCache } from '@/lib/server-cache';

const ANALYTICS_TTL = 5 * 60 * 1000; // 5 minutes

function normalizeChannel(referer?: string): string {
  if (!referer) return 'Direct';
  const l = referer.toLowerCase();
  if (l.includes('booking.com')) return 'Booking.com';
  if (l.includes('airbnb')) return 'Airbnb';
  if (l.includes('hostelworld')) return 'Hostelworld';
  if (l.includes('expedia')) return 'Expedia';
  if (l.includes('admin')) return 'Admin';
  return referer;
}

function nightsBetween(arrival: string, departure: string): number {
  return Math.round((new Date(departure).getTime() - new Date(arrival).getTime()) / 86400000);
}

function monthLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export async function GET() {
  try {
    return NextResponse.json(await withCache('analytics:main', ANALYTICS_TTL, async () => {
    const from = new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10);
    const to = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    const all = await getBookings({ startArrival: from, endArrival: to });
    // Count any real booking toward revenue: OTA bookings (Booking.com, Airbnb)
    // land as 'new', direct paid bookings as 'confirmed'. Exclude only
    // cancelled bookings, unpaid direct holds ('request'), and owner blocks.
    const confirmed = all.filter((b) => b.status === 'confirmed' || b.status === 'new');
    const today = new Date().toISOString().slice(0, 10);
    const thisMonth = today.slice(0, 7);

    const monthMap = new Map<string, { revenue: number; bookings: number; nights: number }>();
    const channelMap = new Map<string, { revenue: number; bookings: number }>();
    const roomMap = new Map<number, { revenue: number; bookings: number; nights: number }>();

    for (const b of confirmed) {
      const n = nightsBetween(b.arrival, b.departure);
      const price = b.price ?? 0;
      const month = b.arrival.slice(0, 7);
      const channel = normalizeChannel(b.referer);

      const mo = monthMap.get(month) ?? { revenue: 0, bookings: 0, nights: 0 };
      monthMap.set(month, { revenue: mo.revenue + price, bookings: mo.bookings + 1, nights: mo.nights + n });

      const ch = channelMap.get(channel) ?? { revenue: 0, bookings: 0 };
      channelMap.set(channel, { revenue: ch.revenue + price, bookings: ch.bookings + 1 });

      const rm = roomMap.get(b.roomId) ?? { revenue: 0, bookings: 0, nights: 0 };
      roomMap.set(b.roomId, { revenue: rm.revenue + price, bookings: rm.bookings + 1, nights: rm.nights + n });
    }

    const totalRevenue = confirmed.reduce((s, b) => s + (b.price ?? 0), 0);

    return {
      totalRevenue: Math.round(totalRevenue),
      thisMonthRevenue: Math.round(monthMap.get(thisMonth)?.revenue ?? 0),
      upcomingRevenue: Math.round(confirmed.filter((b) => b.arrival >= today).reduce((s, b) => s + (b.price ?? 0), 0)),
      avgBookingValue: confirmed.length > 0 ? Math.round(totalRevenue / confirmed.length) : 0,
      totalConfirmed: confirmed.length,
      monthlyRevenue: Array.from(monthMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, d]) => ({
          month,
          label: monthLabel(month),
          revenue: Math.round(d.revenue),
          bookings: d.bookings,
          avgStay: d.bookings > 0 ? +(d.nights / d.bookings).toFixed(1) : 0,
        })),
      channelBreakdown: Array.from(channelMap.entries())
        .sort(([, a], [, b]) => b.revenue - a.revenue)
        .map(([channel, d]) => ({
          channel,
          revenue: Math.round(d.revenue),
          bookings: d.bookings,
          share: totalRevenue > 0 ? Math.round((d.revenue / totalRevenue) * 100) : 0,
        })),
      roomPerformance: Array.from(roomMap.entries())
        .sort(([, a], [, b]) => b.revenue - a.revenue)
        .map(([roomId, d]) => ({
          roomId,
          name: ROOMS.find((r) => r.id === roomId)?.name ?? `Room ${roomId}`,
          revenue: Math.round(d.revenue),
          bookings: d.bookings,
          totalNights: d.nights,
          avgStay: d.bookings > 0 ? +(d.nights / d.bookings).toFixed(1) : 0,
        })),
    };
    }));
  } catch (err) {
    console.error('[analytics]', err);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 502 });
  }
}
