import { createClient } from '@supabase/supabase-js';
import type { BookingIntent, IntentStatus } from '@/types';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function createIntent(
  data: Omit<BookingIntent, 'id' | 'created_at' | 'updated_at'>
): Promise<BookingIntent> {
  const { data: row, error } = await supabase
    .from('booking_intents')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return row;
}

export async function getIntentByRef(reference: string): Promise<BookingIntent | null> {
  const { data, error } = await supabase
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
  const { error } = await supabase
    .from('booking_intents')
    .update({ status, updated_at: new Date().toISOString(), ...extra })
    .eq('reference', reference);
  if (error) throw error;
}

export async function getExpiredHeldIntents(): Promise<BookingIntent[]> {
  const { data, error } = await supabase
    .from('booking_intents')
    .select()
    .in('status', ['HELD', 'PAYMENT_PENDING'])
    .lt('expires_at', new Date().toISOString());
  if (error) throw error;
  return data ?? [];
}
