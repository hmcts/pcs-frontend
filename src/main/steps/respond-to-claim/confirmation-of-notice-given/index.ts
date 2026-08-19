import type { Request } from 'express';

import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { getClaimantName } from '../../utils/getClaimantName';
import { isRelease12Enabled } from '../../utils/isRelease12Enabled';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CaseData, YesNoNotSureValue } from '@services/ccdCase.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'confirmation-of-notice-given',
  isAnswered: req => Boolean(req.res?.locals.validatedCase?.defendantResponses?.possessionNoticeReceived),
  stepDir: __dirname,
  customTemplate: `${__dirname}/confirmationOfNoticeGiven.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    question: 'question',
    hintText: 'hintText',
    noticeDateHint: 'noticeDateHint',
    insetText: 'insetText',
    noticeDocumentLinkText: 'noticeDocumentLinkText',
  },
  fields: [
    {
      name: 'possessionNoticeReceived',
      type: 'radio',
      required: true,
      translationKey: { label: 'question', hint: 'hintText' },
      legendClasses: 'govuk-fieldset__legend--m',
      options: [
        { value: 'YES', translationKey: 'options.yes' },
        { value: 'NO', translationKey: 'options.no' },
        { divider: 'options.or' },
        { value: 'NOT_SURE', translationKey: 'options.imNotSure' },
      ],
    },
  ],
  getInitialFormData: req => {
    const caseData: CaseData | undefined = req.res?.locals.validatedCase?.data;
    const possessionNoticeReceived: YesNoNotSureValue | undefined =
      caseData?.possessionClaimResponse?.defendantResponses?.possessionNoticeReceived;

    return possessionNoticeReceived ? { possessionNoticeReceived } : {};
  },
  beforeRedirect: async (req: Request) => {
    const response = buildDraftDefendantResponse(req);
    const possessionNoticeReceived: YesNoNotSureValue | undefined = req.body?.possessionNoticeReceived;

    if (possessionNoticeReceived) {
      response.defendantResponses.possessionNoticeReceived = possessionNoticeReceived;
    } else {
      delete response.defendantResponses.possessionNoticeReceived;
    }

    await saveDraftDefendantResponse(req, response);
  },
  extendGetContent: req => {
    const caseData = req.res?.locals.validatedCase?.data;
    const claimantName = getClaimantName(req);
    const detailsTab = caseData?.detailsTab_NoticeDetails as
      { noticeDocuments?: Record<string, unknown>[] } | undefined;
    const noticeDocument = detailsTab?.noticeDocuments?.[0] ?? '';
    const release12Enabled = isRelease12Enabled(req);

    return {
      claimantName,
      noticeDocument,
      isRelease12Enabled: release12Enabled,
    };
  },
});
