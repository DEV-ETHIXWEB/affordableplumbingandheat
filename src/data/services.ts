import type { ImageMetadata } from 'astro';

import acRepairImg from '../assets/images/services/ac-repair.jpg';
import boilerImg from '../assets/images/services/boiler.png';
import ceilingFanImg from '../assets/images/services/ceiling-fan.png';
import electricalPanelImg from '../assets/images/services/electrical-panel.jpg';
import evChargerImg from '../assets/images/services/ev-charger.jpg';
import furnaceImg from '../assets/images/services/furnace-repair.png';
import garbageDisposalImg from '../assets/images/services/garbage-disposal.png';
import generatorImg from '../assets/images/services/generator-installation.jpg';
import gfciImg from '../assets/images/services/gfci-outlet.jpg';
import heatPumpImg from '../assets/images/services/heat-pump.png';
import miniSplitImg from '../assets/images/services/mini-split.png';
import overloadedOutletImg from '../assets/images/services/overloaded-outlet.jpg';
import plumbingExcavationImg from '../assets/images/services/plumbing-excavation.png';
import sumpPumpImg from '../assets/images/services/sump-pump.jpg';
import thermostatImg from '../assets/images/services/thermostat.jpg';
import toiletRepairImg from '../assets/images/services/toilet-repair.png';
import trenchlessSewerImg from '../assets/images/services/trenchless-sewer.png';
import waterHeaterLeakImg from '../assets/images/services/water-heater-leak.jpg';
import waterSoftenerImg from '../assets/images/services/water-softener.png';

export type ServiceCategory = 'plumbing' | 'hvac' | 'electrical' | 'sewer';

export interface Service {
  slug: string;
  title: string;
  category: ServiceCategory;
  icon:
    | 'Droplets'
    | 'Wrench'
    | 'Flame'
    | 'ShowerHead'
    | 'Waves'
    | 'ArrowDownToLine'
    | 'RefreshCw'
    | 'GlassWater'
    | 'FilterX'
    | 'Snowflake'
    | 'Thermometer'
    | 'Gauge'
    | 'Wind'
    | 'Fan'
    | 'AirVent'
    | 'Building2'
    | 'Zap'
    | 'PlugZap'
    | 'BatteryCharging'
    | 'ShieldAlert'
    | 'Cable'
    | 'Lightbulb'
    | 'CircuitBoard'
    | 'Shovel'
    | 'Route';
  eyebrow: string;
  short: string;
  description: string;
  bullets: string[];
  image?: ImageMetadata;
}

export const categoryMeta: Record<ServiceCategory, { label: string; hub: string; description: string }> = {
  plumbing: {
    label: 'Plumbing',
    hub: 'plumbing-contractor-colorado-springs',
    description:
      'From leaky faucets to full water line repairs, our licensed plumbers handle every job with upfront pricing and same-day availability.'
  },
  hvac: {
    label: 'HVAC',
    hub: 'hvac-contractor-colorado-springs',
    description:
      "Heating and cooling built for Colorado's swings — furnace, AC, boiler, and heat pump service that keeps your home comfortable year-round."
  },
  electrical: {
    label: 'Electrical',
    hub: 'electrician-colorado-springs',
    description:
      'Licensed electricians for panel upgrades, EV chargers, generators, and everything in between — safe, code-compliant work every time.'
  },
  sewer: {
    label: 'Sewer & Drain',
    hub: 'sewer-repair-colorado-springs',
    description:
      'Camera-verified drain and sewer diagnostics with trenchless repair options that avoid tearing up your yard whenever possible.'
  }
};

