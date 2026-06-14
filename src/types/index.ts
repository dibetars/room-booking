export type IntentStatus =
  | 'DRAFT'
  | 'HELD'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'CONFIRMED'
  | 'EXPIRED'
  | 'PAYMENT_FAILED'
  | 'RECONCILE_NEEDED'
  | 'CANCELLED';

export interface BookingIntent {
  id: string;
  reference: string;
  status: IntentStatus;
  beds24_booking_id: number | null;
  room_id: number;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  amount_pesewas: number;
  currency: string;
  paystack_status: string | null;
  expires_at: string | null;
  beds24_raw: unknown;
  paystack_raw: unknown;
  created_at: string;
  updated_at: string;
}

export interface RoomAvailability {
  roomId: number;
  name: string;
  available: boolean;
  totalPriceGHS: number;
  perNight: number;
  maxOccupancy: number;
  description?: string;
  photos?: string[];
}

export interface GuestDetails {
  name: string;
  email: string;
  phone?: string;
}

export interface BookingRequest {
  roomId: number;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  guest: GuestDetails;
}

export interface BookingResponse {
  reference: string;
  authorizationUrl: string;
  expiresAt: string;
}

export interface Beds24Offer {
  roomId: number;
  price: number;
  available: boolean;
  currency: string;
}

export interface Beds24Booking {
  id?: number;
  propId?: number;
  roomId: number;
  arrival: string;
  departure: string;
  numAdult: number;
  numChild: number;
  guestFirstName: string;
  guestLastName: string;
  email: string;
  phone?: string;
  status: 'confirmed' | 'request' | 'new' | 'cancelled';
  price?: number;
  commission?: number;
  referer?: string;
  info?: string;
}
