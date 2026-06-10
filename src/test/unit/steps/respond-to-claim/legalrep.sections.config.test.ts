import { legalRepRespondToClaimSections } from '../../../../main/steps/respond-to-claim/legalrep.sections.config';

describe('legal rep respond-to-claim sections config', () => {
  it('injects selectDefendant section after startNowAndDetails', () => {
    expect(legalRepRespondToClaimSections.map(section => section.id)).toEqual([
      'startNowAndDetails',
      'selectDefendant',
      'personalDetails',
      'disputeAndTenancy',
      'payments',
      'situationAndCircumstances',
      'incomeAndExpenditure',
      'uploadFiles',
      'checkYourAnswersAndSubmit',
    ]);
  });

  it('maps selectDefendant section steps', () => {
    const section = legalRepRespondToClaimSections.find(s => s.id === 'selectDefendant');

    expect(section).toEqual({
      id: 'selectDefendant',
      titleKey: 'taskList.selectDefendant',
      steps: ['select-defendant'],
    });
  });

  it('preserves all original sections', () => {
    expect(legalRepRespondToClaimSections.map(section => section.id)).toContain('personalDetails');
    expect(legalRepRespondToClaimSections.map(section => section.id)).toContain('uploadFiles');
    expect(legalRepRespondToClaimSections.map(section => section.id)).toContain('checkYourAnswersAndSubmit');
  });

  it('has no duplicate section ids', () => {
    const ids = legalRepRespondToClaimSections.map(section => section.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
