const encoder = new TextEncoder();

const OTP_TTL_MS = 10 * 60 * 1000;
const CHALLENGE_COOKIE = 'admin_otp_challenge';

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

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(input));
  return toHex(digest);
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return toHex(sig);
}

/** 6-digit numeric code (000000–999999). */
export function generateEmailOtp(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(n).padStart(6, '0');
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  const visible = local.length <= 2 ? local[0] : local.slice(0, 2);
  return `${visible}***@${domain}`;
}

export async function createOtpChallenge(code: string, secret: string): Promise<{
  cookieValue: string;
  maxAge: number;
}> {
  const expiresAt = Date.now() + OTP_TTL_MS;
  const codeHash = await sha256Hex(`${code}:${expiresAt}:${secret}`);
  const payload = `${expiresAt}.${codeHash}`;
  const sig = await sign(payload, secret);
  return {
    cookieValue: `${payload}.${sig}`,
    maxAge: Math.ceil(OTP_TTL_MS / 1000),
  };
}

export async function verifyOtpChallenge(
  cookieValue: string | undefined,
  code: string,
  secret: string
): Promise<boolean> {
  if (!cookieValue) return false;
  const [expiresAtStr, codeHash, sig] = cookieValue.split('.');
  if (!expiresAtStr || !codeHash || !sig) return false;

  const expiresAt = Number(expiresAtStr);
  if (!expiresAt || Date.now() > expiresAt) return false;

  const payload = `${expiresAtStr}.${codeHash}`;
  const expectedSig = await sign(payload, secret);
  if (!timingSafeEqualHex(expectedSig, sig)) return false;

  const cleaned = String(code).replace(/\s/g, '');
  if (!/^\d{6}$/.test(cleaned)) return false;

  const expectedHash = await sha256Hex(`${cleaned}:${expiresAtStr}:${secret}`);
  return timingSafeEqualHex(expectedHash, codeHash);
}

export { CHALLENGE_COOKIE, OTP_TTL_MS };
