import type { PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { createFreeLegalAdviceBase, mapFromCcdEnum, mapToCcdEnum } from '../../common/freeLegalAdviceBase';
import { flowConfig } from '../flow.config';
import { isProfessionalJourney } from '../../utils/isProfessionalJourney';

export const step: StepDefinition = createFreeLegalAdviceBase({
  flowConfig,
  customTemplate: req =>
    !isProfessionalJourney(req) ? `${__dirname}/freeLegalAdvice-professional.njk` : `${__dirname}/freeLegalAdvice.njk`,
  beforeRedirect: async req => {
    const hadLegalAdvice = req.body?.hadLegalAdvice as string | undefined;
    if (!hadLegalAdvice) return;

    const ccdValue = mapToCcdEnum(hadLegalAdvice);
    if (!ccdValue) return;

    const payload: PossessionClaimResponse = {
      defendantResponses: {
        freeLegalAdvice: ccdValue,
      },
    };

    await buildCcdCaseForPossessionClaimResponse(req, payload);
  },
  getInitialFormData: req => {
    const caseData = req.res?.locals?.validatedCase?.data;

    const existing = caseData?.possessionClaimResponse?.defendantResponses?.freeLegalAdvice;

    const formValue = mapFromCcdEnum(existing);

    return formValue ? { hadLegalAdvice: formValue } : {};
  },
});
