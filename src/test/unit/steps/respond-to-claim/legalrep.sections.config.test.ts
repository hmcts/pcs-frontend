import { legalRepRespondToClaimSections } from '../../../../main/steps/respond-to-claim/legalrep.sections.config';

describe('legal rep respond-to-claim sections config', () => {
  it('injects selectDefendant section after startNowAndDetails (and inherits every citizen section)', () => {
    // The legal rep list mirrors the citizen sections (only navigation, via the flat stepOrder,
    // differentiates the two journeys), so citizen-only sections like yourSupport ride along here.
    // Legal reps are redirected away from the task list, so the inherited section is never rendered.
    expect(legalRepRespondToClaimSections.map(section => section.id)).toEqual([
      'startNowAndDetails',
      'selectDefendant',
      'resumeResponse',
      'personalDetails',
      'disputeAndTenancy',
      'payments',
      'situationAndCircumstances',
      'incomeAndExpenditure',
      'yourSupport',
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
