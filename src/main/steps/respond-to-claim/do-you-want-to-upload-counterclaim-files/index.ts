import type { Request } from 'express';

import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CcdCollectionItem, CcdUploadedDocument } from '@services/ccdCase.interface';

// Pre-populates from existing counterClaimDocuments. CounterClaim has no
// `uploadCounterClaimDocs` BE field today (see HDPI-5181-COUNTERCLAIM-UPLOAD-BE-PLAN.md),
// so we derive: docs present → user previously answered YES; absent → unanswered.
function getCurrentChoice(req: Request): string | undefined {
  const docs: CcdCollectionItem<CcdUploadedDocument>[] | undefined =
    req.res?.locals?.validatedCase?.possessionClaimResponse?.defendantResponses?.counterClaimDocuments;
  return docs && docs.length > 0 ? 'YES' : undefined;
}

export const step: StepDefinition = createFormStep({
  stepName: 'do-you-want-to-upload-counterclaim-files',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/doYouWantToUploadCounterclaimFiles.njk`,
  fields: [
    {
      name: 'wantsToUploadCounterClaimDocs',
      type: 'radio',
      required: true,
      translationKey: { label: 'question' },
      legendClasses: 'govuk-fieldset__legend--l',
      isPageHeading: true,
      options: [
        { value: 'YES', translationKey: 'options.yes' },
        { value: 'NO', translationKey: 'options.no' },
      ],
    },
  ],
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
  },
  getInitialFormData: (req: Request) => {
    const choice = getCurrentChoice(req);
    return choice ? { wantsToUploadCounterClaimDocs: choice } : {};
  },
  // No beforeRedirect — choice is not persisted to CCD today. Routing reads
  // from the current request body via flow.config.ts.
});
