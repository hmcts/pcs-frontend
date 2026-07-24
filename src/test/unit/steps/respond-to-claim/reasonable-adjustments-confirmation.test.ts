jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
  getTranslationFunction: jest.fn(),
}));

import { step } from '../../../../main/steps/respond-to-claim/reasonable-adjustments-confirmation';

describe('reasonable-adjustments-confirmation step', () => {
  const testedStep = step as unknown as {
    stepName: string;
    fields: unknown[];
    customTemplate: string;
    journeyFolder: string;
    translationKeys: Record<string, string>;
  };

  it('has the correct step name', () => {
    expect(testedStep.stepName).toBe('reasonable-adjustments-confirmation');
  });

  it('declares no form fields (read-only confirmation page)', () => {
    expect(testedStep.fields).toEqual([]);
  });

  it('renders the dedicated confirmation template', () => {
    expect(testedStep.customTemplate).toMatch(/reasonableAdjustmentsConfirmation\.njk$/);
  });

  it('is registered under the respondToClaim journey folder', () => {
    expect(testedStep.journeyFolder).toBe('respondToClaim');
  });

  it('exposes the expected translation keys for the template', () => {
    expect(testedStep.translationKeys).toEqual({
      pageTitle: 'pageTitle',
      heading: 'heading',
      submittedCaption: 'submittedCaption',
      whatHappensNextHeading: 'whatHappensNextHeading',
      whatHappensNextParagraph1: 'whatHappensNextParagraph1',
      whatHappensNextParagraph2: 'whatHappensNextParagraph2',
    });
  });
});
