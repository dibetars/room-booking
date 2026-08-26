import { NextResponse } from 'next/server';
import { generateTotpSecret, totpUri, verifyTotp } from '@/lib/totp';

export async function GET() {
  const secret = generateTotpSecret();
  const uri = totpUri(secret);
  return NextResponse.json({ secret, uri });
}

export async function POST(req: Request) {
  const { secret, token } = await req.json().catch(() => ({}));
  if (!secret || !token) {
    return NextResponse.json({ error: 'Missing secret or token' }, { status: 400 });
  }
  const valid = await verifyTotp(secret, String(token));
  return NextResponse.json({ valid });
}
