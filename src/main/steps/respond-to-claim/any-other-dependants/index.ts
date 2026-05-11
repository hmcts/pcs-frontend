import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { caseNumberFormatter } from '../../utils/caseNumberFormatter';
import { flowConfig } from '../flow.config';

import { createFormStep, getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CaseData, HouseholdCircumstances, YesNoValue } from '@services/ccdCase.interface';

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
    caseNumber: 'caseNumber',
    dependantHeading: 'dependantHeading',
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
  extendGetContent: async req => {
    const caseNumber = caseNumberFormatter(req.res?.locals?.validatedCase?.id as string);

    const t = getTranslationFunction(req, 'do-you-have-any-other-dependants', ['common']);

    return {
      caseNumber: t('caseNumber', { caseNumber }),
    };
  },
});
