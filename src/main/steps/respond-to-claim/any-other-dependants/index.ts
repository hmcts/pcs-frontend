import type {
  CaseData,
  HouseholdCircumstances,
  PossessionClaimResponse,
  YesNoValue,
} from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'do-you-have-any-other-dependants',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/anyOtherDependants.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    paragraph: 'otherDependantsParagraph',
  },
  beforeRedirect: async req => {
    const otherDependants: string = req.body?.otherDependants;

    if (!otherDependants) {
      return;
    }

    const enumMapping: Record<string, YesNoValue> = {
      yes: 'YES',
      no: 'NO',
    };

    const otherDependantsCcd = enumMapping[otherDependants];
    if (!otherDependantsCcd) {
      return;
    }

    const otherDependantDetails: string | undefined =
      otherDependantsCcd === 'YES' ? req.body?.['otherDependants.otherDependantDetails'] : undefined;

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        householdCircumstances: {
          otherDependants: otherDependantsCcd,
          otherDependantDetails: otherDependantDetails ?? '',
        },
      },
    };
    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
  getInitialFormData: req => {
    const caseData: CaseData | undefined = req.res?.locals?.validatedCase?.data;
    const householdCircumstances: HouseholdCircumstances | undefined =
      caseData?.possessionClaimResponse?.defendantResponses?.householdCircumstances;
    const otherDependantsCcd: YesNoValue | undefined = householdCircumstances?.otherDependants;

    if (!otherDependantsCcd) {
      return {};
    }

    if (otherDependantsCcd === 'YES') {
      const otherDependantDetails: string | undefined = householdCircumstances?.otherDependantDetails;
      return {
        otherDependants: 'yes',
        'otherDependants.otherDependantDetails': otherDependantDetails ?? '',
      };
    }

    return { otherDependants: 'no' };
  },
  fields: [
    {
      name: 'otherDependants',
      type: 'radio',
      required: true,
      legendClasses: 'govuk-visually-hidden',
      translationKey: {
        label: 'heading',
      },
      errorMessage: 'errors.otherDependants',
      options: [
        {
          value: 'yes',
          translationKey: 'options.yes',
          subFields: {
            otherDependantDetails: {
              name: 'otherDependantDetails',
              type: 'character-count',
              required: true,
              maxLength: 500,
              translationKey: {
                label: 'otherDependantDetailsLabel',
                hint: 'otherDependantDetailsHint',
              },
              labelClasses: 'govuk-label--s',
              errorMessage: 'errors.otherDependantDetails',
            },
          },
        },
        { value: 'no', translationKey: 'options.no' },
      ],
    },
  ],
});
