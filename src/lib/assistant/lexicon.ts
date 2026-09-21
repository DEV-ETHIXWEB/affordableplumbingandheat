/**
 * Domain vocabulary: how customers describe problems, mapped to the site's
 * services. Phrases are matched against normalized text (lowercase,
 * contractions expanded, e.g. "won't" -> "will not").
 */

/** A service "family" plus how the customer's wording picks repair vs.
 * replacement vs. tune-up within it. */
export type ServiceFamily = {
  id: string;
  phrases: string[];
  repair?: string;
  replace?: string;
  tuneUp?: string;
  /** Used when the family has one service only. */
  only?: string;
  /** Human label when no specific service page applies. */
  label?: string;
};

export const SERVICE_FAMILIES: ServiceFamily[] = [
  {
    id: 'tankless',
    phrases: [
      'tankless',
      'tankless water heater',
      'on demand water heater',
      'on demand hot water',
      'instant hot water'
    ],
    only: 'tankless-water-heater-installation-colorado-springs'
  },
  {
    id: 'water-heater',
    phrases: [
      'water heater',
      'hot water heater',
      'hot water tank',
      'water tank',
      'no hot water',
      'not getting hot water',
      'no warm water',
      'hot water ran out',
      'hot water runs out',
      'hot water is not',
      'lukewarm water',
      'cold showers',
      'cold shower',
      'pilot light',
      'water heater leaking',
      'rumbling tank',
      'rusty hot water',
      'water heating'
    ],
    repair: 'water-heater-repair-colorado-springs',
    replace: 'water-heater-replacement-colorado-springs'
  },
  {
    id: 'toilet',
    phrases: [
      'toilet',
      'toliet',
      'commode',
      'running toilet',
      'toilet keeps running',
      'will not flush',
      'weak flush',
      'toilet overflowing',
      'toilet clogged',
      'clogged toilet',
      'wax ring',
      'toilet wobbles',
      'toilet leaking',
      'phantom flush',
      'flapper'
    ],
    repair: 'toilet-repair-colorado-springs',
    replace: 'toilet-replacement-colorado-springs'
  },
  {
    id: 'hydro-jetting',
    phrases: ['hydro jet', 'hydro jetting', 'hydrojetting', 'jetting', 'jet the line', 'high pressure water jetting'],
    only: 'hydro-jetting-colorado-springs'
  },
  {
    id: 'drain',
    phrases: [
      'drain',
      'drains',
      'clog',
      'clogged',
      'clogged drain',
      'clogged sink',
      'sink clogged',
      'sink not draining',
      'sink will not drain',
      'tub not draining',
      'shower not draining',
      'slow drain',
      'draining slowly',
      'backed up sink',
      'gurgling',
      'standing water in sink',
      'snake the drain',
      'rooter',
      'kitchen sink backed up',
      'floor drain'
    ],
    only: 'drain-cleaning-colorado-springs'
  },
  {
    id: 'disposal',
    phrases: ['garbage disposal', 'disposal', 'insinkerator', 'disposal jammed', 'disposal humming', 'garburator'],
    only: 'garbage-disposal-replacement-colorado-springs'
  },
  {
    id: 'sump-pump',
    phrases: ['sump pump', 'sump', 'sump pit', 'basement pump', 'battery backup pump'],
    repair: 'sump-pump-repair-colorado-springs',
    replace: 'sump-pump-installation-colorado-springs'
  },
  {
    id: 'softener',
    phrases: [
      'water softener',
      'softener',
      'hard water',
      'soft water',
      'mineral buildup',
      'scale buildup',
      'limescale'
    ],
    only: 'water-softener-installation-colorado-springs'
  },
  {
    id: 'filtration',
    phrases: [
      'water filtration',
      'water filter',
      'filtration system',
      'reverse osmosis',
      'water tastes',
      'water smells',
      'drinking water',
      'water quality',
      'chlorine taste',
      'whole house filter'
    ],
    only: 'water-filtration-colorado-springs'
  },
  {
    id: 'trenchless',
    phrases: ['trenchless', 'no dig', 'pipe lining', 'pipe bursting', 'without digging'],
    only: 'trenchless-sewer-repair-colorado-springs'
  },
  {
    id: 'excavation',
    phrases: ['excavation', 'excavate', 'dig up the yard', 'digging up', 'backhoe'],
    only: 'plumbing-excavation-colorado-springs'
  },
  {
    id: 'sewer',
    phrases: [
      'sewer',
      'sewer line',
      'main line',
      'mainline',
      'sewer backup',
      'sewage',
      'sewage smell',
      'sewer smell',
      'tree roots',
      'roots in pipe',
      'camera inspection',
      'sewer camera',
      'septic line',
      'line to the septic',
      'cleanout',
      'whole house backed up'
    ],
    only: 'sewer-repair-colorado-springs'
  },
  {
    id: 'water-line',
    phrases: [
      'water line',
      'main water line',
      'water main',
      'service line',
      'low water pressure',
      'water pressure',
      'no water pressure',
      'wet spot in yard',
      'water meter leak'
    ],
    only: 'water-line-repair-colorado-springs'
  },
  {
    id: 'mini-split',
    phrases: ['mini split', 'minisplit', 'ductless', 'ductless ac', 'ductless heat', 'wall unit'],
    repair: 'mini-split-repair-colorado-springs',
    replace: 'mini-split-replacement-colorado-springs'
  },
  {
    id: 'heat-pump',
    phrases: ['heat pump', 'heatpump'],
    repair: 'heat-pump-repair-colorado-springs',
    replace: 'heat-pump-installation-colorado-springs'
  },
  {
    id: 'boiler',
    phrases: ['boiler', 'radiator', 'radiators', 'radiant heat', 'hydronic', 'baseboard heat'],
    repair: 'boiler-repair-colorado-springs',
    replace: 'boiler-replacement-colorado-springs'
  },
  {
    id: 'air-quality',
    phrases: [
      'air quality',
      'indoor air',
      'air purifier',
      'air purification',
      'humidifier',
      'dehumidifier',
      'dry air',
      'dusty',
      'dust',
      'allergies',
      'allergens',
      'air scrubber',
      'uv light',
      'stuffy air'
    ],
    only: 'indoor-air-quality-colorado-springs'
  },
  {
    id: 'ac',
    phrases: [
      'ac',
      'air conditioner',
      'air conditioning',
      'central air',
      'ac unit',
      'condenser',
      'ac not cooling',
      'blowing warm air',
      'blowing hot air',
      'not blowing cold air',
      'ac will not turn on',
      'house is hot',
      'too hot',
      'freon',
      'refrigerant',
      'frozen coil',
      'ac frozen',
      'evaporator',
      'swamp cooler',
      'evaporative cooler'
    ],
    repair: 'ac-repair-colorado-springs',
    replace: 'ac-replacement-colorado-springs',
    tuneUp: 'ac-tune-up-colorado-springs'
  },
  {
    id: 'cooling',
    phrases: ['cooling', 'cooling system', 'not cooling', 'will not cool', 'no cooling', 'no cold air'],
    only: 'cooling-repair-colorado-springs'
  },
  {
    id: 'furnace',
    phrases: [
      'furnace',
      'furnance',
      'furnice',
      'forced air',
      'furnace will not turn on',
      'furnace not working',
      'short cycling',
      'furnace noise',
      'furnace banging',
      'igniter',
      'flame sensor',
      'blower motor'
    ],
    repair: 'furnace-repair-colorado-springs',
    replace: 'furnace-replacement-colorado-springs',
    tuneUp: 'furnace-tune-up-colorado-springs'
  },
  {
    id: 'heating',
    phrases: [
      'heating',
      'heater',
      'no heat',
      'heat is not',
      'heat not working',
      'house is cold',
      'house is freezing',
      'freezing inside',
      'will not heat',
      'not heating',
      'heat went out',
      'lost heat',
      'thermostat'
    ],
    only: 'heating-repair-colorado-springs'
  },
  {
    id: 'commercial-hvac',
    phrases: ['commercial hvac', 'rooftop unit', 'rtu', 'office hvac', 'restaurant hvac', 'building hvac'],
    only: 'commercial-hvac-colorado-springs'
  },
  {
    id: 'ev-charger',
    phrases: [
      'ev charger',
      'electric vehicle',
      'car charger',
      'tesla charger',
      'level 2 charger',
      'charging station',
      'wall connector'
    ],
    only: 'electric-vehicle-charger-colorado-springs'
  },
  {
    id: 'generator',
    phrases: ['generator', 'backup generator', 'standby generator', 'generac', 'backup power', 'whole home generator'],
    only: 'back-up-generator-installation-colorado-springs'
  },
  {
    id: 'surge',
    phrases: ['surge', 'surge protection', 'surge protector', 'power surge', 'lightning', 'storm protection'],
    only: 'surge-storm-protection-colorado-springs'
  },
  {
    id: 'panel',
    phrases: [
      'panel',
      'electrical panel',
      'breaker panel',
      'breaker box',
      'fuse box',
      'fuses',
      'panel upgrade',
      '200 amp',
      '100 amp',
      'federal pacific',
      'zinsco',
      'service upgrade',
      'main breaker'
    ],
    only: 'electrical-panel-upgrade-colorado-springs'
  },
  {
    id: 'wiring',
    phrases: [
      'wiring',
      'rewire',
      'rewiring',
      'knob and tube',
      'aluminum wiring',
      'old wiring',
      'exposed wires',
      'new circuit',
      'dedicated circuit'
    ],
    only: 'wiring-rewiring-colorado-springs'
  },
  {
    id: 'ceiling-fan',
    phrases: ['ceiling fan', 'ceiling fans', 'install a fan', 'fan install'],
    only: 'ceiling-fan-installation-colorado-springs'
  },
  {
    id: 'lighting',
    phrases: [
      'lighting',
      'light fixture',
      'light fixtures',
      'recessed lights',
      'recessed lighting',
      'can lights',
      'pot lights',
      'landscape lighting',
      'outdoor lights',
      'chandelier',
      'under cabinet lights'
    ],
    only: 'lighting-installation-colorado-springs'
  },
  {
    id: 'electrician',
    phrases: [
      'electrician',
      'electrical',
      'electric',
      'outlet',
      'outlets',
      'plug',
      'switch',
      'light switch',
      'gfci',
      'gfi',
      'breaker',
      'breaker keeps tripping',
      'tripping',
      'tripped',
      'flickering',
      'lights flicker',
      'no power',
      'lost power',
      'power is out',
      'buzzing',
      'sparks',
      'burning smell from outlet',
      'shock',
      'electrical inspection'
    ],
    only: 'electrician-colorado-springs'
  },
  {
    id: 'plumbing-general',
    phrases: [
      'plumbing',
      'plumber',
      'faucet',
      'faucets',
      'leaky faucet',
      'dripping faucet',
      'pipe',
      'pipes',
      'burst pipe',
      'frozen pipe',
      'leak',
      'leaking',
      'water leak',
      'shower',
      'shower valve',
      'spigot',
      'hose bib',
      'sink',
      'backflow',
      'repipe',
      'water everywhere',
      'ice maker line',
      'dishwasher hookup',
      'washing machine hookup'
    ],
    label: 'Plumbing'
  },
  {
    id: 'hvac-general',
    phrases: ['hvac', 'heating and cooling', 'ductwork', 'ducts', 'vents', 'air handler', 'thermostat install'],
    label: 'Heating & cooling'
  }
];

