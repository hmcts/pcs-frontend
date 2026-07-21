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
import { formatDateOrdinal } from '@utils/viewTheClaim/viewTheClaimUtils';

const logger = Logger.getLogger('confirmation-of-notice-date-when-provided');

const textOrUndefined = (value?: string): string | undefined => {
  const trimmed = value?.trim();
  return trimmed || undefined;
};

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
    const noticeDate = formatDateOrdinal(noticeDateRaw) ?? '';

    const t = getTranslationFunction(req);

    const bulletPointLabel = t('bulletPointLabel', { returnObjects: true, claimantName });
    const hintText = t('hintText', { returnObjects: true, claimantName });
    const listItem1 = t('listItem1', { returnObjects: true, noticeDate });

    const caseData = (validatedCase?.data as Record<string, unknown>) ?? {};
    const documents = extractCaseDocuments(caseData);
    const noticeDoc =
      documents.find(d => d.sourceField === 'detailsTab_NoticeDetails.noticeDocuments') ??
      documents.find(d => d.sourceField === 'notice_Documents');
    const noticeDocumentId = noticeDoc?.id;

    const serviceMethod = validatedCase?.notice_ServiceMethod;
    let noticeMethodText: string | undefined;

    switch (serviceMethod) {
      case 'PERSONALLY_HANDED': {
        const name = textOrUndefined(validatedCase?.notice_PersonName);
        noticeMethodText = name
          ? t('methodOfService.PERSONALLY_HANDED', { name })
          : t('methodOfService.PERSONALLY_HANDED_ALT');
        break;
      }
      case 'EMAIL': {
        const emailAddress = textOrUndefined(validatedCase?.notice_EmailAddress);
        noticeMethodText = emailAddress ? t('methodOfService.EMAIL', { emailAddress }) : t('methodOfService.EMAIL_ALT');
        break;
      }
      case 'DELIVERED_PERMITTED_PLACE': {
        const date = formatDateOrdinal(validatedCase?.notice_DeliveredDate);
        noticeMethodText = date
          ? t('methodOfService.DELIVERED_PERMITTED_PLACE', { date })
          : t('methodOfService.DELIVERED_PERMITTED_PLACE_ALT');
        break;
      }
      case 'FIRST_CLASS_POST':
        noticeMethodText = t('methodOfService.FIRST_CLASS_POST');
        break;
      case 'OTHER_ELECTRONIC': {
        const details = textOrUndefined(validatedCase?.notice_OtherElectronicExplanation);
        noticeMethodText = details
          ? t('methodOfService.OTHER_ELECTRONIC', { details })
          : t('methodOfService.OTHER_ELECTRONIC_ALT');
        break;
      }
      case 'OTHER': {
        const details = textOrUndefined(validatedCase?.notice_OtherExplanation);
        noticeMethodText = details ? t('methodOfService.OTHER', { details }) : t('methodOfService.OTHER_ALT');
        break;
      }
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
      noticeMethodText,
    };
  },
});
