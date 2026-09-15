import { PUBLIC_GA4_ID, PUBLIC_GTM_ID, PUBLIC_CALLRAIL_COMPANY_ID, PUBLIC_CALLRAIL_SCRIPT_ID } from 'astro:env/client';

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** IDs are interpolated into inline scripts, so anything that isn't the
 * vendor's documented shape is dropped rather than rendered. */
export const analyticsConfig = {
  gtmId: /^GTM-[A-Z0-9]{4,12}$/.test(PUBLIC_GTM_ID ?? '') ? PUBLIC_GTM_ID! : null,
  ga4Id: /^G-[A-Z0-9]{4,15}$/.test(PUBLIC_GA4_ID ?? '') ? PUBLIC_GA4_ID! : null,
  callRail:
    /^\d{5,12}$/.test(PUBLIC_CALLRAIL_COMPANY_ID ?? '') && /^[a-f0-9]{8,40}$/i.test(PUBLIC_CALLRAIL_SCRIPT_ID ?? '')
      ? { companyId: PUBLIC_CALLRAIL_COMPANY_ID!, scriptId: PUBLIC_CALLRAIL_SCRIPT_ID! }
      : null
};

/**
 * Records a lead conversion. Call ONLY after POST /api/lead has responded
 * successfully - never on click - so ad platforms and GA4 count real leads,
 * not attempts. Pushes to the GTM dataLayer (configure a `generate_lead`
 * custom-event trigger there) and, for a direct GA4 install, sends the
 * recommended `generate_lead` event.
 */
export function trackLead(details: { source: string; service?: string; urgent?: boolean }): void {
  if (typeof window === 'undefined') return;
  const params = {
    lead_source: details.source,
    service: details.service || undefined,
    urgent: Boolean(details.urgent)
  };
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event: 'generate_lead', ...params });
  if (!analyticsConfig.gtmId) window.gtag?.('event', 'generate_lead', params);
}
