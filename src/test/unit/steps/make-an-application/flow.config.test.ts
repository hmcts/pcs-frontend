import type { Request } from 'express';

import { flowConfig } from '../../../../main/steps/make-an-application/flow.config';

function requestWithFormData(formData: Record<string, Record<string, unknown>>): Request {
  return {
    session: {
      formData: {
        makeAnApplication: {
          '1111222233334444': formData,
        },
      },
    },
    params: { caseReference: '1111222233334444' },
    res: {
      locals: {
        step: { journey: 'makeAnApplication' },
        validatedCase: { id: '1111222233334444' },
      },
    },
  } as unknown as Request;
}

describe('make-an-application flow config', () => {
  it('shows the Help with Fees question for adjourn applications when hearing is not in the next 14 days', () => {
    const req = requestWithFormData({
      'choose-an-application': { typeOfApplication: 'ADJOURN' },
      'is-the-court-hearing-in-the-next-14-days': { hearingInNext14Days: 'no' },
    });

    expect(flowConfig.steps['do-you-need-help-paying-the-fee']?.showCondition?.(req)).toBe(true);
  });

  it('continues to show the existing Help with Fees follow-up when help is needed', () => {
    const req = requestWithFormData({
      'choose-an-application': { typeOfApplication: 'ADJOURN' },
      'is-the-court-hearing-in-the-next-14-days': { hearingInNext14Days: 'no' },
      'do-you-need-help-paying-the-fee': { helpWithFeesNeeded: 'yes' },
    });

    expect(flowConfig.steps['have-you-already-applied-for-help-with-fees']?.showCondition?.(req)).toBe(true);
  });
});
