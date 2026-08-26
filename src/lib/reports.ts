import { getBookings } from '@/lib/beds24';
import { getSetting, setSetting, listSettingsByPrefix } from '@/lib/supabase';

export interface ReportEntry {
  label: string;
  count: number;
  revenue: number; // GHS
}

export interface MonthlyReport {
  period: string;       // 'YYYY-MM'
  dateFrom: string;     // 'YYYY-MM-DD'
  dateTo: string;
  generatedAt: string;
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  totalRevenueGHS: number;
  byChannel: ReportEntry[];
  byRoom: ReportEntry[];
  byStatus: ReportEntry[];
}

const GHS_PER_USD = Number(process.env.GHS_PER_USD ?? '15.5');

const ROOM_NAMES: Record<number, string> = {
  691857: 'Patience',
  691859: 'Regeneration',
  691860: 'Humility',
  691861: 'Wisdom',
  691862: 'Truth & Honesty',
  691863: 'Love',
  691864: 'Generosity',
};

const CHANNEL_MAP: Record<string, string> = {
  'booking.com': 'Booking.com',
  'airbnb': 'Airbnb',
  'hostelworld': 'Hostelworld',
  'expedia': 'Expedia',
  'bokoboko admin': 'Admin',
  'bokoboko direct': 'Website',
};

function resolveChannel(b: { referer?: string; channel?: string }): string {
  const ch = (b as { channel?: string }).channel;
  if (ch) {
    const mapped = CHANNEL_MAP[ch.toLowerCase()];
    return mapped ?? ch; // use raw channel name if not in our map
  }
  if (b.referer) {
    const key = b.referer.toLowerCase();
    if (CHANNEL_MAP[key]) return CHANNEL_MAP[key];
    if (key.includes('admin')) return 'Admin';
    if (key.includes('bokoboko') || key.includes('direct')) return 'Website';
  }
  // Beds24 doesn't echo referer back on GET — bookings with no channel
  // are our own direct/website bookings.
  return 'Website';
}

function aggregate(items: string[], revenues: number[]): ReportEntry[] {
  const map = new Map<string, { count: number; revenue: number }>();
  for (let i = 0; i < items.length; i++) {
    const key = items[i];
    const existing = map.get(key) ?? { count: 0, revenue: 0 };
    map.set(key, { count: existing.count + 1, revenue: existing.revenue + revenues[i] });
  }
  return [...map.entries()]
    .map(([label, v]) => ({ label, ...v }))
    .sort((a, b) => b.count - a.count);
}

export async function generateReport(dateFrom: string, dateTo: string, period: string): Promise<MonthlyReport> {
  const all = await getBookings({ startArrival: dateFrom, endArrival: dateTo });
  // Beds24 may ignore date params and return all bookings — filter here to be safe
  const bookings = all.filter(b => b.arrival >= dateFrom && b.arrival <= dateTo);

  const channels: string[] = [];
  const rooms: string[] = [];
  const statuses: string[] = [];
  const revenues: number[] = [];

  for (const b of bookings) {
    // b.price from Beds24 is the total booking price, not per-night
    const ghsRevenue = (b.price ?? 0) * GHS_PER_USD;
    channels.push(resolveChannel(b));
    rooms.push(ROOM_NAMES[b.roomId] ?? `Room ${b.roomId}`);
    statuses.push(b.status);
    revenues.push(b.status === 'cancelled' ? 0 : ghsRevenue);
  }

  const totalRevenueGHS = revenues.reduce((s, r) => s + r, 0);

  return {
    period,
    dateFrom,
    dateTo,
    generatedAt: new Date().toISOString(),
    totalBookings: bookings.length,
    confirmedBookings: bookings.filter(b => b.status === 'confirmed').length,
    cancelledBookings: bookings.filter(b => b.status === 'cancelled').length,
    totalRevenueGHS,
    byChannel: aggregate(channels, revenues),
    byRoom: aggregate(rooms, revenues),
    byStatus: aggregate(statuses, revenues),
  };
}

export async function getReport(period: string): Promise<MonthlyReport | null> {
  return getSetting<MonthlyReport | null>(`report_${period}`, null);
}

export async function saveReport(report: MonthlyReport): Promise<void> {
  await setSetting(`report_${report.period}`, report);
}

export async function listReports(): Promise<{ period: string; generatedAt: string; totalBookings: number; totalRevenueGHS: number }[]> {
  const rows = await listSettingsByPrefix('report_');
  return rows.map(row => {
    const v = row.value as MonthlyReport;
    return {
      period: v.period ?? (row.key as string).replace('report_', ''),
      generatedAt: v.generatedAt ?? '',
      totalBookings: v.totalBookings ?? 0,
      totalRevenueGHS: v.totalRevenueGHS ?? 0,
    };
  });
}

export function prevMonthPeriod(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
}

export function periodToDates(period: string): { dateFrom: string; dateTo: string } {
  const [y, m] = period.split('-').map(Number);
  const dateFrom = `${period}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const dateTo = `${period}-${String(lastDay).padStart(2, '0')}`;
  return { dateFrom, dateTo };
}
