/** Financing facts shown on /financing/ and used by the chat assistant, kept in
 * one place so the two never disagree. */
export const financing = {
  partner: 'BuyFin, powered by Momnt',
  maxAmount: '$55,000',
  points: [
    'Finance projects up to $55,000',
    'Simple and fast application with instant decisions',
    'Completely digital process',
    'View loan offers with a soft credit pull that doesn’t affect your credit score',
    'Multiple loan offers for qualified borrowers to choose from',
    'Convenient monthly payments',
    'No early payment penalties on any loans'
  ],
  disclaimer:
    'BuyFin, powered by Momnt Technologies, Inc., arranges consumer loans used to purchase goods and services from its participating merchant businesses. All loans are originated by participating financial institutions. Equal Housing Lender.'
} as const;
