import type { Request } from 'express';

import { validateAmount } from '../../../constants/validation';
import { currency } from '../../../modules/nunjucks/filters/currency';
import { getTranslation, getTranslationFunction } from '../../../modules/steps';
import { fromYesNoNotSureEnum, penceToPounds, poundsToPence, toYesNoNotSureEnum } from '../../utils';
import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { isRelease12Enabled } from '../../utils/isRelease12Enabled';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'rent-arrears-dispute',
  isAnswered: req => Boolean(req.res?.locals.validatedCase?.defendantResponses?.rentArrearsAmountConfirmation),
  stepDir: __dirname,
  customTemplate: `${__dirname}/rentArrearsDispute.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    rentStatementDocumentLinkText: 'rentStatementDocumentLinkText',
  },
  beforeRedirect: async req => {
    const response = buildDraftDefendantResponse(req);
    const rentArrears = req.body?.rentArrears as string | undefined;
    const enumValue = toYesNoNotSureEnum(rentArrears);

    if (enumValue) {
      response.defendantResponses.rentArrearsAmountConfirmation = enumValue;

      if (rentArrears === 'no') {
        const amountInPence = poundsToPence(
          req.body?.['rentArrears.rentArrearsAmountCorrection'] as string | undefined
        );
        if (amountInPence !== undefined) {
          response.defendantResponses.rentArrearsAmount = amountInPence;
        }
      } else {
        delete response.defendantResponses.rentArrearsAmount;
      }
    } else {
      delete response.defendantResponses.rentArrearsAmountConfirmation;
      delete response.defendantResponses.rentArrearsAmount;
    }

    await saveDraftDefendantResponse(req, response);
  },
  getInitialFormData: (req: Request) => {
    const caseData = req.res?.locals.validatedCase?.data;
    const response = caseData?.possessionClaimResponse?.defendantResponses;
    const formValue = fromYesNoNotSureEnum(response?.rentArrearsAmountConfirmation);

    if (!formValue) {
      return {};
    }

    const formData: Record<string, unknown> = { rentArrears: formValue };

    if (formValue === 'no' && response?.rentArrearsAmount) {
      // dotted notation matches subField rendering pattern
      formData['rentArrears.rentArrearsAmountCorrection'] = penceToPounds(response.rentArrearsAmount as string);
    }

    return formData;
  },
  extendGetContent: (req: Request) => {
    const caseData = req.res?.locals.validatedCase?.data;
    const claimantName = caseData?.possessionClaimResponse?.claimantOrganisations?.[0]?.value;
    const amountInPence = (caseData?.rentArrears_Total as string | number) || 0;
    const amountInPounds = typeof amountInPence === 'string' ? parseFloat(amountInPence) / 100 : amountInPence / 100;
    const rentArrearsAmount = currency(amountInPounds);

    const t = getTranslationFunction(req);

    const insetIntroText = getTranslation(t, 'insetIntroText', '') ?? '';
    const insetDetailsText = getTranslation(t, 'insetDetailsText', '', { claimantName }) ?? '';
    const amountOwedHeading = t('amountOwedHeading', { claimantName });
    const rentArrearsAmountCorrection = t('rentArrearsAmountCorrection');

    const rentStatementDocument = caseData?.detailsTab_RentArrearsDetails?.rentStatement?.[0] ?? '';
    const release12Enabled = isRelease12Enabled(req);

    return {
      insetIntroText,
      insetDetailsText,
      amountOwedHeading,
      rentArrearsAmount,
      rentArrearsAmountCorrection,
      rentStatementDocument,
      isRelease12Enabled: release12Enabled,
    };
  },
  fields: [
    {
      name: 'rentArrears',
      type: 'radio',
      required: true,
      translationKey: {
        label: 'rentArrearsQuestion',
      },
      legendClasses: 'govuk-fieldset__legend--m',
      options: [
        {
          value: 'yes',
          translationKey: 'rentArrearsOptions.yes',
        },
        {
          value: 'no',
          translationKey: 'rentArrearsOptions.no',
          subFields: {
            rentArrearsAmountCorrection: {
              name: 'rentArrearsAmountCorrection',
              type: 'text',
              required: true,
              translationKey: {
                label: 'rentArrearsAmountCorrection.label',
                hint: 'rentArrearsAmountCorrection.hint',
              },
              classes: 'govuk-input--width-10',
              prefix: {
                text: '£',
              },
              attributes: {
                inputmode: 'decimal',
                spellcheck: false,
              },
              validator: (value: unknown): boolean | string =>
                validateAmount(value, {
                  invalidAmountFormatError: 'errors.rentArrearsAmountCorrection.invalidFormat',
                  minAmountError: 'errors.rentArrearsAmountCorrection.negativeAmount',
                  maxAmountError: 'errors.rentArrearsAmountCorrection.largeAmount',
                }),
            },
          },
        },
        { divider: 'rentArrearsOptions.or', translationKey: 'rentArrearsOptions.or' },
        { value: 'notSure', translationKey: 'rentArrearsOptions.notSure' },
      ],
    },
  ],
});
