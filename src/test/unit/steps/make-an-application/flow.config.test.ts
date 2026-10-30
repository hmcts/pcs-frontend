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
        features: { genAppCuiSetAsideEnabled: true },
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

describe('genapp-cui-set-aside disabled', () => {
  it('hides all Help with Fees steps outside 14 days, including stale answers', () => {
    const req = requestWithFormData({
      'choose-an-application': { typeOfApplication: 'ADJOURN' },
      'is-the-court-hearing-in-the-next-14-days': { hearingInNext14Days: 'no' },
      'do-you-need-help-paying-the-fee': { helpWithFeesNeeded: 'yes' },
    });
    req.res!.locals.features = { genAppCuiSetAsideEnabled: false };
    for (const name of [
      'do-you-need-help-paying-the-fee',
      'have-you-already-applied-for-help-with-fees',
      'you-need-to-apply-for-help-with-your-application-fee',
    ]) {
      expect(flowConfig.steps[name]?.showCondition?.(req)).toBe(false);
    }
  });
});

describe.each([false, true])('existing Help with Fees routes with genapp-cui-set-aside = %s', enabled => {
  it.each(['ADJOURN', 'SET_ASIDE', 'SOMETHING_ELSE'])('preserves Help with Fees for %s', applicationType => {
    const req = requestWithFormData({
      'choose-an-application': { typeOfApplication: applicationType },
      'is-the-court-hearing-in-the-next-14-days': { hearingInNext14Days: 'yes' },
      'do-you-need-help-paying-the-fee': { helpWithFeesNeeded: 'yes' },
      'have-you-already-applied-for-help-with-fees': { alreadyAppliedForHwf: 'no' },
    });
    req.res!.locals.features = { genAppCuiSetAsideEnabled: enabled };
    for (const name of [
      'do-you-need-help-paying-the-fee',
      'have-you-already-applied-for-help-with-fees',
      'you-need-to-apply-for-help-with-your-application-fee',
    ]) {
      expect(flowConfig.steps[name]?.showCondition?.(req)).toBe(true);
    }
  });
});
