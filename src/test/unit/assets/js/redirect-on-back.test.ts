/**
 * @jest-environment jsdom
 */

import { redirectTo } from '../../../../main/assets/js/navigate';
import { initRedirectOnBack } from '../../../../main/assets/js/redirect-on-back';

jest.mock('../../../../main/assets/js/navigate', () => ({
  redirectTo: jest.fn(),
}));

const redirectToMock = redirectTo as jest.Mock;

describe('initRedirectOnBack', () => {
  const caseSummaryUrl = 'https://manage-case.example/cases/case-details/PCS/PCS/1234567890123456';

  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = '';
    redirectToMock.mockReset();
    jest.spyOn(history, 'pushState').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('redirects to the case summary when Back is pressed', () => {
    document.body.innerHTML = `<span id="redirect-on-back" data-redirect-url="${caseSummaryUrl}" hidden></span>`;

    initRedirectOnBack();
    window.dispatchEvent(new Event('pageshow'));
    jest.runAllTimers();
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(redirectToMock).toHaveBeenCalledWith(caseSummaryUrl);
  });
});
