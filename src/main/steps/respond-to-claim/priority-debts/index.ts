import { fromYesNoEnum, getValidatedCaseHouseholdCircumstances, toYesNoEnum } from '../../utils';
import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

const STEP_NAME = 'priority-debts';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: STEP_NAME,
  stepDir: __dirname,
  beforeRedirect: async req => {
    const selection = req.body?.havePriorityDebts as string | undefined;
    if (selection !== 'yes' && selection !== 'no') {
      throw new Error('Missing or invalid priority debts selection submitted');
    }

    const response = buildDraftDefendantResponse(req);
    response.defendantResponses.householdCircumstances = response.defendantResponses.householdCircumstances ?? {};
    response.defendantResponses.householdCircumstances.priorityDebts = toYesNoEnum(selection);

    await saveDraftDefendantResponse(req, response);
  },
  getInitialFormData: req => {
    const priorityDebts = getValidatedCaseHouseholdCircumstances(req)?.priorityDebts;

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
