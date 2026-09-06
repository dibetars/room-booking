import { NextRequest, NextResponse } from 'next/server';
import {
  EMAIL_TYPES,
  SAMPLE_EMAIL_PAYLOAD,
  renderEmail,
  type EmailType,
} from '@/lib/email';

const TYPE_IDS = new Set(EMAIL_TYPES.map((t) => t.id));

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type');

  if (!type) {
    return NextResponse.json({ types: EMAIL_TYPES });
  }

  if (!TYPE_IDS.has(type as EmailType)) {
    return NextResponse.json({ error: 'Unknown email type' }, { status: 400 });
  }

  const meta = EMAIL_TYPES.find((t) => t.id === type)!;
  const rendered = renderEmail(type as EmailType, SAMPLE_EMAIL_PAYLOAD);
  return NextResponse.json({
    ...meta,
    ...rendered,
    sample: SAMPLE_EMAIL_PAYLOAD,
  });
}
