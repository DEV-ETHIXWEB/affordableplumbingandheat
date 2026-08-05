import acRepair from '../assets/icons/services/ac-repair.svg?raw';
import acReplacement from '../assets/icons/services/ac-replacement.svg?raw';
import drainCleaning from '../assets/icons/services/drain-cleaning.svg?raw';
import electricalPanel from '../assets/icons/services/electrical-panel.svg?raw';
import electrician from '../assets/icons/services/electrician.svg?raw';
import hydroJetting from '../assets/icons/services/hydro-jetting.svg?raw';
import sewerRepair from '../assets/icons/services/sewer-repair.svg?raw';
import trenchlessSewer from '../assets/icons/services/trenchless-sewer.svg?raw';

/** Brand-drawn service icons, keyed by service slug.
 *
 * These take priority over the generic Lucide icon in `serviceIconMap`.
 * Any slug missing here falls back to Lucide, so dropping a new SVG into
 * `assets/icons/services/` and adding one line below is all it takes to
 * upgrade another service. */
export const customServiceIcons: Record<string, string> = {
  'drain-cleaning-colorado-springs': drainCleaning,
  'hydro-jetting-colorado-springs': hydroJetting,
  'ac-repair-colorado-springs': acRepair,
  'ac-replacement-colorado-springs': acReplacement,
  'sewer-repair-colorado-springs': sewerRepair,
  'trenchless-sewer-repair-colorado-springs': trenchlessSewer,
  'electrical-panel-upgrade-colorado-springs': electricalPanel,
  'electrician-colorado-springs': electrician
};

export function getCustomServiceIcon(slug: string | undefined): string | undefined {
  return slug ? customServiceIcons[slug] : undefined;
}
