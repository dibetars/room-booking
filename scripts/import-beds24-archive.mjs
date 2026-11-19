#!/usr/bin/env node
/**
 * Import Beds24 archive JSON into Supabase via PostgREST.
 *
 * Usage:
 *   node --env-file=.env.local scripts/import-beds24-archive.mjs [archiveDir]
 */
import fs from 'fs';
import path from 'path';

const archiveDir =
  process.argv[2] ||
  '/Users/dibelaba/Downloads/Beds24-full-archive-2026-11-19T11-14-39-689Z';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  process.exit(1);
}

const GHS_PER_USD = 11.5;
const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
  Prefer: 'resolution=merge-duplicates,return=minimal',
};

async function rest(method, tablePath, body, extraHeaders = {}) {
  const res = await fetch(`${url}/rest/v1/${tablePath}`, {
    method,
    headers: { ...headers, ...extraHeaders },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${tablePath} ${res.status}: ${text}`);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function mapStatus(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'cancelled') return 'CANCELLED';
  if (s === 'inquiry' || s === 'request') return 'DRAFT';
  return 'CONFIRMED';
}

function guestEmail(b) {
  const email = String(b.email || '').trim();
  if (email && email.includes('@')) return email;
  return `archive+b24-${b.id}@bokoboko.org`;
}

async function main() {
  const bookingsPath = path.join(archiveDir, 'bookings.json');
  const messagesPath = path.join(archiveDir, 'messages.json');
  const manifestPath = path.join(archiveDir, 'MANIFEST.json');

  if (!fs.existsSync(bookingsPath)) {
    console.error('Missing', bookingsPath);
    process.exit(1);
  }

  const bookingsFile = JSON.parse(fs.readFileSync(bookingsPath, 'utf8'));
  const bookings = bookingsFile.data || bookingsFile;
  const messagesFile = fs.existsSync(messagesPath)
    ? JSON.parse(fs.readFileSync(messagesPath, 'utf8'))
    : { data: [] };
  const messages = messagesFile.data || [];
  const manifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    : {};

  console.log('Archive bookings:', bookings.length, 'messages:', messages.length);

  const existing = await rest(
    'GET',
    'booking_intents?select=beds24_booking_id&beds24_booking_id=not.is.null',
    null,
    { Prefer: 'return=representation' }
  );
  const existingIds = new Set((existing || []).map((r) => Number(r.beds24_booking_id)));
  console.log('Existing beds24-linked intents:', existingIds.size);

  const toInsert = [];
  let skippedExisting = 0;
  let skippedBad = 0;

  for (const b of bookings) {
    const id = Number(b.id);
    if (!id || !b.roomId || !b.arrival || !b.departure) {
      skippedBad++;
      continue;
    }
    if (existingIds.has(id)) {
      skippedExisting++;
      continue;
    }

    const priceUsd = Number(b.price) || 0;
    const amountPesewas = Math.max(0, Math.round(priceUsd * GHS_PER_USD * 100));
    const name = `${b.firstName || ''} ${b.lastName || ''}`.trim() || `Guest ${id}`;

    toInsert.push({
      reference: `B24-${id}`,
      status: mapStatus(b.status),
      beds24_booking_id: id,
      room_id: Number(b.roomId),
      check_in: b.arrival,
      check_out: b.departure,
      adults: Number(b.numAdult) || 1,
      children: Number(b.numChild) || 0,
      guest_name: name,
      guest_email: guestEmail(b),
      guest_phone: b.phone || b.mobile || null,
      amount_pesewas: amountPesewas,
      currency: 'GHS',
      paystack_status: 'beds24_archive',
      expires_at: null,
      beds24_raw: b,
      paystack_raw: {
        source: 'beds24_archive',
        archivedAt: manifest.archivedAt || new Date().toISOString(),
      },
      created_at: b.bookingTime || new Date().toISOString(),
      updated_at: b.modifiedTime || b.bookingTime || new Date().toISOString(),
    });
  }

  console.log(
    'To insert:',
    toInsert.length,
    '| skipped existing:',
    skippedExisting,
    '| bad:',
    skippedBad
  );

  let inserted = 0;
  const chunk = 40;
  for (let i = 0; i < toInsert.length; i += chunk) {
    const batch = toInsert.slice(i, i + chunk);
    await rest('POST', 'booking_intents?on_conflict=reference', batch);
    inserted += batch.length;
    console.log('Intents upserted', inserted, '/', toInsert.length);
  }

  // Messages live in app_settings (no DDL required on the live project).
  await rest('POST', 'app_settings?on_conflict=key', [
    {
      key: 'beds24_archive_messages',
      value: messages,
      updated_at: new Date().toISOString(),
    },
    { key: 'channel_mode', value: 'direct', updated_at: new Date().toISOString() },
    {
      key: 'beds24_archive_meta',
      value: {
        importedAt: new Date().toISOString(),
        archiveDir,
        manifest,
        intentsInserted: inserted,
        intentsSkippedExisting: skippedExisting,
        messagesInserted: messages.length,
      },
      updated_at: new Date().toISOString(),
    },
  ]);
  console.log('channel_mode = direct; messages stored:', messages.length);

  console.log('Done.', { inserted, skippedExisting, messages: messages.length });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
