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
  it('initialises all modules', () => {
    require('../../../../main/assets/js/index');

    const { initAll } = require('govuk-frontend');
    const { initMakeOrder } = require('../../../../main/assets/js/make-order');
    const { initMultiFileUpload } = require('../../../../main/assets/js/multi-file-upload');
    const { initOrderPreview } = require('../../../../main/assets/js/order-preview');
    const { initPostcodeLookup } = require('../../../../main/assets/js/postcode-lookup');
    const { initPostcodeSelection } = require('../../../../main/assets/js/postcode-select');
    const { initSessionTimeout } = require('../../../../main/assets/js/session-timeout');

    expect(initAll).toHaveBeenCalled();
    expect(initMakeOrder).toHaveBeenCalled();
    expect(initMultiFileUpload).toHaveBeenCalled();
    expect(initOrderPreview).toHaveBeenCalled();
    expect(initPostcodeLookup).toHaveBeenCalled();
    expect(initPostcodeSelection).toHaveBeenCalled();
    expect(initSessionTimeout).toHaveBeenCalled();
  });
});