/** Words that turn a family into its replacement/installation service. */
export const REPLACE_WORDS = [
  'new',
  'replace',
  'replacing',
  'replacement',
  'install',
  'installing',
  'installation',
  'installed',
  'put in',
  'upgrade',
  'upgrading',
  'swap out',
  'buy',
  'purchase',
  'quote for a new',
  'too old',
  'end of life'
];
export const TUNE_UP_WORDS = [
  'tune up',
  'tuneup',
  'tune',
  'maintenance',
  'check up',
  'checkup',
  'inspection',
  'annual service',
  'service it',
  'clean and check'
];

/** Trades the company doesn't do - answered honestly instead of guessing. */
export const OUT_OF_SCOPE_TRADES: [string, string][] = [
  ['roof', 'roofing'],
  ['roofing', 'roofing'],
  ['gutter', 'gutter work'],
  ['gutters', 'gutter work'],
  ['painting', 'painting'],
  ['painter', 'painting'],
  ['drywall', 'drywall'],
  ['flooring', 'flooring'],
  ['carpet', 'carpet'],
  ['landscaping', 'landscaping'],
  ['lawn', 'lawn care'],
  ['pool', 'pool work'],
  ['hot tub', 'hot tub repair'],
  ['appliance repair', 'appliance repair'],
  ['refrigerator', 'refrigerator repair'],
  ['fridge', 'refrigerator repair'],
  ['washer repair', 'washer repair'],
  ['dryer repair', 'dryer repair'],
  ['oven', 'oven repair'],
  ['stove', 'stove repair'],
  ['microwave', 'microwave repair'],
  ['garage door', 'garage doors'],
  ['pest', 'pest control'],
  ['termite', 'pest control'],
  ['window', 'window work'],
  ['windows', 'window work'],
  ['siding', 'siding'],
  ['concrete', 'concrete work'],
  ['fence', 'fencing'],
  ['cleaning service', 'house cleaning'],
  ['chimney', 'chimney sweeping'],
  ['solar panels', 'solar installation'],
  ['solar', 'solar installation'],
  ['security camera', 'security cameras'],
  ['cable tv', 'cable TV'],
  ['internet', 'internet service'],
  ['mold removal', 'mold remediation'],
  ['asbestos', 'asbestos removal'],
  ['radon', 'radon mitigation'],
  ['locksmith', 'locksmith work'],
  ['moving', 'moving help'],
  ['car repair', 'auto repair'],
  ['mechanic', 'auto repair']
];

