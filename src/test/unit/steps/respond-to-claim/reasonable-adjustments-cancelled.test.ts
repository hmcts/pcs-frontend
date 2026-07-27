jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
  getTranslationFunction: jest.fn(),
}));

import { step } from '../../../../main/steps/respond-to-claim/reasonable-adjustments-cancelled';

describe('reasonable-adjustments-cancelled step', () => {
  const testedStep = step as unknown as {
    stepName: string;
    fields: unknown[];
    customTemplate: string;
    journeyFolder: string;
    translationKeys: Record<string, string>;
    extendGetContent: (req: unknown) => { languageUsedUrl: string };
  };

  it('has the correct step name', () => {
    expect(testedStep.stepName).toBe('reasonable-adjustments-cancelled');
  });

  it('declares no form fields (read-only page)', () => {
    expect(testedStep.fields).toEqual([]);
  });

  it('renders the dedicated cancelled template', () => {
    expect(testedStep.customTemplate).toMatch(/reasonableAdjustmentsCancelled\.njk$/);
  });

  it('is registered under the respondToClaim journey folder', () => {
    expect(testedStep.journeyFolder).toBe('respondToClaim');
  });

  it('exposes the expected translation keys for the template', () => {
    expect(testedStep.translationKeys).toEqual({
      pageTitle: 'pageTitle',
      heading: 'heading',
      continueButton: 'continueButton',
    });
  });

  it('builds the language-used continue url (with nav=1) from the case reference', () => {
    const req = { res: { locals: { validatedCase: { id: '1234123412341234' } } } };
    expect(testedStep.extendGetContent(req)).toEqual({
      languageUsedUrl: '/case/1234123412341234/respond-to-claim/language-used?nav=1',
    });
  });
});
