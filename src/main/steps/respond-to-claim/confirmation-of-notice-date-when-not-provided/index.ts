import type { Request } from 'express';
import { DateTime } from 'luxon';

import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { formatDatePartsToISODate } from '../../utils/dateUtils';
import { getClaimantName } from '../../utils/getClaimantName';
import { flowConfig } from '../flow.config';

import { Logger } from '@modules/logger';
import { createFormStep, getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CaseData } from '@services/ccdCase.interface';
const logger = Logger.getLogger('confirmation-of-notice-date-when-not-provided');

export const step: StepDefinition = createFormStep({
  stepName: 'confirmation-of-notice-date-when-not-provided',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/confirmationOfNoticeDateWhenNotProvided.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    subTitle: 'subTitle',
    caption: 'caption',
    question: 'question',
    paragraph: 'paragraph',
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
    const caseData: CaseData | undefined = req.res?.locals.validatedCase?.data;
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
    const response = buildDraftDefendantResponse(req);
    const dateObject: { day?: string; month?: string; year?: string } | undefined = req.body?.noticeReceivedDate;
    const day = dateObject?.day !== undefined ? String(dateObject.day).trim() : '';
    const month = dateObject?.month !== undefined ? String(dateObject.month).trim() : '';
    const year = dateObject?.year !== undefined ? String(dateObject.year).trim() : '';
    const noticeReceivedDate = formatDatePartsToISODate(day, month, year);

    if (noticeReceivedDate) {
      response.defendantResponses.noticeReceivedDate = noticeReceivedDate;
    } else {
      delete response.defendantResponses.noticeReceivedDate;
    }

    await saveDraftDefendantResponse(req, response);
  },
  extendGetContent: req => {
    const claimantName = getClaimantName(req);

    const t = getTranslationFunction(req, 'confirmation-of-notice-date-when-not-provided', ['common']);

    const paragraph = t('paragraph', { returnObjects: true, claimantName });

    return {
      claimantName,
      paragraph,
    };
  },
});
