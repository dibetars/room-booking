const encoder = new TextEncoder();

async function getKey(secret: string) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Session token is a signed, expiring value derived from ADMIN_SECRET —
// the secret itself never leaves the server, so a leaked cookie can't be
// replayed once it expires and doesn't expose ADMIN_SECRET.
export async function createSessionToken(secret: string, ttlMs = 7 * 24 * 60 * 60 * 1000): Promise<string> {
  const expiresAt = Date.now() + ttlMs;
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(String(expiresAt)));
  return `${expiresAt}.${toHex(sig)}`;
}

export async function verifySessionToken(token: string, secret: string): Promise<boolean> {
  const [expiresAtStr, sig] = token.split('.');
  if (!expiresAtStr || !sig) return false;
  const expiresAt = Number(expiresAtStr);
  if (!expiresAt || Date.now() > expiresAt) return false;

  const key = await getKey(secret);
  const expectedSig = await crypto.subtle.sign('HMAC', key, encoder.encode(expiresAtStr));
  return timingSafeEqualHex(toHex(expectedSig), sig);
}
