import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export interface GeoPosition {
  latitude: number;
  longitude: number;
}

/**
 * Get current position using Capacitor Geolocation on native,
 * falling back to navigator.geolocation on web.
 */
export async function getCurrentPosition(): Promise<GeoPosition> {
  if (Capacitor.isNativePlatform()) {
    // Request permission first on native
    const perm = await Geolocation.requestPermissions();
    if (perm.location === 'denied') {
      throw new Error('Location permission denied');
    }
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: false,
      timeout: 15000,
    });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  }

  // Web fallback
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 10000 }
    );
  });
}
