import { checkAvailability } from '@/lib/beds24';
import { getEffectiveRoom, getEffectiveRooms } from '@/lib/rooms-server';
import type { RoomConfig } from '@/lib/rooms';

export type OccupancyBlockCode = 'OCCUPANCY_FULL' | 'DATES_UNAVAILABLE' | 'ROOM_NOT_FOUND';

export class BookingBlockedError extends Error {
  constructor(
    public readonly code: OccupancyBlockCode,
    message: string
  ) {
    super(message);
    this.name = 'BookingBlockedError';
  }
}

export function occupancyErrorMessage(code: OccupancyBlockCode, maxOccupancy?: number): string {
  if (code === 'OCCUPANCY_FULL') {
    return maxOccupancy
      ? `This room is full — maximum occupancy is ${maxOccupancy} guests.`
      : 'This room cannot accommodate that many guests.';
  }
  if (code === 'ROOM_NOT_FOUND') return 'Room not found';
  return 'These dates are no longer available for this room.';
}

/**
 * Beds24 inventory is the source of truth for whether a room still has
 * remaining units on the date range. Guest-count vs room.maxOccupancy is
 * enforced here so a family of 4 cannot book a 2-person room even when
 * that room's calendar is open.
 */
export async function assertRoomBookable(opts: {
  roomId: number;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
}): Promise<RoomConfig> {
  const room = await getEffectiveRoom(opts.roomId);
  if (!room) {
    throw new BookingBlockedError('ROOM_NOT_FOUND', occupancyErrorMessage('ROOM_NOT_FOUND'));
  }

  const guests = opts.adults + opts.children;
  if (guests > room.maxOccupancy) {
    throw new BookingBlockedError(
      'OCCUPANCY_FULL',
      occupancyErrorMessage('OCCUPANCY_FULL', room.maxOccupancy)
    );
  }

  const rows = await checkAvailability([opts.roomId], opts.checkIn, opts.checkOut);
  const row = rows.find((a) => a.roomId === opts.roomId);
  if (!row?.available) {
    throw new BookingBlockedError(
      'DATES_UNAVAILABLE',
      occupancyErrorMessage('DATES_UNAVAILABLE')
    );
  }

  return room;
}

export type UnavailableReason = 'occupancy_full' | 'dates_unavailable';

export async function roomsWithAvailability(
  checkIn: string,
  checkOut: string,
  guests: number
): Promise<{
  rooms: Array<RoomConfig & { available: boolean; unavailableReason?: UnavailableReason }>;
}> {
  const rooms = await getEffectiveRooms();
  const availability = await checkAvailability(rooms.map((r) => r.id), checkIn, checkOut);

  return {
    rooms: rooms.map((room) => {
      if (guests > room.maxOccupancy) {
        return { ...room, available: false, unavailableReason: 'occupancy_full' as const };
      }
      const avail = availability.find((a) => a.roomId === room.id);
      if (!avail?.available) {
        return { ...room, available: false, unavailableReason: 'dates_unavailable' as const };
      }
      return { ...room, available: true };
    }),
  };
}
