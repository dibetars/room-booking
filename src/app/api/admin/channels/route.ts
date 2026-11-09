import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ROOMS } from '@/lib/rooms';
import {
  CHANNEL_MODE_KEY,
  getChannelMode,
  getRoomIcalFeeds,
  getSyncedIcalState,
  saveRoomIcalFeeds,
  syncAllRoomIcalFeeds,
} from '@/lib/ical';
import { setSetting } from '@/lib/supabase';
import { invalidate } from '@/lib/server-cache';

export async function GET(req: NextRequest) {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') ||
    `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  const [channelMode, feeds, syncState] = await Promise.all([
    getChannelMode(),
    getRoomIcalFeeds(),
    getSyncedIcalState(),
  ]);

  const rooms = ROOMS.map((r) => {
    const feed = feeds.find((f) => f.roomId === r.id);
    const eventCount = syncState.events.filter((e) => e.roomId === r.id).length;
    return {
      roomId: r.id,
      name: r.name,
      exportIcsUrl: `${baseUrl}/api/ical/${r.id}.ics`,
      airbnbUrl: feed?.airbnbUrl ?? '',
      bookingComUrl: feed?.bookingComUrl ?? '',
      otherUrl: feed?.otherUrl ?? '',
      syncedEventCount: eventCount,
    };
  });

  return NextResponse.json({
    channelMode,
    rooms,
    lastSyncedAt: syncState.lastSyncedAt,
    totalSyncedEvents: syncState.events.length,
    errors: syncState.errors,
  });
}

const putSchema = z.object({
  channelMode: z.enum(['beds24', 'direct']).optional(),
  feeds: z
    .array(
      z.object({
        roomId: z.number().int().positive(),
        airbnbUrl: z.string().optional().default(''),
        bookingComUrl: z.string().optional().default(''),
        otherUrl: z.string().optional().default(''),
      })
    )
    .optional(),
});

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    if (parsed.data.channelMode) {
      await setSetting(CHANNEL_MODE_KEY, parsed.data.channelMode);
    }
    if (parsed.data.feeds) {
      await saveRoomIcalFeeds(parsed.data.feeds);
    }
    invalidate('bookings:');
    invalidate('analytics:');
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save channel settings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const syncState = await syncAllRoomIcalFeeds();
    invalidate('bookings:');
    invalidate('analytics:');
    return NextResponse.json({
      ok: true,
      lastSyncedAt: syncState.lastSyncedAt,
      totalSyncedEvents: syncState.events.length,
      errors: syncState.errors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'iCal sync failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
