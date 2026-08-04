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
    const { initMultiFileUpload } = require('../../../../main/assets/js/multi-file-upload');
    const { initPostcodeLookup } = require('../../../../main/assets/js/postcode-lookup');
    const { initPostcodeSelection } = require('../../../../main/assets/js/postcode-select');
    const { initSessionTimeout } = require('../../../../main/assets/js/session-timeout');

    expect(initAll).toHaveBeenCalled();
    expect(initMultiFileUpload).toHaveBeenCalled();
    expect(initPostcodeLookup).toHaveBeenCalled();
    expect(initPostcodeSelection).toHaveBeenCalled();
    expect(initSessionTimeout).toHaveBeenCalled();
  });
});
