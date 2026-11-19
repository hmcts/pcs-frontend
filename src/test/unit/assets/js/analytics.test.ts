/**
 * @jest-environment jsdom
 */

import { trackCookiePreferences } from '../../../../main/assets/js/analytics';

describe('trackCookiePreferences', () => {
  beforeEach(() => {
    delete (window as Partial<Window>).dataLayer;
  });

  it('pushes loaded cookie preferences to the GTM data layer', () => {
    let listener: ((preferences: unknown) => void) | undefined;
    const cookieManager = {
      on: jest.fn((eventName: string, registeredListener: (preferences: unknown) => void) => {
        expect(eventName).toBe('UserPreferencesLoaded');
        listener = registeredListener;
      }),
    };
    const preferences = { analytics: 'on', apm: 'off' };

    trackCookiePreferences(cookieManager);
    listener?.(preferences);

    expect(window.dataLayer).toEqual([{ event: 'Cookie Preferences', cookiePreferences: preferences }]);
  });
});
