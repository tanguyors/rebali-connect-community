import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { supabase } from '@/integrations/supabase/client';

/** The public webapp URL used for deep links from the native app */
export const WEBAPP_URL = 'https://re-bali.com';

/**
 * Opens an external URL in the in-app browser on native platforms,
 * or in a new tab on the web.
 */
export async function openExternal(url: string) {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url });
  } else {
    window.open(url, '_blank');
  }
}

/**
 * Opens an external URL with the current user's session tokens appended
 * as a URL hash, so the webapp can auto-authenticate the user.
 * Falls back to openExternal if no session is available.
 */
/**
 * Returns true when the current page is displayed inside a Capacitor
 * in-app browser (opened via openExternalAuthenticated with ?source=native).
 */
export function isInAppBrowser(): boolean {
  // Check URL param first (initial landing), then persist in sessionStorage
  // so SPA navigation doesn't lose the flag
  const urlParam = new URLSearchParams(window.location.search).get('source') === 'native';
  if (urlParam) {
    try { sessionStorage.setItem('inAppBrowser', '1'); } catch {}
    return true;
  }
  try { return sessionStorage.getItem('inAppBrowser') === '1'; } catch { return false; }
}

/**
 * Opens a URL, handling the in-app browser case: if we're already inside
 * an in-app browser we navigate directly instead of trying to spawn a second one.
 */
export async function openOrNavigate(url: string) {
  if (isInAppBrowser()) {
    window.location.href = url;
  } else {
    await openExternal(url);
  }
}

/**
 * Opens an external URL with the current user's session tokens appended
 * as a URL hash, so the webapp can auto-authenticate the user.
 * Falls back to openExternal if no session is available.
 */
export async function openExternalAuthenticated(url: string) {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.access_token && session?.refresh_token) {
    // Add source=native so the opened page knows it's inside an in-app browser
    const urlObj = new URL(url);
    urlObj.searchParams.set('source', 'native');
    const baseUrl = urlObj.toString();
    const separator = baseUrl.includes('#') ? '&' : '#';
    const authenticatedUrl = `${baseUrl}${separator}access_token=${session.access_token}&refresh_token=${session.refresh_token}&type=bearer`;
    await openExternal(authenticatedUrl);
  } else {
    await openExternal(url);
  }
}
