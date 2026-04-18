import { createFormStep, getTranslationFunction } from '../../../modules/steps';
import { buildDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { formatDatePartsToISODate } from '../../utils/dateUtils';
import { flowConfig } from '../flow.config';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { ccdCaseService } from '@services/ccdCaseService';

const STEP_NAME = 'tenancy-date-unknown';

export const step: StepDefinition = createFormStep({
  stepName: STEP_NAME,
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/tenancyDateUnknown.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    question: 'question',
    hint: 'hint',
    paragraph: 'paragraph',
  },
  fields: [
    {
      name: 'tenancyStartDate',
      type: 'date',
      required: false,
      noFutureDate: true,
      noCurrentDate: true,
      legendClasses: 'govuk-fieldset__legend--m',
      translationKey: {
        label: 'question',
        hint: 'hint',
      },
    },
  ],
  beforeRedirect: async req => {
    const dateObject = req.body?.tenancyStartDate;
    const day = dateObject?.day !== undefined ? String(dateObject.day).trim() : '';
    const month = dateObject?.month !== undefined ? String(dateObject.month).trim() : '';
    const year = dateObject?.year !== undefined ? String(dateObject.year).trim() : '';
    const tenancyStartDateIso = formatDatePartsToISODate(day, month, year);

    const response = buildDraftDefendantResponse(req);
    if (tenancyStartDateIso) {
      response.defendantResponses.tenancyStartDate = tenancyStartDateIso;
    } else {
      delete response.defendantResponses.tenancyStartDate;
    }

    await ccdCaseService.saveDraftDefendantResponse(
      req.session?.user?.accessToken,
      req.res?.locals.validatedCase?.id || '',
      response
    );
  },
  extendGetContent: async req => {
    const claimantNameFromValidatedCase = req.res?.locals?.validatedCase?.data?.possessionClaimResponse
      ?.claimantOrganisations?.[0]?.value as string | undefined;
    const claimantNameFromSession = req.session?.ccdCase?.data?.claimantName as string | undefined;
    const claimantName = claimantNameFromValidatedCase || claimantNameFromSession || 'Treetops Housing';

    const t = getTranslationFunction(req, STEP_NAME, ['common']);
    const paragraph = t('paragraph', { claimantName });

    return {
      claimantName,
      paragraph,
    };
  },
});
