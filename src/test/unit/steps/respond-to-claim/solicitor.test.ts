jest.mock('../../../../main/modules/steps/i18n', () => ({
  loadStepNamespace: jest.fn(),
  getStepTranslations: jest.fn(() => ({})),
  getTranslationFunction: jest.fn(() => (key: string) => key),
}));

jest.mock('../../../../main/modules/steps/flow', () => ({
  stepNavigation: {
    getBackUrl: jest.fn(async () => null),
    getNextStepUrl: jest.fn(async () => '/next-step'),
  },
  createStepNavigation: jest.fn(() => ({
    getBackUrl: jest.fn(async () => '/previous-step'),
    getNextStepUrl: jest.fn(async () => '/next-step'),
  })),
}));

jest.mock('../../../../main/steps/utils/buildDraftDefendantResponse', () => ({
  buildDraftDefendantResponse: jest.fn(),
  saveDraftDefendantResponse: jest.fn(),
}));

import { step } from '../../../../main/steps/respond-to-claim/solicitor';

describe('solicitor isAnswered', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reqWith = (validatedCase: Record<string, unknown>): any => ({ res: { locals: { validatedCase } } });

  it('is answered when hasSolicitor is set to YES', () => {
    expect(step.isAnswered?.(reqWith({ defendantResponses: { hasSolicitor: 'YES' } }))).toBe(true);
  });

  it('is answered when hasSolicitor is set to NO', () => {
    expect(step.isAnswered?.(reqWith({ defendantResponses: { hasSolicitor: 'NO' } }))).toBe(true);
  });

  it('is NOT answered when hasSolicitor is unset', () => {
    expect(step.isAnswered?.(reqWith({ defendantResponses: {} }))).toBe(false);
  });

  it('is NOT answered when nothing is set', () => {
    expect(step.isAnswered?.(reqWith({}))).toBe(false);
  });
});
