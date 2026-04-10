import type { Request } from 'express';
import { DateTime } from 'luxon';

import type { CaseData, PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { formatDatePartsToISODate } from '../../utils/dateUtils';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { Logger } from '@modules/logger';
import { createFormStep, getTranslationFunction } from '@modules/steps';

const logger = Logger.getLogger('confirmation-of-notice-date-when-provided');

export const step: StepDefinition = createFormStep({
  stepName: 'confirmation-of-notice-date-when-provided',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/confirmationOfNoticeDateWhenProvided.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    subTitle: 'subTitle',
    hintText: 'hintText',
    listItem1: 'listItem1',
    caption: 'caption',
    bulletPointLabel: 'bulletPointLabel',
    noticeDateHint: 'noticeDateHint',
    question: 'question',
  },
  fields: [
    {
      name: 'noticeReceivedDate',
      type: 'date',
      required: false,
      noFutureDate: true,
      noCurrentDate: false,
      legendClasses: 'govuk-fieldset__legend--m',
      translationKey: {
        label: 'question',
        hint: 'noticeDateHint',
      },
    },
  ],
  getInitialFormData: req => {
    const caseData: CaseData = req.res?.locals.validatedCase?.data;
    const noticeReceivedDateRaw: unknown = caseData?.possessionClaimResponse?.defendantResponses?.noticeReceivedDate;

    if (!noticeReceivedDateRaw) {
      return {};
    }

    if (typeof noticeReceivedDateRaw !== 'string') {
      logger.warn('Unexpected noticeReceivedDate type in case data', {
        type: typeof noticeReceivedDateRaw,
        value: noticeReceivedDateRaw,
      });
      return {};
    }

    const dateTime: DateTime = DateTime.fromISO(noticeReceivedDateRaw);
    if (!dateTime.isValid) {
      logger.warn('Invalid noticeReceivedDate format in case data', {
        value: noticeReceivedDateRaw,
        reason: dateTime.invalidReason,
      });
      return {};
    }

    return {
      noticeReceivedDate: {
        day: dateTime.toFormat('dd'),
        month: dateTime.toFormat('MM'),
        year: dateTime.toFormat('yyyy'),
      },
    };
  },

  beforeRedirect: async (req: Request) => {
    const dateObject: { day?: string; month?: string; year?: string } | undefined = req.body?.noticeReceivedDate;
    const day = dateObject?.day !== undefined ? String(dateObject.day).trim() : '';
    const month = dateObject?.month !== undefined ? String(dateObject.month).trim() : '';
    const year = dateObject?.year !== undefined ? String(dateObject.year).trim() : '';
    const noticeReceivedDate = formatDatePartsToISODate(day, month, year);

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        ...(noticeReceivedDate && { noticeReceivedDate }),
      },
    };

    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },

  extendGetContent: req => {
    // Read from CCD (fresh data from START callback via res.locals.validatedCase)
    // Same pattern as free-legal-advice - no session dependency
    const caseData = req.res?.locals.validatedCase?.data;
    const claimantName = caseData?.possessionClaimResponse?.claimantOrganisations?.[0]?.value as string | undefined;

    // Check all possible notice date fields (different service methods use different fields)
    const noticeDateRaw =
      caseData?.notice_NoticeHandedOverDateTime || // Hand delivered
      caseData?.notice_NoticePostedDate || // Posted
      caseData?.notice_NoticeOtherElectronicDateTime || // Electronic
      '';

    // Format the date for display (e.g., "1 January 2024")
    const noticeDate = noticeDateRaw
      ? DateTime.fromISO(noticeDateRaw).setZone('Europe/London').setLocale('en-gb').toFormat('d LLLL y')
      : '';

    const t = getTranslationFunction(req, 'confirmation-of-notice-date-when-provided', ['common']);

    const bulletPointLabel = t('bulletPointLabel', { returnObjects: true, claimantName });
    const hintText = t('hintText', { returnObjects: true, claimantName });
    const listItem1 = t('listItem1', { returnObjects: true, noticeDate });

    return {
      claimantName,
      noticeDate,
      bulletPointLabel,
      hintText,
      listItem1,
    };
  },
});
