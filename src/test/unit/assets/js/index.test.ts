/**
 * @jest-environment jsdom
 */

jest.mock('../../../../main/assets/scss/main.scss', () => ({}));

jest.mock('govuk-frontend', () => ({
  initAll: jest.fn(),
}));

jest.mock('../../../../main/assets/js/multi-file-upload', () => ({
  initMultiFileUpload: jest.fn(),
}));

jest.mock('../../../../main/assets/js/make-order', () => ({
  initMakeOrder: jest.fn(),
  startWithSavedOrderTab: jest.fn((start: () => void) => start()),
}));

jest.mock('../../../../main/assets/js/postcode-lookup', () => ({
  initPostcodeLookup: jest.fn(),
}));

jest.mock('../../../../main/assets/js/postcode-select', () => ({
  initPostcodeSelection: jest.fn(),
}));

jest.mock('../../../../main/assets/js/session-timeout', () => ({
  initSessionTimeout: jest.fn(),
}));

jest.mock('../../../../main/assets/js/redirect-on-back', () => ({
  initRedirectOnBack: jest.fn(),
}));

jest.mock('@hmcts/cookie-manager', () => ({
  __esModule: true,
  default: { on: jest.fn(), init: jest.fn() },
}));

jest.mock('../../../../main/assets/js/analytics', () => ({
  trackCookiePreferences: jest.fn(),
}));

describe('index.ts', () => {
  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = '';
  });

  it('initialises all modules without loading the make order editor', () => {
    require('../../../../main/assets/js/index');

    const { initAll } = require('govuk-frontend');
    const { initMakeOrder } = require('../../../../main/assets/js/make-order');
    const { initMultiFileUpload } = require('../../../../main/assets/js/multi-file-upload');
    const { initPostcodeLookup } = require('../../../../main/assets/js/postcode-lookup');
    const { initPostcodeSelection } = require('../../../../main/assets/js/postcode-select');
    const { initSessionTimeout } = require('../../../../main/assets/js/session-timeout');
    const { initRedirectOnBack } = require('../../../../main/assets/js/redirect-on-back');
    const cookieManager = require('@hmcts/cookie-manager').default;

    expect(initAll).toHaveBeenCalled();
    expect(cookieManager.init).not.toHaveBeenCalled();
    expect(initMakeOrder).not.toHaveBeenCalled();
    expect(initMultiFileUpload).toHaveBeenCalled();
    expect(initPostcodeLookup).toHaveBeenCalled();
    expect(initPostcodeSelection).toHaveBeenCalled();
    expect(initSessionTimeout).toHaveBeenCalled();
    expect(initRedirectOnBack).toHaveBeenCalled();
  });

  it('loads the make order editor on the make order page', async () => {
    document.body.innerHTML = '<form id="make-order-form"></form>';

    require('../../../../main/assets/js/index');
    await new Promise(resolve => setTimeout(resolve, 0));

    const { initAll } = require('govuk-frontend');
    const { initMakeOrder, startWithSavedOrderTab } = require('../../../../main/assets/js/make-order');

    expect(startWithSavedOrderTab).toHaveBeenCalledWith(initAll);
    expect(initAll).toHaveBeenCalled();
    expect(initMakeOrder).toHaveBeenCalled();
  });

  it('starts the cookie manager after tracking cookie preferences when the cookie banner is on the page', () => {
    document.body.innerHTML = '<div class="cookie-banner" hidden></div>';

    require('../../../../main/assets/js/index');

    const cookieManager = require('@hmcts/cookie-manager').default;
    const { trackCookiePreferences } = require('../../../../main/assets/js/analytics');

    expect(trackCookiePreferences).toHaveBeenCalledWith(cookieManager);
    expect(cookieManager.init).toHaveBeenCalledWith(
      expect.objectContaining({
        userPreferences: { cookieName: 'pcs-cookie-preferences' },
        preferencesForm: { class: 'cookie-preferences-form' },
        cookieManifest: [
          expect.objectContaining({ categoryName: 'essential', optional: false }),
          expect.objectContaining({ categoryName: 'apm', optional: true }),
          expect.objectContaining({ categoryName: 'analytics', optional: true }),
        ],
      })
    );
    expect((trackCookiePreferences as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
      cookieManager.init.mock.invocationCallOrder[0]
    );
  });

  it('starts the cookie manager on the cookies page form', () => {
    document.body.innerHTML = '<form class="cookie-preferences-form"></form>';

    require('../../../../main/assets/js/index');

    expect(require('@hmcts/cookie-manager').default.init).toHaveBeenCalled();
  });
});
