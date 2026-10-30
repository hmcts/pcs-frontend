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
  describe.each([false, true])('genapp-cui-set-aside = %s', genAppCuiSetAsideEnabled => {
    it.each([
      ['yes', 'yes', true],
      ['yes', 'no', true],
      ['no', 'yes', false],
      ['no', 'no', genAppCuiSetAsideEnabled],
    ] as const)('adjourn: within 14 days = %s, consent = %s, fee = %s', (within14Days, consent, expected) => {
      expect(
        doesApplicationFeeApply(visibleFormData(GenAppType.ADJOURN, within14Days, consent), genAppCuiSetAsideEnabled)
      ).toBe(expected);
    });

    it.each([GenAppType.SET_ASIDE, GenAppType.SOMETHING_ELSE])('keeps the fee for %s', applicationType => {
      expect(doesApplicationFeeApply(visibleFormData(applicationType), genAppCuiSetAsideEnabled)).toBe(true);
    });
  });
});
