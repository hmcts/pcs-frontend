import { fromYesNoEnum, getValidatedCaseHouseholdCircumstances, toYesNoEnum } from '../../utils';
import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

const STEP_NAME = 'priority-debts';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: STEP_NAME,
  isAnswered: req => Boolean(req.res?.locals.validatedCase?.defendantResponses?.householdCircumstances?.priorityDebts),
  stepDir: __dirname,
  beforeRedirect: async req => {
    const selection = req.body?.havePriorityDebts as string | undefined;
    if (selection !== 'yes' && selection !== 'no') {
      return;
    }

    const response = buildDraftDefendantResponse(req);
    response.defendantResponses.householdCircumstances = response.defendantResponses.householdCircumstances ?? {};
    response.defendantResponses.householdCircumstances.priorityDebts = toYesNoEnum(selection);

    await saveDraftDefendantResponse(req, response);
  },
  getInitialFormData: req => {
    const selection = fromYesNoEnum(getValidatedCaseHouseholdCircumstances(req)?.priorityDebts);
    return selection ? { havePriorityDebts: selection } : {};
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
