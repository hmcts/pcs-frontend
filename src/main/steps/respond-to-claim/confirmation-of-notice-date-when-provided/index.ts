import type { Request } from 'express';
import type { TFunction } from 'i18next';
import { DateTime } from 'luxon';

import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { formatDatePartsToISODate } from '../../utils/dateUtils';
import { getClaimantName } from '../../utils/getClaimantName';
import { isRelease12Enabled } from '../../utils/isRelease12Enabled';
import { createRespondToClaimFormStep } from '../formStep';

import { Logger } from '@modules/logger';
import { getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CaseData } from '@services/ccdCase.interface';
import type { CcdCaseModel } from '@services/ccdCaseData.model';
import { extractCaseDocuments } from '@utils/documentUtils';
import { formatDateOrdinal } from '@utils/viewTheClaim/viewTheClaimUtils';

const logger = Logger.getLogger('confirmation-of-notice-date-when-provided');

const textOrUndefined = (value?: string): string | undefined => {
  const trimmed = value?.trim();
  return trimmed || undefined;
};

// Flag cleanup (`release-1.2-enabled`): once the flag is permanently on, inline `formatDateOrdinal` at the
// call site and delete this helper, along with the pre-release-1.2 `d LLLL y` branch + the luxon import.
const formatNoticeDate = (noticeDate: string, release12Enabled: boolean): string => {
  if (release12Enabled) {
    return formatDateOrdinal(noticeDate) ?? '';
  }

  return noticeDate
    ? DateTime.fromISO(noticeDate).setZone('Europe/London').setLocale('en-gb').toFormat('d LLLL y')
    : '';
};

const getNoticeDocumentId = (validatedCase?: CcdCaseModel): string | undefined => {
  const caseData = (validatedCase?.data as Record<string, unknown>) ?? {};
  const documents = extractCaseDocuments(caseData);
  const noticeDoc =
    documents.find(d => d.sourceField === 'detailsTab_NoticeDetails.noticeDocuments') ??
    documents.find(d => d.sourceField === 'notice_Documents');

  return noticeDoc?.id;
};

const getNoticeMethodText = (validatedCase: CcdCaseModel | undefined, t: TFunction): string | undefined => {
  switch (validatedCase?.notice_ServiceMethod) {
    case 'PERSONALLY_HANDED': {
      const name = textOrUndefined(validatedCase.notice_PersonName);
      return name ? t('methodOfService.PERSONALLY_HANDED', { name }) : t('methodOfService.PERSONALLY_HANDED_ALT');
    }
    case 'EMAIL': {
      const emailAddress = textOrUndefined(validatedCase.notice_EmailAddress);
      return emailAddress ? t('methodOfService.EMAIL', { emailAddress }) : t('methodOfService.EMAIL_ALT');
    }
    case 'DELIVERED_PERMITTED_PLACE': {
      const date = formatDateOrdinal(validatedCase.notice_DeliveredDate);
      return date
        ? t('methodOfService.DELIVERED_PERMITTED_PLACE', { date })
        : t('methodOfService.DELIVERED_PERMITTED_PLACE_ALT');
    }
    case 'FIRST_CLASS_POST':
      return t('methodOfService.FIRST_CLASS_POST');
    case 'OTHER_ELECTRONIC': {
      const details = textOrUndefined(validatedCase.notice_OtherElectronicExplanation);
      return details ? t('methodOfService.OTHER_ELECTRONIC', { details }) : t('methodOfService.OTHER_ELECTRONIC_ALT');
    }
    case 'OTHER': {
      const details = textOrUndefined(validatedCase.notice_OtherExplanation);
      return details ? t('methodOfService.OTHER', { details }) : t('methodOfService.OTHER_ALT');
    }
    default:
      return undefined;
  }
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
    const release12Enabled = isRelease12Enabled(req);

    const noticeDateRaw = validatedCase?.noticeDate || '';
    const noticeDate = formatNoticeDate(noticeDateRaw, release12Enabled);

    const t = getTranslationFunction(req);

    const bulletPointLabel = t('bulletPointLabel', { returnObjects: true, claimantName });
    // Flag cleanup (`release-1.2-enabled`): once the flag is permanently on, move the `release12.*` copy up to
    // the top-level `hintText` / `listItem1` keys in both citizen and legal-rep en/cy locale files, delete all
    // four `release12` blocks, and read the top-level keys unconditionally.
    const hintText = t(release12Enabled ? 'release12.hintText' : 'hintText', {
      returnObjects: true,
      claimantName,
    });
    const listItem1 = t(release12Enabled ? 'release12.listItem1' : 'listItem1', {
      returnObjects: true,
      noticeDate,
    });

    // Flag cleanup (`release-1.2-enabled`): once the flag is permanently on, drop these guards and
    // `release12Enabled` above so the notice link and service method are always resolved.
    const noticeDocumentId = release12Enabled ? getNoticeDocumentId(validatedCase) : undefined;
    const noticeMethodText = release12Enabled ? getNoticeMethodText(validatedCase, t) : undefined;

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
