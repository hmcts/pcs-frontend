/**
 * @jest-environment jsdom
 */

import { trackCookiePreferences } from '../../../../main/assets/js/analytics';

type Listener = (preferences: unknown) => void;

function setUp(): Record<string, Listener> {
  const listeners: Record<string, Listener> = {};
  trackCookiePreferences({
    on: jest.fn((eventName: string, listener: Listener) => {
      listeners[eventName] = listener;
    }),
  });
  return listeners;
}

describe('trackCookiePreferences', () => {
  beforeEach(() => {
    delete (window as Partial<Window>).dataLayer;
    window.loadGoogleTagManager = jest.fn();
  });

  afterEach(() => {
    delete window.loadGoogleTagManager;
  });

  it('pushes loaded cookie preferences to the GTM data layer without loading GTM', () => {
    const preferences = { analytics: 'on', apm: 'off' };

    setUp().UserPreferencesLoaded(preferences);

    expect(window.dataLayer).toEqual([{ event: 'Cookie Preferences', cookiePreferences: preferences }]);
    expect(window.loadGoogleTagManager).not.toHaveBeenCalled();
  });

  it('pushes saved preferences and then loads GTM when the user accepts analytics cookies', () => {
    const preferences = { analytics: 'on', apm: 'on' };
    (window.loadGoogleTagManager as jest.Mock).mockImplementation(() => {
      expect(window.dataLayer).toEqual([{ event: 'Cookie Preferences', cookiePreferences: preferences }]);
    });

    setUp().UserPreferencesSaved(preferences);

    expect(window.loadGoogleTagManager).toHaveBeenCalledTimes(1);
  });

  it('does not load GTM when the user rejects analytics cookies', () => {
    const preferences = { analytics: 'off', apm: 'off' };

    setUp().UserPreferencesSaved(preferences);

    expect(window.dataLayer).toEqual([{ event: 'Cookie Preferences', cookiePreferences: preferences }]);
    expect(window.loadGoogleTagManager).not.toHaveBeenCalled();
  });

  it('does not fail when the GTM loader is not on the page', () => {
    delete window.loadGoogleTagManager;

    expect(() => setUp().UserPreferencesSaved({ analytics: 'on' })).not.toThrow();
  });
});
