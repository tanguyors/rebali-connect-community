import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { supabase } from '@/integrations/supabase/client';

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
export async function openExternalAuthenticated(url: string) {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.access_token && session?.refresh_token) {
    const separator = url.includes('#') ? '&' : '#';
    const authenticatedUrl = `${url}${separator}access_token=${session.access_token}&refresh_token=${session.refresh_token}&type=bearer`;
    await openExternal(authenticatedUrl);
  } else {
    await openExternal(url);
  }
}
