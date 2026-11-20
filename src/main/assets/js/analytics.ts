declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
  }
}

interface CookiePreferenceManager {
  on(eventName: string, listener: (preferences: unknown) => void): void;
}

/**
 * Gives Google Tag Manager the user's cookie preferences, as cui-ra does. Call it before cookieManager.init(), which
 * emits UserPreferencesLoaded while it runs.
 */
export function trackCookiePreferences(cookieManager: CookiePreferenceManager): void {
  cookieManager.on('UserPreferencesLoaded', preferences => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'Cookie Preferences',
      cookiePreferences: preferences,
    });
  });
}
