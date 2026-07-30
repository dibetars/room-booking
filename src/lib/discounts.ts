// August 2026 weekend promo: 15% off stays where check-in falls on a Fri or Sat
// and the entire stay is within August 2026.
export interface DiscountResult {
  discountPct: number;   // e.g. 15
  label: string;         // human-readable label shown in UI
  code: string;          // machine key, e.g. 'AUGUST_WEEKEND'
}

const AUGUST_WEEKEND: DiscountResult = {
  discountPct: 15,
  label: 'August Weekend — 15% off',
  code: 'AUGUST_WEEKEND',
};

function isWeekend(dateStr: string) {
  const day = new Date(dateStr).getUTCDay(); // 5=Fri, 6=Sat
  return day === 5 || day === 6;
}

function isInAugust2026(dateStr: string) {
  return dateStr >= '2026-08-01' && dateStr <= '2026-08-31';
}

export function getDiscount(
  checkIn: string,
  checkOut: string,
  opts: { augustWeekendEnabled?: boolean } = {}
): DiscountResult | null {
  const enabled = opts.augustWeekendEnabled !== false; // default on
  if (enabled && isWeekend(checkIn) && isInAugust2026(checkIn) && isInAugust2026(checkOut)) {
    return AUGUST_WEEKEND;
  }
  return null;
}

export function applyDiscount(baseUSD: number, discount: DiscountResult | null): number {
  if (!discount) return baseUSD;
  return Math.round(baseUSD * (1 - discount.discountPct / 100) * 100) / 100;
}
