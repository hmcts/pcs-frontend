import { fromYesNoEnum } from '../../utils';
import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CaseData, HouseholdCircumstances, YesNoValue } from '@services/ccdCase.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'do-you-have-any-other-dependants',
  stepDir: __dirname,
  customTemplate: `${__dirname}/anyOtherDependants.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    paragraph: 'otherDependantsParagraph',
    dependantQuestion: 'dependantQuestion',
  },
  beforeRedirect: async req => {
    const response = buildDraftDefendantResponse(req);
    response.defendantResponses.householdCircumstances = response.defendantResponses.householdCircumstances ?? {};
    const otherDependants: string = req.body?.otherDependants;
    const enumMapping: Record<string, YesNoValue> = { yes: 'YES', no: 'NO' };
    const otherDependantsCcd = enumMapping[otherDependants];

    if (otherDependantsCcd) {
      response.defendantResponses.householdCircumstances.otherDependants = otherDependantsCcd;

      if (otherDependants === 'yes') {
        response.defendantResponses.householdCircumstances.otherDependantDetails = req.body?.[
          'otherDependants.otherDependantDetails'
        ] as string | undefined;
      } else {
        delete response.defendantResponses.householdCircumstances.otherDependantDetails;
      }
    } else {
      delete response.defendantResponses.householdCircumstances.otherDependants;
      delete response.defendantResponses.householdCircumstances.otherDependantDetails;
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
    // `=== 'YES'` compare here would mis-prefill the form as "no" on revisit and the
    // textarea pre-fill below would never run. fromYesNoEnum handles either casing.
    const otherDependantsForm = fromYesNoEnum(householdCircumstances?.otherDependants);

    if (!otherDependantsForm) {
      return {};
    }

    if (otherDependantsForm === 'yes') {
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
