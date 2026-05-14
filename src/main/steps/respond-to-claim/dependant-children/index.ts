import { fromYesNoEnum } from '../../utils';
import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CaseData, HouseholdCircumstances, YesNoValue } from '@services/ccdCase.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'do-you-have-any-dependant-children',
  stepDir: __dirname,
  customTemplate: `${__dirname}/dependantChildren.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    caption: 'caption',
    paragraph: 'dependantChildrenParagraph',
    dependantHeading: 'dependantHeading',
    dependantQuestion: 'dependantQuestion',
  },
  beforeRedirect: async req => {
    const response = buildDraftDefendantResponse(req);
    response.defendantResponses.householdCircumstances = response.defendantResponses.householdCircumstances ?? {};
    const dependantChildren: string = req.body?.dependantChildren;
    const enumMapping: Record<string, YesNoValue> = { yes: 'YES', no: 'NO' };
    const dependantChildrenCcd = enumMapping[dependantChildren];

    if (dependantChildrenCcd) {
      response.defendantResponses.householdCircumstances.dependantChildren = dependantChildrenCcd;

      if (dependantChildren === 'yes') {
        response.defendantResponses.householdCircumstances.dependantChildrenDetails = req.body?.[
          'dependantChildren.dependantChildrenDetails'
        ] as string | undefined;
      } else {
        delete response.defendantResponses.householdCircumstances.dependantChildrenDetails;
      }
    } else {
      delete response.defendantResponses.householdCircumstances.dependantChildren;
      delete response.defendantResponses.householdCircumstances.dependantChildrenDetails;
    }

    await saveDraftDefendantResponse(
      req,

      response
    );
  },
  getInitialFormData: req => {
    const caseData: CaseData | undefined = req.res?.locals?.validatedCase?.data;
    const householdCircumstances: HouseholdCircumstances | undefined =
      caseData?.possessionClaimResponse?.defendantResponses?.householdCircumstances;
    // CCD round-trips YesOrNo PascalCase ("Yes"/"No") since pcs-api PR #1678, so a strict
    // `=== 'YES'` compare here would mis-prefill the form as "no" on revisit and
    // silently overwrite the stored YES on resubmit. fromYesNoEnum handles either casing.
    const dependantChildrenForm = fromYesNoEnum(householdCircumstances?.dependantChildren);

    if (!dependantChildrenForm) {
      return {};
    }

    if (dependantChildrenForm === 'yes') {
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
