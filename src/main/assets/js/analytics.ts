declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
    // Defined by views/tagmanager/head.njk when tracking is enabled.
    loadGoogleTagManager?: () => void;
    // Set by the loader once it has added GTM to the page.
    googleTagManagerLoaded?: boolean;
  }
}

interface CookiePreferenceManager {
  on(eventName: string, listener: (preferences: unknown) => void): void;
}

const pushCookiePreferences = (preferences: unknown): void => {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'Cookie Preferences',
    cookiePreferences: preferences,
  });
};

const hasAnalyticsConsent = (preferences: unknown): boolean =>
  typeof preferences === 'object' &&
  preferences !== null &&
  (preferences as Record<string, unknown>).analytics === 'on';

/**
 * Gives Google Tag Manager the user's cookie preferences and loads it as soon as the user accepts
 * analytics cookies. Until then the page doesn't load it at all (see views/tagmanager/head.njk).
 */
export function trackCookiePreferences(
  cookieManager: CookiePreferenceManager,
  reloadPage: () => void = () => window.location.reload()
): void {
  cookieManager.on('UserPreferencesLoaded', pushCookiePreferences);

  cookieManager.on('UserPreferencesSaved', preferences => {
    // Push first, so the container sees the new preferences when it loads.
    pushCookiePreferences(preferences);
    if (hasAnalyticsConsent(preferences)) {
      window.loadGoogleTagManager?.();
    } else if (window.googleTagManagerLoaded) {
      // GTM can't be unloaded, so reload: the server only renders it with consent. Only the cookies page form can
      // turn analytics off after it has loaded.
      reloadPage();
    }
  });
}
