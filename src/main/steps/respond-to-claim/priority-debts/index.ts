import type { PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { fromYesNoEnum, toYesNoEnum } from '../../utils';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'priority-debts',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  beforeRedirect: async req => {
    const selection = req.body?.havePriorityDebts as string | undefined;
    if (selection !== 'yes' && selection !== 'no') {
      throw new Error('Missing or invalid priority debts selection submitted');
    }

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        householdCircumstances: {
          priorityDebts: toYesNoEnum(selection),
        },
      },
    };
    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
  getInitialFormData: req => {
    const priorityDebts = (
      req.res?.locals?.validatedCase?.data as
        | {
            possessionClaimResponse?: {
              defendantResponses?: {
                householdCircumstances?: { priorityDebts?: string };
              };
            };
          }
        | undefined
    )?.possessionClaimResponse?.defendantResponses?.householdCircumstances?.priorityDebts;

    if (fromYesNoEnum(priorityDebts) === 'yes') {
      return { havePriorityDebts: 'yes' };
    }
    if (fromYesNoEnum(priorityDebts) === 'no') {
      return { havePriorityDebts: 'no' };
    }
    return {};
  },
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    paragraph1: 'paragraph1',
    paragraph2: 'paragraph2',
    councilTaxArrears: 'councilTaxArrears',
    gasOrElectricityArrears: 'gasOrElectricityArrears',
    phoneOrInternetArrears: 'phoneOrInternetArrears',
    tvLicenceArrears: 'tvLicenceArrears',
    courtFines: 'courtFines',
    overpaidTaxCredits: 'overpaidTaxCredits',
    hirePurchaseOrConditionalSalePayments: 'hirePurchaseOrConditionalSalePayments',
    unpaidIncomeTaxNationalInsuranceOrVat: 'unpaidIncomeTaxNationalInsuranceOrVat',
    unpaidChildMaintenance: 'unpaidChildMaintenance',
    guidanceLinkText: 'guidanceLinkText',
  },
  fields: [
    {
      name: 'havePriorityDebts',
      type: 'radio',
      required: true,
      legendClasses: 'govuk-fieldset__legend--m',
      translationKey: { label: 'question' },
      errorMessage: 'errors.havePriorityDebts',
      options: [
        { value: 'yes', translationKey: 'common:options.yes' },
        { value: 'no', translationKey: 'common:options.no' },
      ],
    },
  ],
  customTemplate: `${__dirname}/priorityDebts.njk`,
});
