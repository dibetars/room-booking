import { ROOMS } from '@/lib/rooms';
import { getActiveBookingIntents, getAllBookingIntentsInWindow, getSetting, setSetting } from '@/lib/supabase';
import type { Beds24Booking, BookingIntent } from '@/types';

export type ChannelMode = 'beds24' | 'direct';

export const CHANNEL_MODE_KEY = 'channel_mode';
export const ICAL_FEEDS_KEY = 'ical_room_feeds';
export const ICAL_EVENTS_KEY = 'ical_synced_events';

export interface RoomIcalFeedConfig {
  roomId: number;
  airbnbUrl?: string;
  bookingComUrl?: string;
  otherUrl?: string;
}

export interface SyncedIcalEvent {
  uid: string;
  roomId: number;
  source: 'Airbnb' | 'Booking.com' | 'External';
  summary: string;
  checkIn: string;   // YYYY-MM-DD
  checkOut: string;  // YYYY-MM-DD
  syncedAt: string;
}

export interface IcalSyncState {
  events: SyncedIcalEvent[];
  lastSyncedAt: string | null;
  errors: { roomId: number; source: string; error: string }[];
}

export async function getChannelMode(): Promise<ChannelMode> {
  const mode = await getSetting<string>(CHANNEL_MODE_KEY, 'beds24');
  return mode === 'direct' ? 'direct' : 'beds24';
}

export async function getRoomIcalFeeds(): Promise<RoomIcalFeedConfig[]> {
  const saved = await getSetting<RoomIcalFeedConfig[]>(ICAL_FEEDS_KEY, []);
  const byRoom = new Map((saved ?? []).map((f) => [f.roomId, f]));
  return ROOMS.map((r) => ({
    roomId: r.id,
    airbnbUrl: byRoom.get(r.id)?.airbnbUrl ?? '',
    bookingComUrl: byRoom.get(r.id)?.bookingComUrl ?? '',
    otherUrl: byRoom.get(r.id)?.otherUrl ?? '',
  }));
}

export async function saveRoomIcalFeeds(feeds: RoomIcalFeedConfig[]): Promise<void> {
  await setSetting(ICAL_FEEDS_KEY, feeds);
}

export async function getSyncedIcalState(): Promise<IcalSyncState> {
  return getSetting<IcalSyncState>(ICAL_EVENTS_KEY, {
    events: [],
    lastSyncedAt: null,
    errors: [],
  });
}

