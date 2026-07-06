import type { Request } from 'express';
import { DateTime } from 'luxon';

import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { formatDatePartsToISODate } from '../../utils/dateUtils';
import { getClaimantName } from '../../utils/getClaimantName';
import { createRespondToClaimFormStep } from '../formStep';

import { Logger } from '@modules/logger';
import { getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CaseData } from '@services/ccdCase.interface';
import { extractCaseDocuments } from '@utils/documentUtils';

const logger = Logger.getLogger('confirmation-of-notice-date-when-provided');

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'confirmation-of-notice-date-when-provided',
  isAnswered: () => true,
  stepDir: __dirname,
  customTemplate: `${__dirname}/confirmationOfNoticeDateWhenProvided.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    subTitle: 'subTitle',
    hintText: 'hintText',
    listItem1: 'listItem1',
    bulletPointLabel: 'bulletPointLabel',
    noticeDateHint: 'noticeDateHint',
    question: 'question',
    viewNoticeLinkText: 'viewNoticeLinkText',
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
    const validatedCase = req.res?.locals.validatedCase;
    const claimantName = getClaimantName(req);

    const noticeDateRaw = validatedCase?.noticeDate || '';

    // Format the date for display (e.g., "1 January 2024")
    const noticeDate = noticeDateRaw
      ? DateTime.fromISO(noticeDateRaw).setZone('Europe/London').setLocale('en-gb').toFormat('d LLLL y')
      : '';

    const t = getTranslationFunction(req);

    const bulletPointLabel = t('bulletPointLabel', { returnObjects: true, claimantName });
    const hintText = t('hintText', { returnObjects: true, claimantName });
    const listItem1 = t('listItem1', { returnObjects: true, noticeDate });

    const caseData = (validatedCase?.data as Record<string, unknown>) ?? {};
    const documents = extractCaseDocuments(caseData);
    const noticeDoc = documents.find(d => d.sourceField === 'notice_Documents');
    const noticeDocumentId = noticeDoc?.id;
    const noticeDocumentFilename = noticeDoc?.filename;

    const formatNoticeDate = (raw?: string): string =>
      raw ? DateTime.fromISO(raw).setZone('Europe/London').setLocale('en-gb').toFormat('d LLLL y') : '';

    const serviceMethod = validatedCase?.notice_ServiceMethod;
    let noticeMethodText: string | undefined;

    switch (serviceMethod) {
      case 'PERSONALLY_HANDED':
        noticeMethodText = t('methodOfService.PERSONALLY_HANDED', {
          name: validatedCase?.notice_PersonName ?? '',
        });
        break;
      case 'EMAIL':
        noticeMethodText = t('methodOfService.EMAIL', {
          emailAddress: validatedCase?.notice_EmailAddress ?? '',
        });
        break;
      case 'DELIVERED_PERMITTED_PLACE':
        noticeMethodText = t('methodOfService.DELIVERED_PERMITTED_PLACE', {
          date: formatNoticeDate(validatedCase?.notice_DeliveredDate),
        });
        break;
      case 'FIRST_CLASS_POST':
        noticeMethodText = t('methodOfService.FIRST_CLASS_POST');
        break;
      case 'OTHER_ELECTRONIC':
        noticeMethodText = t('methodOfService.OTHER_ELECTRONIC', {
          details: validatedCase?.notice_OtherElectronicExplanation ?? '',
        });
        break;
      case 'OTHER':
        noticeMethodText = t('methodOfService.OTHER', {
          details: validatedCase?.notice_OtherExplanation ?? '',
        });
        break;
      default:
        noticeMethodText = undefined;
    }

    return {
      claimantName,
      noticeDate,
      bulletPointLabel,
      hintText,
      listItem1,
      noticeDocumentId,
      noticeDocumentFilename,
      noticeMethodText,
    };
  },
});
