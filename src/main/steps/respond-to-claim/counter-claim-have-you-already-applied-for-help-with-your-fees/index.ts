import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CaseData, CcdCounterClaim, YesNoValue } from '@services/ccdCase.interface';

export const step: StepDefinition = createFormStep({
  stepName: 'counter-claim-have-you-already-applied-for-help-with-your-fees',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/counterClaimHaveYouAlreadyAppliedForHelpWithYourFees.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    heading: 'heading',
  },
  fields: [
    {
      name: 'alreadyAppliedForHelp',
      type: 'radio',
      required: true,
      translationKey: { label: 'question' },
      legendClasses: 'govuk-visually-hidden',
      errorMessage: 'errors.alreadyAppliedForHelp',
      options: [
        {
          value: 'yes',
          translationKey: 'options.yes',
          subFields: {
            hwfReference: {
              name: 'hwfReference',
              type: 'text',
              required: true,
              maxLength: 60,
              labelClasses: 'govuk-label--s',
              translationKey: {
                label: 'revealedHwfQuestionLabel',
                hint: 'revealedHwfQuestionHint',
              },
              errorMessage: 'errors.hwfReference',
            },
          },
        },
        {
          value: 'no',
          translationKey: 'options.no',
        },
      ],
    },
  ],
  beforeRedirect: async req => {
    const alreadyAppliedForHelp: string | undefined = req.body?.alreadyAppliedForHelp;

    if (!alreadyAppliedForHelp) {
      return;
    }

    const enumMapping: Record<string, YesNoValue> = {
      yes: 'YES',
      no: 'NO',
    };

    const appliedForHwf = enumMapping[alreadyAppliedForHelp];
    if (!appliedForHwf) {
      return;
    }

    const hwfReference: string | undefined =
      alreadyAppliedForHelp === 'yes'
        ? (req.body?.['alreadyAppliedForHelp.hwfReference'] as string | undefined)
        : undefined;

    const response = buildDraftDefendantResponse(req);
    response.defendantResponses.counterClaim = {
      ...response.defendantResponses.counterClaim,
      appliedForHwf,
      ...(appliedForHwf === 'YES' && { hwfReferenceNumber: hwfReference ?? '' }),
    };

    await saveDraftDefendantResponse(req, response);
  },
  getInitialFormData: req => {
    const caseData: CaseData | undefined = req.res?.locals?.validatedCase?.data;
    const counterClaim: CcdCounterClaim | undefined =
      caseData?.possessionClaimResponse?.defendantResponses?.counterClaim;
    const appliedForHwfCcd: YesNoValue | undefined = counterClaim?.appliedForHwf;

    if (!appliedForHwfCcd) {
      return {};
    }

    if (appliedForHwfCcd === 'YES') {
      return {
        alreadyAppliedForHelp: 'yes',
        'alreadyAppliedForHelp.hwfReference': counterClaim?.hwfReferenceNumber ?? '',
      };
    }

    return { alreadyAppliedForHelp: 'no' };
  },
});
