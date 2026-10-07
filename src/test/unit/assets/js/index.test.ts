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

jest.mock('../../../../main/assets/js/order-preview', () => ({
  initOrderPreview: jest.fn(),
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

describe('index.ts', () => {
  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = '';
  });

  it('initialises all modules without loading the make order editor or order preview', () => {
    require('../../../../main/assets/js/index');

    const { initAll } = require('govuk-frontend');
    const { initMakeOrder } = require('../../../../main/assets/js/make-order');
    const { initMultiFileUpload } = require('../../../../main/assets/js/multi-file-upload');
    const { initOrderPreview } = require('../../../../main/assets/js/order-preview');
    const { initPostcodeLookup } = require('../../../../main/assets/js/postcode-lookup');
    const { initPostcodeSelection } = require('../../../../main/assets/js/postcode-select');
    const { initSessionTimeout } = require('../../../../main/assets/js/session-timeout');

    expect(initAll).toHaveBeenCalled();
    expect(initMakeOrder).not.toHaveBeenCalled();
    expect(initMultiFileUpload).toHaveBeenCalled();
    expect(initOrderPreview).not.toHaveBeenCalled();
    expect(initPostcodeLookup).toHaveBeenCalled();
    expect(initPostcodeSelection).toHaveBeenCalled();
    expect(initSessionTimeout).toHaveBeenCalled();
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

  it('loads the order preview on a page that shows one', async () => {
    document.body.innerHTML = '<div data-order-preview></div>';

    require('../../../../main/assets/js/index');
    await new Promise(resolve => setTimeout(resolve, 0));

    const { initOrderPreview } = require('../../../../main/assets/js/order-preview');

    expect(initOrderPreview).toHaveBeenCalled();
  });
});
