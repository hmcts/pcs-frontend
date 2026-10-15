import { GenAppType } from '../../../../../main/services/ccdCase.interface';
import { doesApplicationFeeApply } from '../../../../../main/steps/make-an-application/check-your-answers';

function visibleFormData(
  applicationType: GenAppType,
  hearingInNext14Days?: 'yes' | 'no',
  otherPartiesAgreed?: 'yes' | 'no'
) {
  return {
    getApplicationTypeField: () => ({ stepName: 'choose-an-application', fieldValue: applicationType }),
    getHearingInNext14DaysField: () =>
      hearingInNext14Days
        ? { stepName: 'is-the-court-hearing-in-the-next-14-days', fieldValue: hearingInNext14Days }
        : undefined,
    getOtherPartiesAgreedField: () =>
      otherPartiesAgreed
        ? { stepName: 'have-the-other-parties-agreed-to-this-application', fieldValue: otherPartiesAgreed }
        : undefined,
  };
}

describe('make-an-application check your answers fee logic', () => {
  it('does not require a fee for adjourn when hearing is not in the next 14 days and parties agreed', () => {
    expect(doesApplicationFeeApply(visibleFormData(GenAppType.ADJOURN, 'no', 'yes'))).toBe(false);
  });

  it('requires a fee for adjourn when hearing is not in the next 14 days and parties did not agree', () => {
    expect(doesApplicationFeeApply(visibleFormData(GenAppType.ADJOURN, 'no', 'no'))).toBe(true);
  });

  it('requires a fee for adjourn when hearing is in the next 14 days', () => {
    expect(doesApplicationFeeApply(visibleFormData(GenAppType.ADJOURN, 'yes', 'yes'))).toBe(true);
  });
});
