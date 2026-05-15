import { fromYesNoEnum } from '../../utils';
import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'do-any-other-adults-live-in-your-home',
  stepDir: __dirname,
  customTemplate: `${__dirname}/otherAdults.njk`,
  translationKeys: {
    question: 'question',
    pageTitle: 'pageTitle',
    dependantHeading: 'dependantHeading',
    dependantQuestion: 'dependantQuestion',
    heading: 'heading',
  },
  fields: [
    {
      name: 'confirmOtherAdults',
      type: 'radio',
      required: true,
      isPageHeading: true,
      legendClasses: 'govuk-fieldset__legend--l',
      translationKey: {
        label: 'question',
      },
      options: [
        {
          value: 'yes',
          translationKey: 'options.yes',
          subFields: {
            otherAdultsDetails: {
              name: 'otherAdultsDetails',
              type: 'character-count',
              maxLength: 500,
              required: true,
              errorMessage: 'errors.otherAdultsDetails',
              labelClasses: 'govuk-label--s govuk-!-font-weight-bold',
              translationKey: {
                label: 'textAreaLabel',
                hint: 'textAreaHintText',
              },
            },
          },
        },
        { value: 'no', translationKey: 'options.no' },
      ],
    },
  ],
  getInitialFormData: req => {
    const hc = req.res?.locals?.validatedCase?.possessionClaimResponse?.defendantResponses?.householdCircumstances;
    // CCD round-trips YesOrNo PascalCase ("Yes"/"No") since pcs-api PR #1678, so a strict
    // `=== 'YES'` compare here would mis-prefill the form as "no" on revisit and the
    // otherTenantsDetails textarea pre-fill below would never run.
    const otherTenantsForm = fromYesNoEnum(hc?.otherTenants);

    if (!otherTenantsForm) {
      return {};
    }

    if (otherTenantsForm === 'yes') {
      return {
        confirmOtherAdults: 'yes',
        'confirmOtherAdults.otherAdultsDetails': hc?.otherTenantsDetails ?? '',
      };
    }

    return { confirmOtherAdults: 'no' };
  },
  beforeRedirect: async req => {
    const confirmValue = req.body?.confirmOtherAdults as string | undefined;

    const response = buildDraftDefendantResponse(req);
    response.defendantResponses.householdCircumstances = response.defendantResponses.householdCircumstances ?? {};

    if (confirmValue === 'yes' || confirmValue === 'no') {
      response.defendantResponses.householdCircumstances.otherTenants = confirmValue === 'yes' ? 'YES' : 'NO';

      if (confirmValue === 'yes') {
        response.defendantResponses.householdCircumstances.otherTenantsDetails = req.body?.[
          'confirmOtherAdults.otherAdultsDetails'
        ] as string | undefined;
      } else {
        delete response.defendantResponses.householdCircumstances.otherTenantsDetails;
      }
    } else {
      delete response.defendantResponses.householdCircumstances.otherTenants;
      delete response.defendantResponses.householdCircumstances.otherTenantsDetails;
    }

    await saveDraftDefendantResponse(
      req,

      response
    );
  },
});
