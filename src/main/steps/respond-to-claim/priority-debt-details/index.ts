import { AMOUNT_FORMAT_REGEX } from '../../../constants/validation';
import type { FrequencyValue } from '../../../services/ccdCase.interface';
import { ccdPenceToPoundsString, getValidatedCaseHouseholdCircumstances, poundsStringToPence } from '../../utils';
import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

const MAX_AMOUNT = 1_000_000_000;
type FrequencyFormValue = Lowercase<FrequencyValue>;
const FREQUENCY_MAP: Record<FrequencyValue, FrequencyFormValue> = {
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
};

const validateMoney =
  (negativeKey: string, largeKey: string) =>
  (value: unknown): boolean | string => {
    if (typeof value !== 'string' || !value.trim()) {
      return true;
    }
    const normalized = value.trim().split(',').join('');
    const numericValue = parseFloat(normalized);

    if (!Number.isNaN(numericValue)) {
      if (numericValue < 0) {
        return negativeKey;
      }
      if (numericValue >= MAX_AMOUNT) {
        return largeKey;
      }
    }

    if (!AMOUNT_FORMAT_REGEX.test(normalized)) {
      return 'errors.amount.invalidFormat';
    }

    if (Number.isNaN(numericValue)) {
      return 'errors.amount.invalidFormat';
    }
    return true;
  };

export const step: StepDefinition = createFormStep({
  stepName: 'priority-debt-details',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  beforeRedirect: async req => {
    const total = req.body?.priorityDebtTotal as string | undefined;
    const contribution = req.body?.priorityDebtContribution as string | undefined;
    const frequency = req.body?.priorityDebtContributionFrequency as FrequencyFormValue | undefined;

    const response = buildDraftDefendantResponse(req);
    response.defendantResponses.householdCircumstances = response.defendantResponses.householdCircumstances ?? {};
    const hc = response.defendantResponses.householdCircumstances;

    if (typeof total === 'string' && total.trim()) {
      const pence = poundsStringToPence(total);
      if (pence !== undefined) {
        hc.debtTotal = String(pence);
      } else {
        delete hc.debtTotal;
      }
    } else {
      delete hc.debtTotal;
    }

    if (typeof contribution === 'string' && contribution.trim()) {
      const pence = poundsStringToPence(contribution);
      if (pence !== undefined) {
        hc.debtContribution = String(pence);
      } else {
        delete hc.debtContribution;
      }
    } else {
      delete hc.debtContribution;
    }

    if (frequency === 'weekly' || frequency === 'monthly') {
      hc.debtContributionFrequency = frequency.toUpperCase() as FrequencyValue;
    } else {
      delete hc.debtContributionFrequency;
    }

    await saveDraftDefendantResponse(req, response);
  },
  getInitialFormData: req => {
    const householdCircumstances = getValidatedCaseHouseholdCircumstances(req) as
      | {
          debtTotal?: unknown;
          debtContribution?: unknown;
          debtContributionFrequency?: FrequencyValue;
        }
      | undefined;

    const priorityDebtTotal = ccdPenceToPoundsString(householdCircumstances?.debtTotal);
    const priorityDebtContribution = ccdPenceToPoundsString(householdCircumstances?.debtContribution);
    const priorityDebtContributionFrequencyRaw = householdCircumstances?.debtContributionFrequency;
    const normalizedFrequency = priorityDebtContributionFrequencyRaw?.toUpperCase();
    const priorityDebtContributionFrequency =
      normalizedFrequency === 'WEEKLY' || normalizedFrequency === 'MONTHLY'
        ? FREQUENCY_MAP[normalizedFrequency]
        : undefined;

    return {
      ...(priorityDebtTotal ? { priorityDebtTotal } : {}),
      ...(priorityDebtContribution ? { priorityDebtContribution } : {}),
      ...(priorityDebtContributionFrequency ? { priorityDebtContributionFrequency } : {}),
    };
  },
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
  },
  fields: [
    {
      name: 'priorityDebtTotal',
      type: 'text',
      required: true,
      translationKey: {
        label: 'totalQuestion',
        hint: 'amountHint',
      },
      labelClasses: 'govuk-label--s',
      formGroupClasses: 'govuk-!-margin-bottom-2',
      hintClasses: 'govuk-!-margin-bottom-1',
      errorMessage: 'errors.priorityDebtTotal',
      prefix: { text: '£' },
      classes: 'govuk-input--width-10',
      attributes: { inputmode: 'decimal' },
      validator: validateMoney('errors.priorityDebtTotalMin', 'errors.priorityDebtTotalMax'),
    },
    {
      name: 'priorityDebtContribution',
      type: 'text',
      required: true,
      translationKey: {
        label: 'contributionQuestion',
        hint: 'amountHint',
      },
      labelClasses: 'govuk-label--s',
      formGroupClasses: 'govuk-!-margin-bottom-2',
      hintClasses: 'govuk-!-margin-bottom-1',
      errorMessage: 'errors.priorityDebtContribution',
      prefix: { text: '£' },
      classes: 'govuk-input--width-10',
      attributes: { inputmode: 'decimal' },
      validator: validateMoney('errors.priorityDebtContributionMin', 'errors.priorityDebtContributionMax'),
    },
    {
      name: 'priorityDebtContributionFrequency',
      type: 'radio',
      required: true,
      classes: 'priority-debt-details-paid-every-radios',
      translationKey: { label: 'frequencyQuestion' },
      errorMessage: 'errors.priorityDebtContributionFrequency',
      options: [
        { value: 'weekly', translationKey: 'frequency.week' },
        { value: 'monthly', translationKey: 'frequency.month' },
      ],
    },
  ],
  customTemplate: `${__dirname}/priorityDebtDetails.njk`,
});
