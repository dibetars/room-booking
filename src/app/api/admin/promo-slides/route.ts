import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSetting, setSetting } from '@/lib/supabase';

export interface PromoSlide {
  id: string;
  enabled: boolean;
  accentColor: string;
  badge: string;
  title: string;
  body: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string;
  openBooking?: boolean;
}

export const DEFAULT_SLIDES: PromoSlide[] = [
  {
    id: 'restaurant',
    enabled: true,
    accentColor: '#2d5a27',
    badge: 'Now Open',
    title: 'Fresh food, straight from the farm',
    body: 'Our on-site restaurant serves farm-to-table meals prepared fresh daily. Guests and visitors are welcome to dine in or order for delivery to your room.',
    bullets: ['🌿 Locally sourced ingredients', '🍽 Breakfast, lunch & dinner', '📦 In-room ordering available'],
    ctaLabel: 'View Menu',
    ctaHref: '#restaurant',
    imageUrl: '/images/hero-restaurant.png',
    openBooking: false,
  },
  {
    id: 'august-discount',
    enabled: true,
    accentColor: '#BE6A45',
    badge: 'Limited Time Offer',
    title: '15% off your August weekend stay',
    body: 'Book any Friday or Saturday check-in during August 2026 and enjoy 15% off the rack rate — automatically applied at checkout.',
    bullets: ['✓ Applies to all rooms', '✓ No promo code needed — discount auto-applies', '✓ Valid for stays fully within August 2026'],
    ctaLabel: 'Book Now',
    ctaHref: '#book',
    imageUrl: '',
    openBooking: true,
  },
];

export async function GET() {
  try {
    const slides = await getSetting<PromoSlide[]>('promo_slides', DEFAULT_SLIDES);
    return NextResponse.json({ slides });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load slides';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const slideSchema = z.object({
  id: z.string().min(1),
  enabled: z.boolean(),
  accentColor: z.string(),
  badge: z.string(),
  title: z.string().min(1),
  body: z.string(),
  bullets: z.array(z.string()),
  ctaLabel: z.string(),
  ctaHref: z.string(),
  imageUrl: z.string(),
  openBooking: z.boolean().optional(),
});

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const parsed = z.array(slideSchema).safeParse(body.slides);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid slides', details: parsed.error.flatten() }, { status: 400 });

  try {
    await setSetting('promo_slides', parsed.data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save slides';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
