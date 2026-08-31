import { ROOMS, type RoomConfig } from '@/lib/rooms';
import { getRoomOverrides } from '@/lib/supabase';

/** Static room list merged with optional Supabase `room_overrides`. Server-only. */
export async function getEffectiveRooms(): Promise<RoomConfig[]> {
  let overrides: Awaited<ReturnType<typeof getRoomOverrides>> = [];
  try {
    overrides = await getRoomOverrides();
  } catch {
    // table not yet created — return static config
  }

  const overrideMap = new Map(overrides.map((o) => [o.room_id, o]));

  return ROOMS.map((r) => {
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
}

export async function getEffectiveRoom(roomId: number): Promise<RoomConfig | undefined> {
  const rooms = await getEffectiveRooms();
  return rooms.find((r) => r.id === roomId);
}
