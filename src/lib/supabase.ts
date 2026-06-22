import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { BookingIntent, IntentStatus } from '@/types';

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    _client = createClient(url, key);
  }
  return _client;
}

export async function createIntent(
  data: Omit<BookingIntent, 'id' | 'created_at' | 'updated_at'>
): Promise<BookingIntent> {
  const { data: row, error } = await getClient()
    .from('booking_intents')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return row;
}

export async function getIntentByRef(reference: string): Promise<BookingIntent | null> {
  const { data, error } = await getClient()
    .from('booking_intents')
    .select()
    .eq('reference', reference)
    .single();
  if (error) return null;
  return data;
}

export async function updateIntentStatus(
  reference: string,
  status: IntentStatus,
  extra?: Partial<BookingIntent>
): Promise<void> {
  const { error } = await getClient()
    .from('booking_intents')
    .update({ status, updated_at: new Date().toISOString(), ...extra })
    .eq('reference', reference);
  if (error) throw error;
}

export async function getIntentsByBeds24Ids(ids: number[]): Promise<BookingIntent[]> {
  if (ids.length === 0) return [];
  const { data, error } = await getClient()
    .from('booking_intents')
    .select()
    .in('beds24_booking_id', ids);
  if (error) throw error;
  return data ?? [];
}

export async function getIntentByBeds24Id(beds24Id: number): Promise<BookingIntent | null> {
  const { data, error } = await getClient()
    .from('booking_intents')
    .select()
    .eq('beds24_booking_id', beds24Id)
    .single();
  if (error) return null;
  return data;
}

export interface RoomOverride {
  room_id: number;
  name: string | null;
  description: string | null;
  max_occupancy: number | null;
  rack_rate_usd: number | null;
}

export async function getRoomOverrides(): Promise<RoomOverride[]> {
  const { data } = await getClient().from('room_overrides').select();
  return data ?? [];
}

export async function upsertRoomOverride(override: RoomOverride): Promise<void> {
  const { error } = await getClient()
    .from('room_overrides')
    .upsert({ ...override, updated_at: new Date().toISOString() }, { onConflict: 'room_id' });
  if (error) throw error;
}

export async function getExpiredHeldIntents(): Promise<BookingIntent[]> {
  const { data, error } = await getClient()
    .from('booking_intents')
    .select()
    .in('status', ['HELD', 'PAYMENT_PENDING'])
    .lt('expires_at', new Date().toISOString());
  if (error) throw error;
  return data ?? [];
}
