jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
  getTranslationFunction: jest.fn(),
}));

import { step } from '../../../../main/steps/respond-to-claim/reasonable-adjustments-error';

describe('reasonable-adjustments-error step', () => {
  const testedStep = step as unknown as {
    stepName: string;
    fields: unknown[];
    customTemplate: string;
    journeyFolder: string;
    translationKeys: Record<string, string>;
    extendGetContent: (req: unknown) => { triageUrl: string };
  };

  it('has the correct step name', () => {
    expect(testedStep.stepName).toBe('reasonable-adjustments-error');
  });

  it('declares no form fields (read-only error page)', () => {
    expect(testedStep.fields).toEqual([]);
  });

  it('renders the dedicated error template', () => {
    expect(testedStep.customTemplate).toMatch(/reasonableAdjustmentsError\.njk$/);
  });

  it('is registered under the respondToClaim journey folder', () => {
    expect(testedStep.journeyFolder).toBe('respondToClaim');
  });

  it('exposes the expected translation keys for the template', () => {
    expect(testedStep.translationKeys).toEqual({
      pageTitle: 'pageTitle',
      heading: 'heading',
      paragraph: 'paragraph',
      tryAgainButton: 'tryAgainButton',
    });
  });

  it('builds the triage url for the "Try again" button from the case reference', () => {
    const req = { res: { locals: { validatedCase: { id: '1234123412341234' } } } };
    expect(testedStep.extendGetContent(req)).toEqual({
      triageUrl: '/case/1234123412341234/respond-to-claim/reasonable-adjustments-triage',
    });
  });
});
