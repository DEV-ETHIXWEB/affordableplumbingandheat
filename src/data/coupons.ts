/** Offers transcribed from the coupon artwork on the existing site's coupons
 * page (https://www.affordableplumbingandheat.com/coupons). The printed
 * coupons carry no redemption codes, so none are invented here: visitors
 * present the coupon at time of service.
 *
 * `expires` is the last valid day (inclusive, Mountain Time). Expired offers
 * are filtered out at build time AND in the browser (see isCouponActive), so a
 * static page that outlives an offer never keeps advertising it. When the
 * client issues new coupons, update this list and redeploy. */
export type Coupon = {
  id: string;
  title: string;
  description: string;
  terms: string;
  /** ISO date, last day the offer is valid; omit for ongoing offers. */
  expires?: string;
};

const STANDARD_TERMS = 'Offer not valid with any other offers or discounts. Must present coupon at time of service.';

export const coupons: Coupon[] = [
  {
    id: 'ac-furnace-combo-1000',
    title: '$1,000 Off AC / Furnace Combo Install',
    description: 'With the purchase and installation of any new AC and furnace.',
    terms: STANDARD_TERMS,
    expires: '2026-09-30'
  },
  {
    id: 'furnace-400',
    title: '$400 Off Any Furnace',
    description: 'With the purchase and installation of any new furnace.',
    terms: STANDARD_TERMS,
    expires: '2026-09-30'
  },
  {
    id: 'water-heater-249',
    title: '$249 Off Water Heater',
    description: 'With the purchase and installation of any new water heater.',
    terms: STANDARD_TERMS,
    expires: '2026-09-30'
  },
  {
    id: 'furnace-tune-up-79',
    title: '$79 Furnace Tune-Up',
    description: 'A complete furnace tune-up for $79.',
    terms: STANDARD_TERMS,
    expires: '2026-09-30'
  },
  {
    id: 'drain-cleaning-99',
    title: '$99 Any Drain Cleaning',
    description: 'Any drain cleaning, including mainlines, with a complimentary camera inspection.',
    terms: STANDARD_TERMS,
    expires: '2026-09-30'
  },
  {
    id: 'free-second-opinion',
    title: 'Free Second Opinion',
    description: 'No charge for a site visit and a competitive estimate.',
    terms: STANDARD_TERMS,
    expires: '2026-09-30'
  },
  {
    id: 'senior-military-5',
    title: '5% Off for Seniors & Military',
    description: 'Seniors and military save 5% on service.',
    terms: 'Must present coupon at time of service. May not be combined with any other offers. Some restrictions apply.'
  }
];

/** True while the offer is still valid. Compares calendar dates in Mountain
 * Time so an offer stays live through the whole of its final day locally. */
export function isCouponActive(coupon: Coupon, now: Date = new Date()): boolean {
  if (!coupon.expires) return true;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Denver' }).format(now);
  return today <= coupon.expires;
}

export function getActiveCoupons(now: Date = new Date()): Coupon[] {
  return coupons.filter((c) => isCouponActive(c, now));
}

export function formatCouponExpiry(coupon: Coupon): string | null {
  if (!coupon.expires) return null;
  const [y, m, d] = coupon.expires.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  });
}
