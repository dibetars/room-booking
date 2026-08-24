import { NextResponse } from 'next/server';
import { getSetting } from '@/lib/supabase';
import { DEFAULT_SLIDES, type PromoSlide } from '@/app/api/admin/promo-slides/route';

export async function GET() {
  try {
    const slides = await getSetting<PromoSlide[]>('promo_slides', DEFAULT_SLIDES);
    const enabled = slides.filter(s => s.enabled);
    return NextResponse.json({ slides: enabled });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