function parseIcsDate(raw: string): string | null {
  // Matches YYYYMMDD or YYYYMMDDTHHMMSSZ
  const cleaned = raw.trim();
  const m = cleaned.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/** Parse standard RFC 5545 VCALENDAR text into date ranges. */
export function parseIcsEvents(
  icsText: string,
  roomId: number,
  source: 'Airbnb' | 'Booking.com' | 'External'
): SyncedIcalEvent[] {
  // Unfold RFC 5545 folded lines (CRLF + space/tab)
  const unfolded = icsText.replace(/\r?\n[ \t]/g, '');
  const blocks = unfolded.split(/BEGIN:VEVENT/i).slice(1);
  const nowIso = new Date().toISOString();
  const events: SyncedIcalEvent[] = [];

  for (const block of blocks) {
    const body = block.split(/END:VEVENT/i)[0] ?? '';
    const lines = body.split(/\r?\n/);

    let uid = '';
    let dtStart = '';
    let dtEnd = '';
    let summary = `${source} Reservation`;

    for (const line of lines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const keyPart = line.slice(0, colonIdx).toUpperCase();
      const val = line.slice(colonIdx + 1).trim();

      if (keyPart === 'UID' || keyPart.startsWith('UID;')) {
        uid = val;
      } else if (keyPart === 'DTSTART' || keyPart.startsWith('DTSTART;')) {
        dtStart = parseIcsDate(val) ?? '';
      } else if (keyPart === 'DTEND' || keyPart.startsWith('DTEND;')) {
        dtEnd = parseIcsDate(val) ?? '';
      } else if (keyPart === 'SUMMARY' || keyPart.startsWith('SUMMARY;')) {
        summary = val.replace(/\\,/g, ',').replace(/\\n/g, ' ').trim() || summary;
      }
    }

    if (dtStart && dtEnd && dtEnd > dtStart) {
      events.push({
        uid: uid || `${roomId}-${source}-${dtStart}-${dtEnd}`,
        roomId,
        source,
        summary,
        checkIn: dtStart,
        checkOut: dtEnd,
        syncedAt: nowIso,
      });
    }
  }

  return events;
}

/** Poll all configured Airbnb / Booking.com iCal URLs and update stored events. */
export async function syncAllRoomIcalFeeds(): Promise<IcalSyncState> {
  const feeds = await getRoomIcalFeeds();
  const allEvents: SyncedIcalEvent[] = [];
  const errors: { roomId: number; source: string; error: string }[] = [];
  const cutoff = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);

  const tasks: Promise<void>[] = [];

  for (const feed of feeds) {
    const sources: Array<{ source: 'Airbnb' | 'Booking.com' | 'External'; url?: string }> = [
      { source: 'Airbnb', url: feed.airbnbUrl?.trim() },
      { source: 'Booking.com', url: feed.bookingComUrl?.trim() },
      { source: 'External', url: feed.otherUrl?.trim() },
    ];

    for (const { source, url } of sources) {
      if (!url) continue;
      tasks.push(
        (async () => {
          try {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 8000);
            const res = await fetch(url, {
              signal: ctrl.signal,
              headers: { 'User-Agent': 'BokoBoko-Channel-Sync/1.0' },
              cache: 'no-store',
            });
            clearTimeout(timer);
            if (!res.ok) {
              errors.push({ roomId: feed.roomId, source, error: `HTTP ${res.status}` });
              return;
            }
            const text = await res.text();
            const parsed = parseIcsEvents(text, feed.roomId, source).filter(
              (ev) => ev.checkOut >= cutoff
            );
            allEvents.push(...parsed);
          } catch (err) {
            errors.push({
              roomId: feed.roomId,
              source,
              error: err instanceof Error ? err.message : 'Fetch failed',
            });
          }
        })()
      );
    }
  }

  await Promise.all(tasks);

  const state: IcalSyncState = {
    events: allEvents,
    lastSyncedAt: new Date().toISOString(),
    errors,
  };

  await setSetting(ICAL_EVENTS_KEY, state);
  return state;
}

function toIcsDateValue(ymd: string): string {
  return ymd.replace(/-/g, '');
}

function escapeIcsText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/**
 * Build an outbound RFC 5545 `.ics` calendar for a single BokoBoko room.
 * Includes active direct/admin bookings from `booking_intents` plus any synced
 * events from other external calendars so Airbnb & Booking.com stay cross-blocked.
 */
export async function generateRoomIcs(roomId: number): Promise<string | null> {
  const room = ROOMS.find((r) => r.id === roomId);
  if (!room) return null;

  const from = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [intents, synced] = await Promise.all([
    getActiveBookingIntents({ roomId, from }),
    getSyncedIcalState(),
  ]);

  const dtStamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BokoBoko Beach Resort//Room Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:BokoBoko - ${escapeIcsText(room.name)}`,
  ];

  for (const intent of intents) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${intent.reference}@book.bokoboko.org`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART;VALUE=DATE:${toIcsDateValue(intent.check_in)}`,
      `DTEND;VALUE=DATE:${toIcsDateValue(intent.check_out)}`,
      `SUMMARY:${escapeIcsText(`Reserved - ${intent.reference}`)}`,
      `DESCRIPTION:${escapeIcsText(`BokoBoko direct reservation (${intent.status})`)}`,
      'STATUS:CONFIRMED',
      'END:VEVENT'
    );
  }

  for (const ev of synced.events.filter((e) => e.roomId === roomId)) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:ext-${escapeIcsText(ev.uid)}@book.bokoboko.org`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART;VALUE=DATE:${toIcsDateValue(ev.checkIn)}`,
      `DTEND;VALUE=DATE:${toIcsDateValue(ev.checkOut)}`,
      `SUMMARY:${escapeIcsText(`Booked (${ev.source})`)}`,
      'STATUS:CONFIRMED',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

