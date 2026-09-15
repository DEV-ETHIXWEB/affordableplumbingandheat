import { useEffect, useId, useRef } from 'react';
import { PUBLIC_TURNSTILE_SITE_KEY } from 'astro:env/client';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          theme?: 'light' | 'dark' | 'auto';
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

// render=explicit: without it, api.js also auto-renders every `.cf-turnstile`
// element it finds - with no data-sitekey on ours, that threw "Invalid or
// missing type for parameter sitekey" whenever a widget mounted after the
// script had loaded (the chatbot's confirm step).
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/** True when the widget will render, so forms know to wait for a token. */
export const turnstileEnabled = Boolean(PUBLIC_TURNSTILE_SITE_KEY);
let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Turnstile script failed')));
      return;
    }
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Let a later mount retry instead of caching the failure forever.
      scriptPromise = null;
      script.remove();
      reject(new Error('Turnstile script failed'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Cloudflare Turnstile widget. Renders nothing when
 * PUBLIC_TURNSTILE_SITE_KEY isn't configured, so local dev never needs a
 * live widget to submit forms — the server-side verifyTurnstile() helper
 * (src/lib/turnstile.ts) is the one that decides whether that absence is
 * acceptable (fails closed in production).
 *
 * Tokens are single-use: after any submission attempt, remount the widget
 * (change its `key`) to get a fresh one.
 */
export function Turnstile({
  onVerify,
  onExpire,
  onError,
  theme = 'auto'
}: {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  /** The check could not load or run (blocked script, network, widget error). */
  onError?: () => void;
  theme?: 'light' | 'dark' | 'auto';
}) {
  const containerId = `turnstile-${useId().replace(/:/g, '')}`;
  const widgetId = useRef<string | undefined>(undefined);
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  const onErrorRef = useRef(onError);
  onVerifyRef.current = onVerify;
  onExpireRef.current = onExpire;
  onErrorRef.current = onError;

  const siteKey = PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !window.turnstile) return;
        const el = document.getElementById(containerId);
        if (!el) return;
        widgetId.current = window.turnstile.render(el, {
          sitekey: siteKey,
          theme,
          callback: (token) => onVerifyRef.current(token),
          'expired-callback': () => onExpireRef.current?.(),
          'error-callback': () => {
            onExpireRef.current?.();
            onErrorRef.current?.();
          }
        });
      })
      .catch(() => {
        if (!cancelled) onErrorRef.current?.();
      });

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = undefined;
      }
    };
  }, [containerId, siteKey, theme]);

  if (!siteKey) return null;

  return <div id={containerId} className="turnstile-widget" />;
}
