import { DateTime } from 'luxon';

import { getClaimantName } from '../../utils/getClaimantName';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import type { PossessionClaimResponse } from '@interfaces/ccdCaseData.model';
import type { StepDefinition } from '@interfaces/stepFormData.interface';
import { createFormStep, getTranslationFunction } from '@modules/steps';

type NoticeDateFormValue = Record<
  string,
  {
    day: string;
    month: string;
    year: string;
  }
>;

function getNoticeDateFormValue(noticeDate?: string): NoticeDateFormValue {
  if (!noticeDate) {
    return {};
  }

  const parsed = DateTime.fromISO(noticeDate);
  if (!parsed.isValid) {
    return {};
  }

  return {
    noticeDate: {
      day: parsed.toFormat('d'),
      month: parsed.toFormat('M'),
      year: parsed.toFormat('yyyy'),
    },
  };
}

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
      name: 'noticeDate',
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
    return getNoticeDateFormValue(req.res?.locals?.validatedCase?.defendantResponsesNoticeDate);
  },
  beforeRedirect: async req => {
    const noticeDate = req.body?.noticeDate as { day?: string; month?: string; year?: string } | undefined;
    const isoNoticeDate =
      noticeDate?.day && noticeDate?.month && noticeDate?.year
        ? (DateTime.fromObject({
            day: Number(noticeDate.day),
            month: Number(noticeDate.month),
            year: Number(noticeDate.year),
          }).toISODate() ?? undefined)
        : undefined;

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        noticeDate: isoNoticeDate,
      },
    };

    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
  extendGetContent: req => {
    const validatedCase = req.res?.locals?.validatedCase;
    const claimantName = getClaimantName(req);

    const noticeDateRaw = validatedCase?.noticeDate || '';

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
