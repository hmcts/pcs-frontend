import type { Request } from 'express';

import { Logger } from '../../../modules/logger';
import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { getClaimantName } from '../../utils/getClaimantName';
import { isRelease12Enabled } from '../../utils/isRelease12Enabled';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CaseData, YesNoNotSureValue } from '@services/ccdCase.interface';
import { ccdCaseService } from '@services/ccdCaseService';
import { findCaseDocumentById } from '@utils/documentUtils';

const logger = Logger.getLogger('confirmationOfNoticeGiven');

export function getNoticeDocumentInfo(validatedCase?: unknown): {
  isDocumentUploaded: boolean;
  documentId?: string;
} {
  const caseData =
    (validatedCase as { data?: Record<string, unknown> })?.data ?? (validatedCase as Record<string, unknown>) ?? {};

  const detailsTabNoticeDocs = (caseData?.detailsTab_NoticeDetails as Record<string, unknown>)?.noticeDocuments;
  const noticeDocs = caseData?.notice_Documents;
  const noticeDocuments = caseData?.noticeDocuments;
  const allDocs = caseData?.allDocuments;
  const claimantDocs = caseData?.claimantDocuments;

  const collections = [detailsTabNoticeDocs, noticeDocs, noticeDocuments, allDocs, claimantDocs];

  for (const collection of collections) {
    const items = Array.isArray(collection) ? collection : collection ? [collection] : [];
    for (const item of items) {
      if (!item || typeof item !== 'object') {
        continue;
      }
      const rec = item as Record<string, unknown>;
      const val = (rec.value as Record<string, unknown>) ?? rec;
      const docObj = (val.document as Record<string, unknown>) ?? val;

      const url = (docObj.document_url ||
        docObj.document_binary_url ||
        val.document_url ||
        val.document_binary_url ||
        rec.document_url ||
        rec.document_binary_url) as string | undefined;

      const urlId = url ? url.split('/documents/')[1]?.split('/')[0] : undefined;
      const id = (rec.id as string) || (val.id as string) || (docObj.id as string) || urlId;

      if (id) {
        const downloadable = findCaseDocumentById(caseData, id);
        if (!downloadable?.binaryUrl) {
          continue;
        }
        return { isDocumentUploaded: true, documentId: downloadable.id };
      }
    }
  }

  return { isDocumentUploaded: false };
}

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
  extendGetContent: async (req: Request) => {
    const claimantName = getClaimantName(req);
    let { isDocumentUploaded, documentId } = getNoticeDocumentInfo(req.res?.locals.validatedCase);

    if (!isDocumentUploaded) {
      try {
        const accessToken = req.session?.user?.accessToken;
        const rawCaseReference = req.params?.caseReference;
        const caseReference = Array.isArray(rawCaseReference) ? rawCaseReference[0] : rawCaseReference;
        if (accessToken && caseReference) {
          const fullCase = await ccdCaseService.getCaseById(accessToken, caseReference);
          const fullCaseDocInfo = getNoticeDocumentInfo(fullCase);
          if (fullCaseDocInfo.isDocumentUploaded && fullCaseDocInfo.documentId) {
            isDocumentUploaded = true;
            documentId = fullCaseDocInfo.documentId;
          }
        }
      } catch (err) {
        logger.warn('[confirmationOfNoticeGiven] Failed to fetch full case for notice document', { error: err });
      }
    }

    const noticeDocument = isDocumentUploaded && documentId ? { id: documentId } : '';
    const release12Enabled = isRelease12Enabled(req);

    return {
      claimantName,
      noticeDocument,
      isRelease12Enabled: release12Enabled,
    };
  },
});
