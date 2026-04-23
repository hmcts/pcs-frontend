import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type {
  CaseData,
  HouseholdCircumstances,
  PossessionClaimResponse,
  YesNoValue,
} from '@services/ccdCase.interface';

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
    paragraph: 'dependantChildrenParagraph',
  },
  beforeRedirect: async req => {
    const dependantChildren: string = req.body?.dependantChildren;

    if (!dependantChildren) {
      return;
    }

    const enumMapping: Record<string, YesNoValue> = {
      yes: 'YES',
      no: 'NO',
    };

    const dependantChildrenCcd = enumMapping[dependantChildren];
    if (!dependantChildrenCcd) {
      return;
    }

    const dependantChildrenDetails: string | undefined =
      dependantChildrenCcd === 'YES' ? req.body?.['dependantChildren.dependantChildrenDetails'] : undefined;

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        householdCircumstances: {
          dependantChildren: dependantChildrenCcd,
          dependantChildrenDetails: dependantChildrenDetails ?? '',
        },
      },
    };
    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
  getInitialFormData: req => {
    const caseData: CaseData | undefined = req.res?.locals?.validatedCase?.data;
    const householdCircumstances: HouseholdCircumstances | undefined =
      caseData?.possessionClaimResponse?.defendantResponses?.householdCircumstances;
    const dependantChildrenCcd: YesNoValue | undefined = householdCircumstances?.dependantChildren;

    if (!dependantChildrenCcd) {
      return {};
    }

    if (dependantChildrenCcd === 'YES') {
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
              labelClasses: 'govuk-label--s',
              errorMessage: 'errors.dependantChildrenDetails',
            },
          },
        },
        { value: 'no', translationKey: 'options.no' },
      ],
    },
  ],
});
