import type { Request } from 'express';

import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CcdCollectionItem, CcdDefendantDocument } from '@services/ccdCase.interface';

export const step: StepDefinition = createFormStep({
  stepName: 'support-needs',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/supportNeeds.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    caption: 'caption',
    paragraph1: 'paragraph1',
  },
  fields: [],
  extendGetContent: (req: Request) => {
    const existingDocs: CcdCollectionItem<CcdDefendantDocument>[] =
      req.res?.locals?.validatedCase?.possessionClaimResponse?.defendantResponses?.uploadedDocuments ?? [];

    const basePath = req.originalUrl.split('?')[0].replace('/support-needs', '/upload-document');
    const uploadedFiles = existingDocs.map((item, index) => ({
      filename: item.value.document.document_filename,
      downloadUrl: `${basePath}/document/${index}`,
    }));

    return { uploadedFiles };
  },
});
