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

  const json = await res.json();
  // Beds24 V2 wraps results in { success, data: [...] }
  const rows: { roomId: number; availability: Record<string, boolean> }[] =
    Array.isArray(json) ? json : (json?.data ?? []);

  return rows.map((row) => ({
    roomId: row.roomId,
    // Room is available if every requested date is true
    available: Object.values(row.availability ?? {}).every(Boolean),
  }));
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
    arrival: checkIn,
    departure: checkOut,
    numAdult: String(adults),
    numChild: String(children),
  });

  const res = await beds24Fetch(`/inventory/rooms/offers?${params}`);
  if (!res.ok) return null;

  const json = await res.json();
  const rows = Array.isArray(json) ? json : (json?.data ?? [json]);
  const offer = rows[0];
  if (!offer) return null;

  // Beds24 prices are in property currency (USD). Convert to GHS for Paystack.
  const GHS_PER_USD = Number(process.env.GHS_PER_USD ?? '15.5');
  const priceUSD: number = offer.price ?? offer.totalPrice ?? 0;
  if (!priceUSD) return null;

  return {
    price: Math.round(priceUSD * GHS_PER_USD * 100) / 100,
    available: offer.available !== false,
    currency: 'GHS',
  };
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
  // Beds24 V2 response: [{ success: true, new: { id: 123 }, info: [...] }]
  const item = Array.isArray(json) ? json[0] : json;
  const id: number = item?.new?.id ?? item?.id;
  if (!id) throw new Error(`Beds24 create booking: no ID in response: ${JSON.stringify(json)}`);
  return { id };
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

export async function getBookings(params: {
  startArrival?: string;
  endArrival?: string;
  startDeparture?: string;
  endDeparture?: string;
  status?: string;
}): Promise<Beds24Booking[]> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) query.set(k, v); });

  const res = await beds24Fetch(`/bookings?${query}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Beds24 getBookings failed: ${res.status} ${body}`);
  }
  const json = await res.json();
  return Array.isArray(json) ? json : (json?.data ?? []);
}

export async function refreshTokenForCron(): Promise<void> {
  cachedToken = null;
  tokenExpiresAt = 0;
  await getAccessToken();
}
