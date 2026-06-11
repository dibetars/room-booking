import type { Beds24Booking, RoomAvailability } from '@/types';

const BASE_URL = 'https://beds24.com/api/v2';

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const res = await fetch(`${BASE_URL}/authentication/token`, {
    headers: { refreshToken: process.env.BEDS24_REFRESH_TOKEN! },
  });

  if (!res.ok) {
    throw new Error(`Beds24 token refresh failed: ${res.status}`);
  }

  const json = await res.json();
  cachedToken = json.token;
  // Cache for 23 hours
  tokenExpiresAt = Date.now() + 23 * 60 * 60 * 1000;
  return cachedToken!;
}

async function beds24Fetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      token,
      ...options.headers,
    },
  });

  if (res.status === 401) {
    // Force token refresh on next call
    cachedToken = null;
    tokenExpiresAt = 0;
    throw new Error('Beds24 auth expired');
  }

  if (res.status === 429) {
    throw new Error('BEDS24_RATE_LIMITED');
  }

  return res;
}

export async function getAvailabilityCalendar(
  roomIds: number[],
  checkIn: string,
  checkOut: string
): Promise<RoomAvailability[]> {
  const params = new URLSearchParams({
    roomIds: roomIds.join(','),
    startDate: checkIn,
    endDate: checkOut,
  });

  const res = await beds24Fetch(`/inventory/rooms/calendar?${params}`);
  if (!res.ok) throw new Error(`Beds24 calendar error: ${res.status}`);
  const json = await res.json();
  return json;
}

export async function checkAvailability(
  roomIds: number[],
  checkIn: string,
  checkOut: string
): Promise<{ roomId: number; available: boolean }[]> {
  const params = new URLSearchParams({
    roomIds: roomIds.join(','),
    startDate: checkIn,
    endDate: checkOut,
  });

  const res = await beds24Fetch(`/inventory/rooms/availability?${params}`);
  if (!res.ok) throw new Error(`Beds24 availability error: ${res.status}`);
  return res.json();
}

export async function getRoomOffers(
  roomId: number,
  checkIn: string,
  checkOut: string,
  adults: number,
  children: number
): Promise<{ price: number; available: boolean; currency: string } | null> {
  const params = new URLSearchParams({
    roomId: String(roomId),
    startDate: checkIn,
    endDate: checkOut,
    numAdult: String(adults),
    numChild: String(children),
  });

  const res = await beds24Fetch(`/inventory/rooms/offers?${params}`);
  if (!res.ok) return null;

  const json = await res.json();
  const offer = Array.isArray(json) ? json[0] : json;
  if (!offer?.price || !offer?.available) return null;
  return { price: offer.price, available: offer.available, currency: offer.currency ?? 'GHS' };
}

export async function createBooking(booking: Beds24Booking): Promise<{ id: number }> {
  const res = await beds24Fetch('/bookings', {
    method: 'POST',
    body: JSON.stringify([booking]),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Beds24 create booking failed: ${res.status} ${body}`);
  }

  const json = await res.json();
  const created = Array.isArray(json) ? json[0] : json;
  return { id: created.id };
}

export async function updateBookingStatus(
  bookingId: number,
  status: 'confirmed' | 'cancelled'
): Promise<void> {
  const res = await beds24Fetch('/bookings', {
    method: 'POST',
    body: JSON.stringify([{ id: bookingId, status }]),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Beds24 update booking failed: ${res.status} ${body}`);
  }
}

export async function refreshTokenForCron(): Promise<void> {
  cachedToken = null;
  tokenExpiresAt = 0;
  await getAccessToken();
}
