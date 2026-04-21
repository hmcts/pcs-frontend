import { format, parseISO } from 'date-fns';

import { formatDatePartsToISODate } from '../../utils';
import { getClaimantName } from '../../utils/getClaimantName';
import { buildCcdCaseForPossessionClaimResponse as buildAndSubmitPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep, getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { PossessionClaimResponse } from '@services/ccdCaseData.model';
import { isLegalRepresentativeUser } from 'steps/utils/userRole';

const STEP_NAME = 'tenancy-date-unknown';

export const step: StepDefinition = createFormStep({
  stepName: STEP_NAME,
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/tenancyDateUnknown.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
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
  getInitialFormData: req => {
    const tenancyStartDate = req.res?.locals?.validatedCase?.defendantResponsesTenancyStartDate;
    if (!tenancyStartDate) {
      return {};
    }

    const parsed = parseISO(tenancyStartDate);
    if (Number.isNaN(parsed.getTime())) {
      return {};
    }

    return {
      tenancyStartDate: {
        day: format(parsed, 'd'),
        month: format(parsed, 'M'),
        year: format(parsed, 'yyyy'),
      },
    };
  },
  beforeRedirect: async req => {
    const dateObject = req.body?.tenancyStartDate;
    const day = dateObject?.day !== undefined ? String(dateObject.day).trim() : '';
    const month = dateObject?.month !== undefined ? String(dateObject.month).trim() : '';
    const year = dateObject?.year !== undefined ? String(dateObject.year).trim() : '';
    const tenancyStartDateIso = formatDatePartsToISODate(day, month, year);

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        ...(tenancyStartDateIso && { tenancyStartDate: tenancyStartDateIso }),
      },
    };

    await buildAndSubmitPossessionClaimResponse(req, possessionClaimResponse);
  },
  extendGetContent: async req => {
    const claimantName = getClaimantName(req)
    const orgName = req.res?.locals.validatedCase?.data?.possessionClaimResponse?.claimantOrganisations?.[0]
      ?.value as string;

    const receivedDetailsBy = isLegalRepresentativeUser(req) ? claimantName : orgName;
    const t = getTranslationFunction(req, STEP_NAME, ['common']);
    const paragraph = t('paragraph', { receivedDetailsBy });

    return {
      receivedDetailsBy,
      claimantName,
      paragraph,
    };
  },
});