/** Colorado Springs neighborhoods, bases, and landmarks that sit inside the
 * primary market. */
export const COLORADO_SPRINGS_PLACES = [
  'colorado springs',
  'cos',
  'c springs',
  'the springs',
  'springs',
  'briargate',
  'old colorado city',
  'broadmoor',
  'stetson hills',
  'rockrimmon',
  'northgate',
  'banning lewis',
  'cimarron hills',
  'gleneagle',
  'knob hill',
  'austin bluffs',
  'garden of the gods',
  'ivywild',
  'fort carson',
  'peterson space force base',
  'peterson sfb',
  'schriever',
  'air force academy',
  'usafa',
  'flying horse',
  'wolf ranch',
  'mountain shadows',
  'cheyenne mountain',
  'uccs',
  'downtown colorado springs'
];

/** Towns near but outside the published list: not refused, but confirmed by phone. */
export const NEARBY_UNLISTED_TOWNS = [
  'pueblo',
  'pueblo west',
  'canon city',
  'cripple creek',
  'victor',
  'divide',
  'florissant',
  'green mountain falls',
  'chipita park',
  'larkspur',
  'castle pines',
  'franktown',
  'elizabeth',
  'kiowa',
  'calhan',
  'ellicott',
  'lone tree',
  'centennial',
  'littleton',
  'aurora',
  'denver',
  'lakewood',
  'englewood',
  'sedalia',
  'elbert',
  'yoder'
];

