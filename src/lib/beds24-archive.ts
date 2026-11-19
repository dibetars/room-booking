import { getSetting } from '@/lib/supabase';
import type { Beds24Message } from '@/lib/beds24';

const ARCHIVE_MESSAGES_KEY = 'beds24_archive_messages';

interface RawArchivedMessage {
  id?: number;
  bookingId?: number;
  roomId?: number;
  propertyId?: number;
  time?: string;
  read?: boolean;
  message?: string;
  source?: string;
  authorOwnerId?: number | null;
}

/** Read-only archived Beds24 guest/host messages (no live API). */
export async function getArchivedMessages(params: {
  bookingId?: number;
  startDate?: string;
  endDate?: string;
} = {}): Promise<Beds24Message[]> {
  const raw = await getSetting<RawArchivedMessage[]>(ARCHIVE_MESSAGES_KEY, []);
  let rows = Array.isArray(raw) ? raw : [];

  if (params.bookingId) {
    rows = rows.filter((m) => Number(m.bookingId) === params.bookingId);
  }
  if (params.startDate) {
    const start = `${params.startDate}T00:00:00.000Z`;
    rows = rows.filter((m) => !m.time || m.time >= start);
  }
  if (params.endDate) {
    const end = `${params.endDate}T23:59:59.999Z`;
    rows = rows.filter((m) => !m.time || m.time <= end);
  }

  const mapped: Beds24Message[] = rows
    .filter((m) => m.id != null)
    .map((m) => ({
      id: Number(m.id),
      bookingId: Number(m.bookingId ?? 0),
      roomId: m.roomId != null ? Number(m.roomId) : undefined,
      propertyId: m.propertyId != null ? Number(m.propertyId) : undefined,
      time: m.time ?? '',
      read: m.read,
      message: m.message ?? '',
      source: (m.source === 'host' ? 'host' : 'guest') as 'host' | 'guest',
      authorOwnerId: m.authorOwnerId ?? null,
    }));

  return mapped.sort((a, b) => a.time.localeCompare(b.time));
}
