import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken } from '@/lib/admin-session';
import { sendAdminOtpEmail } from '@/lib/email';
import {
  CHALLENGE_COOKIE,
  createOtpChallenge,
  generateEmailOtp,
  maskEmail,
  verifyOtpChallenge,
} from '@/lib/email-otp';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

function isHttps(req: NextRequest): boolean {
  return (
    req.headers.get('x-forwarded-proto') === 'https' ||
    req.nextUrl.protocol === 'https:'
  );
}

function cookieOpts(req: NextRequest, maxAge: number) {
  return {
    httpOnly: true,
    secure: isHttps(req),
    sameSite: 'lax' as const,
    maxAge,
    path: '/',
  };
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!rateLimit(`admin-login:${ip}`, 6, 15 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many attempts. Try again in a few minutes.' }, { status: 429 });
  }

  const { password, otp } = await req.json().catch(() => ({}));
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminSecret = process.env.ADMIN_SECRET;
  const adminEmail = process.env.ADMIN_EMAIL?.trim();

  if (!adminPassword || !adminSecret || password !== adminPassword) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  // Email OTP when ADMIN_EMAIL is set
  if (adminEmail) {
    if (!otp) {
      if (!rateLimit(`admin-otp-send:${ip}`, 5, 15 * 60 * 1000)) {
        return NextResponse.json({ error: 'Too many codes requested. Try again in a few minutes.' }, { status: 429 });
      }

      const code = generateEmailOtp();
      const sent = await sendAdminOtpEmail(adminEmail, code);
      if (!sent) {
        return NextResponse.json(
          { error: 'Could not send login code. Check email configuration.' },
          { status: 503 }
        );
      }

      const challenge = await createOtpChallenge(code, adminSecret);
      const res = NextResponse.json({
        step: 'otp',
        emailHint: maskEmail(adminEmail),
      });
      res.cookies.set(CHALLENGE_COOKIE, challenge.cookieValue, cookieOpts(req, challenge.maxAge));
      return res;
    }

    const challengeCookie = req.cookies.get(CHALLENGE_COOKIE)?.value;
    const valid = await verifyOtpChallenge(challengeCookie, String(otp), adminSecret);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 });
    }
  }

  const res = NextResponse.json({ ok: true });
  const token = await createSessionToken(adminSecret);
  res.cookies.set('admin_token', token, {
    ...cookieOpts(req, 60 * 60 * 24 * 7),
  });
  // Clear one-time challenge after successful login
  res.cookies.set(CHALLENGE_COOKIE, '', { ...cookieOpts(req, 0) });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete('admin_token');
  res.cookies.delete(CHALLENGE_COOKIE);
  return res;
}
