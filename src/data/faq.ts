import { surroundingServiceAreas } from './business';

/** Joins names with a natural "a, b, and c" list — kept local so this file
 * has no dependency on the chatbot's copy of the same helper. */
function joinWithAnd(items: string[]): string {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return items.join(' and ');
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

// Community names are pulled from the canonical serviceAreas dataset
// (src/data/business.ts) so this answer never drifts from the Service
// Area page, footer, or homepage strip.
const surroundingNames = surroundingServiceAreas.map((a) => a.name);

export const generalFaq = [
  {
    question: 'Are you available for emergencies?',
    answer:
      "Yes. We're available 24 hours a day, 7 days a week for plumbing, heating, cooling, and electrical emergencies. A real person answers, day or night."
  },
  {
    question: 'Are your technicians licensed and insured?',
    answer:
      'Yes. Affordable Plumbing, Heat & Electrical is fully licensed and insured, including separate electrical, plumbing, and mechanical licenses, and every technician we send to your home is trained and experienced.'
  },
  {
    question: 'What areas do you serve?',
    answer: `We're based in Colorado Springs and serve the surrounding area, including ${joinWithAnd(surroundingNames)}. See our full service area for details.`
  },
  {
    question: 'Do you offer financing?',
    answer:
      'Yes. We partner with BuyFin (powered by Momnt) to offer financing up to $55,000 with a simple digital application and a soft credit check that won’t affect your credit score.'
  },
  {
    question: 'Do you have any current coupons or specials?',
    answer:
      'Yes. Check our coupons page for current offers, and show your coupon to the technician at the time of service to redeem it.'
  },
  {
    question: 'Is the estimate free?',
    answer: "Yes, estimates are free with no obligation. We'll explain the cost clearly before any work begins."
  }
] as const;
