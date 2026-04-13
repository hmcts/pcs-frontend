import type { PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep, getTranslationFunction } from '@modules/steps';
import { getSavedUploadFiles, savedFilesSessionKey } from '@modules/steps/formBuilder/fileUpload';

const STEP_NAME = 'upload-documents';
const FIELD_NAME = 'supportingDocument';
const SUPPORTING_CATEGORY_ID = 'respondToClaimSupporting';

type UploadMetaEntry = { contentType?: string; size?: number };

function parseUploadMetaJson(json: string | undefined): UploadMetaEntry[] {
  if (!json?.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(json) as unknown;
    return Array.isArray(parsed) ? (parsed as UploadMetaEntry[]) : [];
  } catch {
    return [];
  }
}

export const step: StepDefinition = createFormStep({
  stepName: STEP_NAME,
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/uploadDocuments.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
  },
  fields: [
    {
      name: FIELD_NAME,
      type: 'file',
      required: false,
      translationKey: {
        label: 'uploadLabel',
        // hint: 'uploadHint',
      },
    },
  ],
  extendGetContent: req => {
    const t = getTranslationFunction(req, 'upload-documents', ['common']);
    return {
      introText: t('introText'),
      beforeYouUploadHeading: t('beforeYouUploadHeading'),
      namingInstruction: t('namingInstruction'),
    };
  },
  getInitialFormData: req => {
    const defendantResponses = req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses;
    const list = defendantResponses?.supportingDocuments;
    if (!list?.length) {
      return {};
    }
    const meta = parseUploadMetaJson(defendantResponses?.supportingDocumentUploadMetaJson);
    const supportingDocumentSavedFiles = list.map(
      (
        lv: {
          id?: string;
          value?: { document_filename?: string; document_url?: string; document_binary_url?: string };
        },
        i: number
      ) => ({
        id: lv.id || '',
        file_name: lv.value?.document_filename || '',
        content_type: meta[i]?.contentType || '',
        size: typeof meta[i]?.size === 'number' ? meta[i].size : 0,
        url: lv.value?.document_url || '',
        binaryUrl: lv.value?.document_binary_url,
      })
    );
    return { [savedFilesSessionKey(FIELD_NAME)]: supportingDocumentSavedFiles };
  },
  beforeRedirect: async req => {
    // get saved files from session
    const saved = getSavedUploadFiles(req, STEP_NAME, FIELD_NAME);
    // create meta json
    const metaJson = JSON.stringify(saved.map(f => ({ contentType: f.content_type, size: f.size })));

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        supportingDocuments: saved.map(f => ({
          id: f.id,
          value: {
            document_filename: f.file_name,
            document_url: f.url || '',
            document_binary_url: f.binaryUrl || '',
            category_id: SUPPORTING_CATEGORY_ID,
          },
        })),
        supportingDocumentUploadMetaJson: metaJson,
      },
    };

    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
});
