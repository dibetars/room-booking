// Run this SQL in your Supabase SQL editor before using room edits:
//
// CREATE TABLE IF NOT EXISTS room_overrides (
//   room_id INTEGER PRIMARY KEY,
//   name TEXT,
//   description TEXT,
//   max_occupancy INTEGER,
//   rack_rate_usd NUMERIC(10,2),
//   updated_at TIMESTAMPTZ DEFAULT NOW()
// );

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ROOMS } from '@/lib/rooms';
import { getRoomOverrides, upsertRoomOverride } from '@/lib/supabase';

export async function GET() {
  let overrides: Awaited<ReturnType<typeof getRoomOverrides>> = [];
  try {
    overrides = await getRoomOverrides();
  } catch {
    // table not yet created — return static config
  }

  const overrideMap = new Map(overrides.map((o) => [o.room_id, o]));

  const rooms = ROOMS.map((r) => {
    const o = overrideMap.get(r.id);
    return {
      id: r.id,
      name: o?.name ?? r.name,
      description: o?.description ?? r.description,
      maxOccupancy: o?.max_occupancy ?? r.maxOccupancy,
      rackRateUSD: o?.rack_rate_usd ?? r.rackRateUSD,
      photos: r.photos,
    };
  });

  return NextResponse.json({ rooms });
}

const updateSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  description: z.string().min(1),
  maxOccupancy: z.number().int().min(1).max(20),
  rackRateUSD: z.number().positive(),
});

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });

  const { id, name, description, maxOccupancy, rackRateUSD } = parsed.data;

  try {
    await upsertRoomOverride({ room_id: id, name, description, max_occupancy: maxOccupancy, rack_rate_usd: rackRateUSD });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[rooms PUT]', err);
    return NextResponse.json({ error: 'Save failed — ensure room_overrides table exists in Supabase.' }, { status: 500 });
  }
}