/** Check room availability directly against Supabase `booking_intents` + synced iCal events. */
export async function checkDirectAvailability(
  roomIds: number[],
  checkIn: string,
  checkOut: string
): Promise<{ roomId: number; available: boolean }[]> {
  const [intents, synced] = await Promise.all([
    getActiveBookingIntents({ from: checkIn, to: checkOut }),
    getSyncedIcalState(),
  ]);

  return roomIds.map((roomId) => {
    const hasIntentConflict = intents.some(
      (i) => i.room_id === roomId && i.check_in < checkOut && i.check_out > checkIn
    );
    const hasIcalConflict = synced.events.some(
      (e) => e.roomId === roomId && e.checkIn < checkOut && e.checkOut > checkIn
    );
    return {
      roomId,
      available: !hasIntentConflict && !hasIcalConflict,
    };
  });
}

function stableNumericId(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

/**
 * Build unified `Beds24Booking & { intent }` rows directly from Supabase `booking_intents`
 * + synced iCal blocks when running in Direct (no-Beds24) mode.
 */
export async function getDirectBookingsWithIntents(opts: {
  from: string;
  to: string;
}): Promise<Array<Beds24Booking & { intent: BookingIntent | null }>> {
  const [intents, synced] = await Promise.all([
    getAllBookingIntentsInWindow({ from: opts.from, to: opts.to }),
    getSyncedIcalState(),
  ]);

  const rows: Array<Beds24Booking & { intent: BookingIntent | null }> = [];

  for (const intent of intents) {
    const [firstName, ...rest] = (intent.guest_name || 'Guest').trim().split(/\s+/);
    const lastName = rest.join(' ') || '-';
    const room = ROOMS.find((r) => r.id === intent.room_id);
    const nights = Math.max(
      1,
      Math.round(
        (new Date(intent.check_out).getTime() - new Date(intent.check_in).getTime()) / 86400000
      )
    );
    const statusMap: Record<BookingIntent['status'], Beds24Booking['status']> = {
      DRAFT: 'request',
      HELD: 'request',
      PAYMENT_PENDING: 'new',
      PAID: 'confirmed',
      CONFIRMED: 'confirmed',
      EXPIRED: 'cancelled',
      PAYMENT_FAILED: 'cancelled',
      RECONCILE_NEEDED: 'new',
      CANCELLED: 'cancelled',
    };
    const isAdmin =
      typeof intent.paystack_raw === 'object' &&
      intent.paystack_raw !== null &&
      (intent.paystack_raw as { source?: string }).source === 'admin_manual';

    rows.push({
      id: intent.beds24_booking_id ?? stableNumericId(intent.reference),
      roomId: intent.room_id,
      arrival: intent.check_in,
      departure: intent.check_out,
      numAdult: intent.adults,
      numChild: intent.children,
      firstName,
      lastName,
      email: intent.guest_email,
      phone: intent.guest_phone ?? undefined,
      status: statusMap[intent.status] ?? 'new',
      price: (room?.rackRateUSD ?? 45) * nights,
      referer: isAdmin ? 'BokoBoko Admin' : 'BokoBoko Direct',
      channel: 'direct',
      info: `Ref: ${intent.reference}`,
      intent,
    });
  }

  for (const ev of synced.events) {
    if (ev.checkOut < opts.from || ev.checkIn > opts.to) continue;
    const room = ROOMS.find((r) => r.id === ev.roomId);
    const nights = Math.max(
      1,
      Math.round((new Date(ev.checkOut).getTime() - new Date(ev.checkIn).getTime()) / 86400000)
    );
    rows.push({
      id: stableNumericId(ev.uid),
      roomId: ev.roomId,
      arrival: ev.checkIn,
      departure: ev.checkOut,
      numAdult: 2,
      numChild: 0,
      firstName: ev.source,
      lastName: ev.summary || 'Guest',
      email: '',
      status: 'confirmed',
      price: (room?.rackRateUSD ?? 45) * nights,
      referer: ev.source,
      channel: ev.source.toLowerCase(),
      info: `Synced via iCal (${ev.uid})`,
      intent: null,
    });
  }

  return rows;
}
