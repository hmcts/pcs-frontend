/**
 * @jest-environment jsdom
 */

import { trackCookiePreferences } from '../../../../main/assets/js/analytics';

type Listener = (preferences: unknown) => void;

const reload = jest.fn();

function setUp(): Record<string, Listener> {
  const listeners: Record<string, Listener> = {};
  trackCookiePreferences(
    {
      on: jest.fn((eventName: string, listener: Listener) => {
        listeners[eventName] = listener;
      }),
    },
    reload
  );
  return listeners;
}

describe('trackCookiePreferences', () => {
  beforeEach(() => {
    delete (window as Partial<Window>).dataLayer;
    window.loadGoogleTagManager = jest.fn();
  });

  afterEach(() => {
    delete window.loadGoogleTagManager;
    delete window.googleTagManagerLoaded;
    reload.mockReset();
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

  it('does not load GTM or reload when the user rejects analytics cookies', () => {
    const preferences = { analytics: 'off', apm: 'off' };

    setUp().UserPreferencesSaved(preferences);

    expect(window.dataLayer).toEqual([{ event: 'Cookie Preferences', cookiePreferences: preferences }]);
    expect(window.loadGoogleTagManager).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads the page when the user turns analytics off after GTM has loaded', () => {
    window.googleTagManagerLoaded = true;

    setUp().UserPreferencesSaved({ analytics: 'off', apm: 'on' });

    expect(reload).toHaveBeenCalledTimes(1);
    expect(window.loadGoogleTagManager).not.toHaveBeenCalled();
  });

  it('does not reload when the user keeps analytics on after GTM has loaded', () => {
    window.googleTagManagerLoaded = true;

    setUp().UserPreferencesSaved({ analytics: 'on', apm: 'off' });

    expect(reload).not.toHaveBeenCalled();
  });

  it('does not fail when the GTM loader is not on the page', () => {
    delete window.loadGoogleTagManager;

    expect(() => setUp().UserPreferencesSaved({ analytics: 'on' })).not.toThrow();
  });
});