export const services: Service[] = [
  // ---------------- Plumbing ----------------
  {
    slug: 'drain-cleaning-colorado-springs',
    title: 'Drain Cleaning',
    category: 'plumbing',
    icon: 'Droplets',
    eyebrow: 'Clogged drain? Rooter service',
    short: 'Fast, thorough clearing for stubborn clogs, big and small.',
    description:
      "A slow or backed-up drain is usually a symptom, not the problem. We clear the clog and check for the buildup, grease, or root intrusion that caused it, so it doesn't come right back.",
    bullets: ['Camera inspection available', 'Hydro-jetting for tough clogs', 'Kitchen, bath & main line service']
  },
  {
    slug: 'hydro-jetting-colorado-springs',
    title: 'Hydro Jetting',
    category: 'plumbing',
    icon: 'Waves',
    eyebrow: 'High-pressure line clearing',
    short: 'High-pressure water jetting clears grease, scale, and roots.',
    description:
      'For clogs a standard snake can’t touch, hydro jetting blasts years of grease, scale, and root intrusion off pipe walls with high-pressure water, restoring full flow instead of just punching a hole through the blockage.',
    bullets: ['Clears roots & grease buildup', 'Restores full pipe diameter', 'Camera-verified results']
  },
  {
    slug: 'water-heater-repair-colorado-springs',
    title: 'Water Heater Repair',
    category: 'plumbing',
    icon: 'Flame',
    eyebrow: 'Repair, service, or install',
    short: 'Gas, electric, and tankless water heater repair.',
    description:
      "No hot water is never convenient. We diagnose and repair every major water heater brand and type, tank or tankless, so you're back to normal fast.",
    bullets: ['Same-day repair availability', 'All major brands serviced', 'Upfront, flat-rate pricing'],
    image: waterHeaterLeakImg
  },
  {
    slug: 'water-heater-replacement-colorado-springs',
    title: 'Water Heater Replacement',
    category: 'plumbing',
    icon: 'Flame',
    eyebrow: 'New installation',
    short: 'Full water heater replacement, sized and installed right.',
    description:
      "When repair isn't the answer, we'll help you pick the right water heater for your household and install it correctly, safely, and up to code.",
    bullets: ['Free replacement quotes', 'Proper sizing for your home', 'Old unit haul-away included']
  },
  {
    slug: 'tankless-water-heater-installation-colorado-springs',
    title: 'Tankless Water Heater Installation',
    category: 'plumbing',
    icon: 'Flame',
    eyebrow: 'Endless hot water',
    short: 'Tankless water heater installation for on-demand hot water.',
    description:
      'Tankless systems heat water on demand instead of storing it, saving space and energy. We install and configure tankless units matched to your household’s hot water needs.',
    bullets: ['Endless hot water on demand', 'Lower energy costs over time', 'Compact wall-mounted footprint']
  },
  {
    slug: 'toilet-repair-colorado-springs',
    title: 'Toilet Repair',
    category: 'plumbing',
    icon: 'ShowerHead',
    eyebrow: 'Repair, service, and install',
    short: 'Running, clogged, or leaking toilets fixed for good.',
    description:
      'A toilet problem is rarely just an inconvenience, it can mean real water damage. We handle running toilets, weak flushes, and base leaks with same-day care.',
    bullets: ['Same-day service', 'Wax ring & base leak repair', 'Water-efficient upgrade options'],
    image: toiletRepairImg
  },
  {
    slug: 'toilet-replacement-colorado-springs',
    title: 'Toilet Replacement',
    category: 'plumbing',
    icon: 'ShowerHead',
    eyebrow: 'New installation',
    short: 'Full toilet replacement and water-efficient upgrades.',
    description:
      'When a toilet is beyond repair, we handle full removal and replacement, including water-efficient models that can lower your water bill.',
    bullets: ['Water-efficient models available', 'Clean, careful installation', 'Old unit removal included']
  },
  {
    slug: 'garbage-disposal-replacement-colorado-springs',
    title: 'Garbage Disposal Replacement',
    category: 'plumbing',
    icon: 'RefreshCw',
    eyebrow: 'Kitchen plumbing',
    short: 'Garbage disposal replacement, done right the first time.',
    description:
      'A jammed or leaking disposal disrupts your whole kitchen routine. We replace disposals of all makes and models quickly and correctly.',
    bullets: ['All major brands installed', 'Leak-free connections', 'Old unit removed & hauled away'],
    image: garbageDisposalImg
  },
  {
    slug: 'sump-pump-repair-colorado-springs',
    title: 'Sump Pump Repair',
    category: 'plumbing',
    icon: 'ArrowDownToLine',
    eyebrow: 'Basement protection',
    short: 'Sump pump repair to protect your basement from flooding.',
    description:
      'A failed sump pump can mean serious water damage fast. We diagnose and repair motor failures, switch problems, and clogged discharge lines to get your protection back online.',
    bullets: ['Fast diagnosis & repair', 'Battery backup checks', 'Flood-season priority scheduling'],
    image: sumpPumpImg
  },
  {
    slug: 'sump-pump-installation-colorado-springs',
    title: 'Sump Pump Installation',
    category: 'plumbing',
    icon: 'ArrowDownToLine',
    eyebrow: 'New installation',
    short: 'New sump pump installation and battery backup systems.',
    description:
      'We install primary sump pumps and battery-backup systems sized for your basement, so heavy rain and snowmelt stay outside where they belong.',
    bullets: ['Primary & backup pump options', 'Sized for your basement', 'Battery backup available']
  },
  {
    slug: 'water-filtration-colorado-springs',
    title: 'Water Filtration',
    category: 'plumbing',
    icon: 'FilterX',
    eyebrow: 'Whole-home filtration',
    short: 'Whole-home water filtration systems, installed and tuned.',
    description:
      "Colorado Springs' water quality varies by neighborhood. We install whole-home filtration systems that address sediment, chlorine taste, and other water quality concerns.",
    bullets: ['Whole-home & point-of-use options', 'Improves taste & clarity', 'Regular filter service available']
  },
  {
    slug: 'water-softener-installation-colorado-springs',
    title: 'Water Softener Installation',
    category: 'plumbing',
    icon: 'GlassWater',
    eyebrow: 'Hard water solutions',
    short: 'Water softener installation to protect pipes and appliances.',
    description:
      'Hard water shortens the life of your pipes, water heater, and appliances. We install softener systems sized for your household to protect your plumbing investment.',
    bullets: ['Protects pipes & appliances', 'Reduces scale buildup', 'Sized to your water usage'],
    image: waterSoftenerImg
  },
  {
    slug: 'water-line-repair-colorado-springs',
    title: 'Water Line Repair',
    category: 'plumbing',
    icon: 'Wrench',
    eyebrow: 'Underground repair',
    short: 'Main water line repair and replacement.',
    description:
      'A failing water line can show up as low pressure, a spiking water bill, or a wet spot in the yard. We locate, repair, or replace main water lines with minimal disruption.',
    bullets: ['Leak detection included', 'Trenchless options available', 'Permit & inspection handled']
  },

  // ---------------- HVAC ----------------
  {
    slug: 'ac-repair-colorado-springs',
    title: 'AC Repair',
    category: 'hvac',
    icon: 'Snowflake',
    eyebrow: 'Cooling repair',
    short: 'Fast air conditioner diagnosis and repair.',
    description:
      "When your AC quits on a 95-degree day, waiting isn't an option. We diagnose and repair all major residential AC brands, often the same day.",
    bullets: ['Same-day service available', 'All major AC brands', 'Upfront diagnostic pricing'],
    image: acRepairImg
  },
  {
    slug: 'ac-replacement-colorado-springs',
    title: 'AC Replacement',
    category: 'hvac',
    icon: 'Snowflake',
    eyebrow: 'New installation',
    short: 'Full AC system replacement, sized for your home.',
    description:
      "When repair costs start rivaling replacement, we'll walk you through efficient options sized correctly for your home's square footage and layout.",
    bullets: ['Free replacement estimates', 'Energy-efficient options', 'Proper load-calculated sizing']
  },
  {
    slug: 'ac-tune-up-colorado-springs',
    title: 'AC Tune-Up',
    category: 'hvac',
    icon: 'Gauge',
    eyebrow: 'Seasonal maintenance',
    short: 'Annual AC tune-ups that prevent breakdowns.',
    description:
      'A yearly tune-up catches small issues before they become no-cooling emergencies, and keeps your system running at peak efficiency all summer.',
    bullets: ['Full system inspection', 'Refrigerant level check', 'Improves efficiency & lifespan']
  },
  {
    slug: 'cooling-repair-colorado-springs',
    title: 'Cooling Repair',
    category: 'hvac',
    icon: 'Snowflake',
    eyebrow: 'General cooling service',
    short: 'Cooling system diagnosis and repair for any setup.',
    description:
      'Central air, mini split, or heat pump cooling, we service the full range of residential cooling systems found across Colorado Springs homes.',
    bullets: ['All system types serviced', 'Clear diagnostic explanations', 'Repair or replace guidance']
  },
  {
    slug: 'furnace-repair-colorado-springs',
    title: 'Furnace Repair',
    category: 'hvac',
    icon: 'Thermometer',
    eyebrow: 'Heating repair',
    short: 'Furnace diagnosis and repair for Colorado winters.',
    description:
      "When your furnace goes out in a Colorado winter, it's an emergency. Our technicians are on call around the clock to get your heat back safely.",
    bullets: ['24/7 emergency availability', 'All major furnace brands', 'Safety-first diagnostics'],
    image: furnaceImg
  },
  {
    slug: 'furnace-replacement-colorado-springs',
    title: 'Furnace Replacement',
    category: 'hvac',
    icon: 'Thermometer',
    eyebrow: 'New installation',
    short: 'Full furnace replacement, properly sized and installed.',
    description:
      "An aging furnace working overtime costs more to run and repair than it's worth. We help you choose and install an efficient replacement built for Colorado winters.",
    bullets: ['Free replacement estimates', 'High-efficiency options', 'Old unit removal included']
  },
  {
    slug: 'furnace-tune-up-colorado-springs',
    title: 'Furnace Tune-Up',
    category: 'hvac',
    icon: 'Gauge',
    eyebrow: 'Seasonal maintenance',
    short: 'Annual furnace tune-ups before the cold hits.',
    description:
      'A pre-winter tune-up checks the components most likely to fail on the coldest night of the year, so you’re not caught without heat.',
    bullets: ['Full safety inspection', 'Filter & airflow check', 'Carbon monoxide testing']
  },
  {
    slug: 'heat-pump-installation-colorado-springs',
    title: 'Heat Pump Installation',
    category: 'hvac',
    icon: 'Wind',
    eyebrow: 'New installation',
    short: 'Heat pump installation for efficient heating and cooling.',
    description:
      'Heat pumps handle both heating and cooling from a single system. We size and install heat pumps matched to Colorado’s temperature swings.',
    bullets: ['Heats & cools from one system', 'Energy-efficient operation', 'Rebate guidance available'],
    image: heatPumpImg
  },
  {
    slug: 'heat-pump-repair-colorado-springs',
    title: 'Heat Pump Repair',
    category: 'hvac',
    icon: 'Wind',
    eyebrow: 'Repair & service',
    short: 'Heat pump diagnosis and repair.',
    description:
      'From refrigerant issues to defrost-cycle problems, we diagnose and repair heat pumps so your year-round comfort system keeps working.',
    bullets: ['Same-day diagnostics', 'All major brands serviced', 'Repair or replace guidance']
  },
  {
    slug: 'heating-repair-colorado-springs',
    title: 'Heating Repair',
    category: 'hvac',
    icon: 'Thermometer',
    eyebrow: 'General heating service',
    short: 'Heating system repair for furnaces, boilers, and heat pumps.',
    description:
      "Whatever's keeping your home warm, furnace, boiler, or heat pump, our technicians diagnose the problem and explain your options in plain language.",
    bullets: ['All heating system types', '24/7 emergency service', 'Upfront pricing before work begins']
  },
  {
    slug: 'boiler-repair-colorado-springs',
    title: 'Boiler Repair',
    category: 'hvac',
    icon: 'Thermometer',
    eyebrow: 'Repair & service',
    short: 'Boiler diagnosis and repair for radiant heat systems.',
    description:
      'Boiler systems need specialized service. We diagnose pressure issues, leaks, and pilot problems to keep radiant heat systems running safely.',
    bullets: ['Radiant & hydronic systems', 'Pressure & leak diagnostics', 'Safety inspections included'],
    image: boilerImg
  },
  {
    slug: 'boiler-replacement-colorado-springs',
    title: 'Boiler Replacement',
    category: 'hvac',
    icon: 'Thermometer',
    eyebrow: 'New installation',
    short: 'Full boiler replacement and system upgrades.',
    description:
      'When a boiler reaches the end of its service life, we install a properly sized replacement and make sure the whole system is balanced correctly.',
    bullets: ['Free replacement estimates', 'System balancing included', 'High-efficiency options']
  },
  {
    slug: 'mini-split-repair-colorado-springs',
    title: 'Mini Split Repair',
    category: 'hvac',
    icon: 'AirVent',
    eyebrow: 'Ductless system service',
    short: 'Ductless mini split diagnosis and repair.',
    description:
      'Ductless mini splits need trained technicians. We diagnose and repair indoor and outdoor unit issues to restore heating and cooling fast.',
    bullets: ['Indoor & outdoor unit service', 'Refrigerant leak detection', 'All major brands serviced'],
    image: miniSplitImg
  },
  {
    slug: 'mini-split-replacement-colorado-springs',
    title: 'Mini Split Replacement',
    category: 'hvac',
    icon: 'AirVent',
    eyebrow: 'New installation',
    short: 'Ductless mini split installation for room-by-room control.',
    description:
      'Mini splits are ideal for additions, garages, or homes without ductwork. We install single and multi-zone systems sized for your space.',
    bullets: ['No ductwork required', 'Single & multi-zone systems', 'Room-by-room temperature control']
  },
  {
    slug: 'indoor-air-quality-colorado-springs',
    title: 'Indoor Air Quality',
    category: 'hvac',
    icon: 'Wind',
    eyebrow: 'Air purification & filtration',
    short: 'Indoor air quality solutions for cleaner, healthier air.',
    description:
      'From whole-home air purifiers to humidity control, we install indoor air quality solutions that address allergens, dust, and dry Colorado air.',
    bullets: ['Whole-home air purifiers', 'Humidity control systems', 'Allergen & dust reduction']
  },
  {
    slug: 'commercial-hvac-colorado-springs',
    title: 'Commercial HVAC',
    category: 'hvac',
    icon: 'Building2',
    eyebrow: 'Business & commercial service',
    short: 'Commercial HVAC service for Colorado Springs businesses.',
    description:
      'Commercial heating and cooling systems demand fast response to minimize business disruption. We service rooftop units, commercial boilers, and multi-zone systems.',
    bullets: ['Rooftop unit service', 'Minimal business disruption', 'Preventative maintenance plans']
  },

  // ---------------- Electrical ----------------
  {
    slug: 'electrician-colorado-springs',
    title: 'Electrician',
    category: 'electrical',
    icon: 'Zap',
    eyebrow: 'Licensed electrical service',
    short: 'Licensed electricians for repairs, installs, and inspections.',
    description:
      'From flickering lights to full rewiring, our licensed electricians handle residential electrical work safely and up to code.',
    bullets: ['Licensed & insured electricians', 'Transparent, upfront pricing', 'Safety-first on every job']
  },
  {
    slug: 'electrical-panel-upgrade-colorado-springs',
    title: 'Electrical Panel Upgrade',
    category: 'electrical',
    icon: 'CircuitBoard',
    eyebrow: 'Panel & service upgrades',
    short: 'Electrical panel upgrades for older or overloaded homes.',
    description:
      "An outdated or overloaded panel is both an inconvenience and a safety risk. We upgrade panels to safely support today's electrical demands.",
    bullets: ['Handles modern electrical loads', 'Code-compliant installation', 'Permit & inspection handled'],
    image: electricalPanelImg
  },
  {
    slug: 'electric-vehicle-charger-colorado-springs',
    title: 'EV Charger Installation',
    category: 'electrical',
    icon: 'BatteryCharging',
    eyebrow: 'Level 2 home charging',
    short: 'Home EV charger installation, done safely and to code.',
    description:
      "Charging at home should be fast and worry-free. We install Level 2 EV chargers with the correct circuit and load calculations for your home's panel.",
    bullets: ['Level 2 charger installation', 'Panel load calculations included', 'Most major charger brands'],
    image: evChargerImg
  },
  {
    slug: 'back-up-generator-installation-colorado-springs',
    title: 'Back Up Generator Installation',
    category: 'electrical',
    icon: 'PlugZap',
    eyebrow: 'Whole-home standby power',
    short: 'Standby generator installation for reliable backup power.',
    description:
      'Colorado weather can knock out power for days. We install standby generators that switch on automatically to keep your home running.',
    bullets: ['Automatic transfer switch', 'Sized to your home’s needs', 'Ongoing maintenance plans available'],
    image: generatorImg
  },
  {
    slug: 'surge-storm-protection-colorado-springs',
    title: 'Surge & Storm Protection',
    category: 'electrical',
    icon: 'ShieldAlert',
    eyebrow: 'Whole-home surge protection',
    short: 'Whole-home surge protection against storm damage.',
    description:
      "A single power surge can destroy appliances and electronics in an instant. We install whole-home surge protection to guard against Colorado's frequent storms.",
    bullets: ['Whole-home coverage', 'Protects appliances & electronics', 'One-time installation'],
    image: overloadedOutletImg
  },
  {
    slug: 'wiring-rewiring-colorado-springs',
    title: 'Wiring & Rewiring',
    category: 'electrical',
    icon: 'Cable',
    eyebrow: 'Wiring repair & upgrades',
    short: 'Wiring and rewiring for older or renovated homes.',
    description:
      'Outdated wiring is a leading cause of house fires. We inspect, repair, and rewire homes to bring electrical systems up to modern safety standards.',
    bullets: ['Full home rewiring available', 'Code-compliant materials', 'Fire-risk inspections'],
    image: gfciImg
  },
  {
    slug: 'lighting-installation-colorado-springs',
    title: 'Lighting Installation',
    category: 'electrical',
    icon: 'Lightbulb',
    eyebrow: 'Indoor & outdoor lighting',
    short: 'Interior, exterior, and landscape lighting installation.',
    description:
      'From recessed lighting to landscape fixtures, we install lighting systems that improve both the look and safety of your home.',
    bullets: ['Indoor & outdoor fixtures', 'LED upgrade options', 'Landscape & security lighting']
  },
  {
    slug: 'ceiling-fan-installation-colorado-springs',
    title: 'Ceiling Fan Installation',
    category: 'electrical',
    icon: 'Fan',
    eyebrow: 'Fixture installation',
    short: 'Ceiling fan installation and replacement.',
    description:
      'A properly installed ceiling fan needs the right electrical box and support, not just a swap. We install and secure fans safely, every time.',
    bullets: ['Proper electrical box support', 'Remote & smart fan setup', 'Old fixture removal included'],
    image: ceilingFanImg
  },

  // ---------------- Sewer ----------------
  {
    slug: 'sewer-repair-colorado-springs',
    title: 'Sewer Repair',
    category: 'sewer',
    icon: 'Shovel',
    eyebrow: 'Sewer line repair',
    short: 'Sewer line diagnosis and repair with camera inspection.',
    description:
      "Sewer lines can be blocked or damaged by root intrusion, age, or shifting soil. We diagnose with camera inspection so you know exactly what's happening underground before we recommend a fix.",
    bullets: ['Video camera diagnostics', 'Root intrusion clearing', 'Repair or replace guidance']
  },
  {
    slug: 'trenchless-sewer-repair-colorado-springs',
    title: 'Trenchless Sewer Repair',
    category: 'sewer',
    icon: 'Route',
    eyebrow: 'No-dig sewer repair',
    short: 'Trenchless sewer repair without tearing up your yard.',
    description:
      "Trenchless repair fixes damaged sewer lines through small access points instead of digging a full trench, saving your landscaping, driveway, or patio.",
    bullets: ['Minimal yard disruption', 'Faster than traditional dig-up', 'Long-lasting pipe lining'],
    image: trenchlessSewerImg
  },
  {
    slug: 'plumbing-excavation-colorado-springs',
    title: 'Plumbing Excavation',
    category: 'sewer',
    icon: 'Shovel',
    eyebrow: 'Underground plumbing repair',
    short: 'Excavation for sewer and water line repairs when needed.',
    description:
      'When trenchless methods aren’t an option, our crews handle excavation safely and efficiently, then restore the site when the repair is complete.',
    bullets: ['Locates & permits handled', 'Efficient, careful digging', 'Site restoration included'],
    image: plumbingExcavationImg
  }
];

export function getServicesByCategory(category: ServiceCategory): Service[] {
  return services.filter((s) => s.category === category);
}

export function getServiceBySlug(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}

export { thermostatImg };
