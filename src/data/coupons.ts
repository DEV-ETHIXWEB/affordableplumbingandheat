/** Offers carried over from the site's existing coupons page. Show your
 * coupon to the technician at time of service to redeem — restrictions may
 * apply per offer. */
export const coupons = [
  {
    title: '$400 Off Any AC',
    description: 'Save $400 on any air conditioning repair or replacement.',
    code: 'AC400'
  },
  {
    title: '$1,000 Off AC/Furnace Install',
    description: 'Save $1,000 when you install a new AC and furnace system together.',
    code: 'HVAC1000'
  },
  {
    title: '$249 Off Water Heater',
    description: 'Save $249 on a new water heater installation.',
    code: 'WH249'
  },
  {
    title: '5% Off for Seniors & Military',
    description: 'Seniors and active-duty or veteran military save 5% on service. Restrictions apply.',
    code: 'SALUTE5'
  }
] as const;
