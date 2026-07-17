import { buildManageCaseDetailsRedirect } from '@utils/manageCaseRedirect';

describe('buildManageCaseDetailsRedirect', () => {
  it('builds a validated Manage Case case-details URL', () => {
    expect(
      buildManageCaseDetailsRedirect(
        'https://manage-case.aat.platform.hmcts.net/cases/case-details/PCS/PCS/',
        '1771325608502536'
      )
    ).toBe('https://manage-case.aat.platform.hmcts.net/cases/case-details/PCS/PCS/1771325608502536');
  });

  it('removes query strings and fragments from the configured base URL', () => {
    expect(
      buildManageCaseDetailsRedirect(
        'https://manage-case.aat.platform.hmcts.net/cases/case-details/PCS/PCS?next=https://example.com#fragment',
        '1771325608502536'
      )
    ).toBe('https://manage-case.aat.platform.hmcts.net/cases/case-details/PCS/PCS/1771325608502536');
  });

  it.each([
    [null, '1771325608502536'],
    ['https://manage-case.aat.platform.hmcts.net/cases/case-details/PCS/PCS', undefined],
    ['https://manage-case.aat.platform.hmcts.net/cases/case-details/PCS/PCS', 'https://example.com'],
    ['https://manage-case.aat.platform.hmcts.net/cases/case-details/PCS/PCS', '../1771325608502536'],
    ['javascript:alert(1)', '1771325608502536'],
    ['https://manage-case.aat.platform.hmcts.net/redirect', '1771325608502536'],
    ['not a url', '1771325608502536'],
  ])('rejects unsafe Manage Case redirect inputs', (baseUrl, caseId) => {
    expect(buildManageCaseDetailsRedirect(baseUrl, caseId)).toBeUndefined();
  });
});
