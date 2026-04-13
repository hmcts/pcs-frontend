import type { CaseData, HouseholdCircumstances, YesNoValue } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { getDraftDefendantResponse } from '../../utils/getDraftDefendantResponse';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import { ccdCaseService } from '@services/ccdCaseService';

export const step: StepDefinition = createFormStep({
  stepName: 'do-you-have-any-other-dependants',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/anyOtherDependants.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    caption: 'caption',
    paragraph: 'otherDependantsParagraph',
  },
  beforeRedirect: async req => {
    const response = getDraftDefendantResponse(req);
    response.defendantResponses.householdCircumstances = response.defendantResponses.householdCircumstances ?? {};
    const otherDependants: string = req.body?.otherDependants;
    const enumMapping: Record<string, YesNoValue> = { yes: 'Yes', no: 'No' };
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

    await ccdCaseService.saveDraftDefendantResponse(
      req.session?.user?.accessToken,
      req.res?.locals.validatedCase?.id,
      response
    );
  },
  getInitialFormData: req => {
    const caseData: CaseData | undefined = req.res?.locals?.validatedCase?.data;
    const householdCircumstances: HouseholdCircumstances | undefined =
      caseData?.possessionClaimResponse?.defendantResponses?.householdCircumstances;
    const otherDependantsCcd: YesNoValue | undefined = householdCircumstances?.otherDependants;

    if (!otherDependantsCcd) {
      return {};
    }

    if (otherDependantsCcd === 'Yes') {
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
