import type { CaseData , HouseholdCircumstances, PossessionClaimResponse, YesNoCapitalised } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'do-you-have-any-dependant-children',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/dependantChildren.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    caption: 'caption',
  },
  beforeRedirect: async req => {
    const dependantChildren: string = req.body?.dependantChildren;

    if (!dependantChildren) {
      return;
    }

    const enumMapping: Record<string, YesNoCapitalised> = {
      yes: 'Yes',
      no: 'No',
    };

    const dependantChildrenCcd = enumMapping[dependantChildren];
    if (!dependantChildrenCcd) {
      return;
    }

    const dependantChildrenDetails: string | undefined =
      dependantChildrenCcd === 'Yes' ? req.body?.['dependantChildren.dependantChildrenDetails'] : undefined;

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        householdCircumstances: {
          dependantChildren: dependantChildrenCcd,
          dependantChildrenDetails: dependantChildrenDetails ?? '',
        },
      },
    };
    console.log('Possession claim response to save to CCD', possessionClaimResponse);
    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
  getInitialFormData: req => {
    const caseData: CaseData | undefined = req.res?.locals?.validatedCase?.data;
    const householdCircumstances: HouseholdCircumstances | undefined =
      caseData?.possessionClaimResponse?.defendantResponses?.householdCircumstances;
    console.log('Household circumstances from CCD', householdCircumstances);
    const dependantChildrenCcd: YesNoCapitalised | undefined = householdCircumstances?.dependantChildren;

    if (!dependantChildrenCcd) {
      return {};
    }

    if (dependantChildrenCcd === 'Yes') {
      const dependantChildrenDetails: string | undefined = householdCircumstances?.dependantChildrenDetails;
      return {
        dependantChildren: 'yes',
        'dependantChildren.dependantChildrenDetails': dependantChildrenDetails ?? '',
      };
    }

    return { dependantChildren: 'no' };
  },
  fields: [
    {
      name: 'dependantChildren',
      type: 'radio',
      required: true,
      legendClasses: 'govuk-visually-hidden',
      translationKey: {
        label: 'heading',
        hint: 'dependantChildrenHint',
      },
      errorMessage: 'errors.dependantChildren',
      options: [
        {
          value: 'yes',
          translationKey: 'options.yes',
          subFields: {
            dependantChildrenDetails: {
              name: 'dependantChildrenDetails',
              type: 'character-count',
              required: true,
              maxLength: 500,
              translationKey: {
                label: 'dependantChildrenDetailsLabel',
                hint: 'dependantChildrenDetailsHint',
              },
              attributes: {
                rows: 5,
              },
              errorMessage: 'errors.dependantChildrenDetails',
            },
          },
        },
        { value: 'no', translationKey: 'options.no' },
      ],
    },
  ],
});
