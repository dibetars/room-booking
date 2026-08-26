import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken } from '@/lib/admin-session';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { verifyTotp } from '@/lib/totp';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!rateLimit(`admin-login:${ip}`, 6, 15 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many attempts. Try again in a few minutes.' }, { status: 429 });
  }

  const { password, otp } = await req.json().catch(() => ({}));
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminSecret = process.env.ADMIN_SECRET;
  const totpSecret = process.env.ADMIN_TOTP_SECRET;

  if (!adminPassword || !adminSecret || password !== adminPassword) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  // If TOTP is configured, require OTP
  if (totpSecret) {
    if (!otp) {
      // Password correct but no OTP supplied — tell client to ask for it
      return NextResponse.json({ step: 'otp' }, { status: 200 });
    }
    const valid = await verifyTotp(totpSecret, String(otp));
    if (!valid) {
      return NextResponse.json({ error: 'Invalid authenticator code' }, { status: 401 });
    }
  }

  const isHttps =
    req.headers.get('x-forwarded-proto') === 'https' ||
    req.nextUrl.protocol === 'https:';

  const res = NextResponse.json({ ok: true });
  const token = await createSessionToken(adminSecret);
  res.cookies.set('admin_token', token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete('admin_token');
  return res;
}