/** ZIP code prefixes and exact codes inside the service area. */
export const AREA_ZIPS: Record<string, string> = {
  '80817': 'Fountain',
  '80831': 'Falcon / Peyton',
  '80132': 'Monument',
  '80133': 'Palmer Lake',
  '80908': 'Black Forest',
  '80809': 'Cascade',
  '80829': 'Manitou Springs',
  '80863': 'Woodland Park',
  '80104': 'Castle Rock',
  '80108': 'Castle Rock',
  '80109': 'Castle Rock',
  '80126': 'Highlands Ranch',
  '80129': 'Highlands Ranch',
  '80130': 'Highlands Ranch',
  '80134': 'Parker',
  '80138': 'Parker',
  '80911': 'Security-Widefield',
  '80925': 'Security-Widefield'
};

export const EMERGENCY_TYPES: { id: string; phrases: string[] }[] = [
  {
    id: 'gas',
    phrases: [
      'smell gas',
      'gas smell',
      'gas leak',
      'smells like gas',
      'rotten egg',
      'rotten eggs',
      'hissing gas',
      'gas odor',
      'natural gas smell'
    ]
  },
  {
    id: 'co',
    phrases: ['carbon monoxide', 'co alarm', 'co detector', 'monoxide alarm', 'monoxide detector']
  },
  {
    id: 'electrical-fire',
    phrases: [
      'sparking',
      'sparks',
      'smoke coming',
      'smoking outlet',
      'burning smell',
      'electrical fire',
      'outlet on fire',
      'melted outlet',
      'panel is hot',
      'on fire',
      'caught fire'
    ]
  },
  {
    id: 'flood',
    phrases: [
      'burst pipe',
      'pipe burst',
      'pipe broke',
      'broken pipe',
      'flooding',
      'flooded',
      'flood',
      'water everywhere',
      'water pouring',
      'gushing',
      'spraying water',
      'water coming through the ceiling',
      'ceiling leaking',
      'basement is flooding'
    ]
  },
  {
    id: 'sewage',
    phrases: [
      'sewage backup',
      'sewage coming up',
      'sewage in basement',
      'sewer backed up',
      'raw sewage',
      'toilet overflowing sewage'
    ]
  },
  {
    id: 'no-heat-freezing',
    phrases: [
      'no heat and it is freezing',
      'no heat in winter',
      'pipes are frozen',
      'frozen pipes',
      'freezing and no heat'
    ]
  }
];

/** Every word in the service vocabulary, for typo correction. */
export const LEXICON_WORDS: Set<string> = new Set(
  SERVICE_FAMILIES.flatMap((f) => f.phrases)
    .flatMap((p) => p.split(' '))
    .filter((w) => w.length >= 4)
);

export const URGENT_WORDS = [
  'emergency',
  'urgent',
  'urgently',
  'as soon as possible',
  'right now',
  'right away',
  'immediately',
  'today',
  'tonight',
  'help fast',
  'quickly',
  'no heat',
  'no hot water',
  'no water',
  'no power',
  'overflowing',
  'leaking badly'
];
export const NOT_URGENT_WORDS = [
  'not urgent',
  'not an emergency',
  'no rush',
  'not in a rush',
  'whenever',
  'can wait',
  'next week',
  'sometime',
  'no hurry',
  'flexible',
  'just a quote',
  'just planning',
  'planning ahead',
  'tomorrow is fine',
  'tomorrow works',
  'this week is fine',
  'this week works',
  'any day',
  'anytime this week',
  'it is not urgent'
];
