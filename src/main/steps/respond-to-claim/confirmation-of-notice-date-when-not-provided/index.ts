import { DateTime } from 'luxon';

import { getClaimantName } from '../../utils/getClaimantName';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep, getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { PossessionClaimResponse } from '@services/ccdCaseData.model';

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
    const claimantName = getClaimantName(req);

    const t = getTranslationFunction(req, 'confirmation-of-notice-date-when-not-provided', ['common']);

    const paragraph = t('paragraph', { returnObjects: true, claimantName });

    return {
      claimantName,
      paragraph,
    };
  },
});
