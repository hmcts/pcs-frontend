import type { Request } from 'express';

import { createFormStep } from '../../../modules/steps';
import { buildDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { flowConfig } from '../flow.config';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { YesNoNotSureValue } from '@services/ccdCase.interface';
import { ccdCaseService } from '@services/ccdCaseService';

export const step: StepDefinition = createFormStep({
  stepName: 'repayments-agreed',
  journeyFolder: 'respondToClaim',
  showCancelButton: false,
  stepDir: __dirname,
  flowConfig,
  beforeRedirect: async req => {
    const response = buildDraftDefendantResponse(req);
    response.defendantResponses.paymentAgreement = response.defendantResponses.paymentAgreement ?? {};
    const repaymentsAgreed = req.body?.repaymentsAgreed as string | undefined;
    const enumMapping: Record<string, YesNoNotSureValue> = { yes: 'YES', no: 'NO', imNotSure: 'NOT_SURE' };

    if (repaymentsAgreed && enumMapping[repaymentsAgreed]) {
      response.defendantResponses.paymentAgreement.repaymentPlanAgreed = enumMapping[repaymentsAgreed];

      if (repaymentsAgreed === 'yes') {
        response.defendantResponses.paymentAgreement.repaymentAgreedDetails = req.body?.[
          'repaymentsAgreed.repaymentsAgreedDetails'
        ] as string | undefined;
      } else {
        delete response.defendantResponses.paymentAgreement.repaymentAgreedDetails;
      }
    } else {
      delete response.defendantResponses.paymentAgreement.repaymentPlanAgreed;
      delete response.defendantResponses.paymentAgreement.repaymentAgreedDetails;
    }

    await ccdCaseService.saveDraftDefendantResponse(
      req.session?.user?.accessToken,
      req.res?.locals.validatedCase?.id || '',
      response
    );
  },
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
  },
  getInitialFormData: (req: Request) => {
    const caseData = req.res?.locals?.validatedCase?.data;
    const paymentAgreement = caseData?.possessionClaimResponse?.defendantResponses?.paymentAgreement;
    const repaymentPlanAgreed = paymentAgreement?.repaymentPlanAgreed;
    const repaymentAgreedDetails = paymentAgreement?.repaymentAgreedDetails;

    const formValue =
      repaymentPlanAgreed === 'YES'
        ? 'yes'
        : repaymentPlanAgreed === 'NO'
          ? 'no'
          : repaymentPlanAgreed === 'NOT_SURE'
            ? 'imNotSure'
            : undefined;

    if (formValue === undefined) {
      return {};
    }

    const initial: Record<string, unknown> = { repaymentsAgreed: formValue };

    if (formValue === 'yes' && repaymentAgreedDetails) {
      initial['repaymentsAgreed.repaymentsAgreedDetails'] = repaymentAgreedDetails;
    }

    return initial;
  },
  extendGetContent: (req: Request) => {
    const caseData = req.res?.locals?.validatedCase?.data;
    const claimantName = (caseData?.possessionClaimResponse?.claimantOrganisations?.[0]?.value as string) ?? '';
    const claimIssueDate = '20th May 2025';

    return {
      claimantName,
      claimIssueDate,
    };
  },
  fields: [
    {
      name: 'repaymentsAgreed',
      type: 'radio',
      required: true,
      isPageHeading: true,
      translationKey: { label: 'heading' },
      legendClasses: 'govuk-fieldset__legend--l',
      options: [
        {
          value: 'yes',
          translationKey: 'options.yes',
          subFields: {
            repaymentsAgreedDetails: {
              name: 'repaymentsAgreedDetails',
              type: 'character-count',
              maxLength: 500,
              required: true,
              isPageHeading: false,
              labelClasses: 'govuk-label--s govuk-!-font-weight-bold',
              translationKey: {
                label: 'textAreaLabel',
              },
              validator: (value: unknown) => {
                const text = (value as string)?.trim();
                const allowedCharsRegex = /^[^\p{Emoji_Presentation}\p{Extended_Pictographic}]+$/u;

                if (allowedCharsRegex.test(text)) {
                  return true;
                }
                return 'errors.repaymentsAgreed.repaymentsAgreedDetails.invalid';
              },
            },
          },
        },
        { value: 'no', translationKey: 'options.no' },
        { divider: 'options.or' },
        { value: 'imNotSure', translationKey: 'options.imNotSure' },
      ],
    },
  ],
  customTemplate: `${__dirname}/repaymentsAgreed.njk`,
});
