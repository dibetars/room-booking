import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { deleteSetting, getSetting, setSetting } from '@/lib/supabase';
import {
  DEFAULT_TEMPLATES,
  EMAIL_TYPES,
  SAMPLE_EMAIL_PAYLOAD,
  renderEmail,
  templateSettingKey,
  type EmailTemplateCopy,
  type EmailType,
} from '@/lib/email';

const TYPE_IDS = new Set(EMAIL_TYPES.map((t) => t.id));

const copySchema = z.object({
  subject: z.string().min(1).max(200),
  heading: z.string().min(1).max(120),
  preheader: z.string().max(200).optional().default(''),
  body: z.string().min(1).max(8000),
});

async function loadCopy(type: EmailType): Promise<{ copy: EmailTemplateCopy; customized: boolean }> {
  const stored = await getSetting<EmailTemplateCopy | null>(templateSettingKey(type), null);
  const customized = Boolean(stored && (stored.subject || stored.body));
  return {
    copy: stored ? { ...DEFAULT_TEMPLATES[type], ...stored } : DEFAULT_TEMPLATES[type],
    customized,
  };
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type');

  if (!type) {
    return NextResponse.json({ types: EMAIL_TYPES });
  }

  if (!TYPE_IDS.has(type as EmailType)) {
    return NextResponse.json({ error: 'Unknown email type' }, { status: 400 });
  }

  const id = type as EmailType;
  const meta = EMAIL_TYPES.find((t) => t.id === id)!;
  const { copy, customized } = await loadCopy(id);
  const rendered = renderEmail(id, SAMPLE_EMAIL_PAYLOAD, copy);
  return NextResponse.json({
    ...meta,
    ...rendered,
    copy,
    defaults: DEFAULT_TEMPLATES[id],
    customized,
    sample: SAMPLE_EMAIL_PAYLOAD,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  const type = body.type as string;
  if (!TYPE_IDS.has(type as EmailType)) {
    return NextResponse.json({ error: 'Unknown email type' }, { status: 400 });
  }
  const parsed = copySchema.safeParse(body.copy ?? body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid template', details: parsed.error.flatten() }, { status: 400 });
  }
  const rendered = renderEmail(type as EmailType, SAMPLE_EMAIL_PAYLOAD, parsed.data);
  return NextResponse.json({ ...rendered, copy: parsed.data });
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const type = body.type as string;
  if (!TYPE_IDS.has(type as EmailType)) {
    return NextResponse.json({ error: 'Unknown email type' }, { status: 400 });
  }

  const parsed = copySchema.safeParse(body.copy ?? body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid template', details: parsed.error.flatten() }, { status: 400 });
  }

  const id = type as EmailType;
  await setSetting(templateSettingKey(id), parsed.data);
  const rendered = renderEmail(id, SAMPLE_EMAIL_PAYLOAD, parsed.data);
  return NextResponse.json({ ok: true, ...rendered, copy: parsed.data, customized: true });
}

export async function DELETE(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type');
  if (!type || !TYPE_IDS.has(type as EmailType)) {
    return NextResponse.json({ error: 'Unknown email type' }, { status: 400 });
  }
  await deleteSetting(templateSettingKey(type as EmailType));
  const id = type as EmailType;
  const rendered = renderEmail(id, SAMPLE_EMAIL_PAYLOAD);
  return NextResponse.json({ ok: true, ...rendered, copy: DEFAULT_TEMPLATES[id], customized: false });
}
