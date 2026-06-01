import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { flowConfig } from '../flow.config';
import { purgeCounterClaimDocumentsFromCdam } from '../utils';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { YesNoEnum } from '@services/ccdCase.interface';
import type { CaseData, YesNoValue } from '@services/ccdCase.interface';

export const step: StepDefinition = createFormStep({
  stepName: 'counter-claim-do-you-want-to-upload-files',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/counterClaimDoYouWantToUploadFiles.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    paragraph1: 'paragraph1',
    paragraph2: 'paragraph2',
  },
  fields: [
    {
      name: 'counterClaimWantToUploadFiles',
      type: 'radio',
      required: true,
      legendClasses: 'govuk-visually-hidden',
      translationKey: {
        label: 'heading',
      },
      errorMessage: 'errors.counterClaimWantToUploadFiles',
      options: [
        { value: 'YES', translationKey: 'options.yes' },
        { value: 'NO', translationKey: 'options.no' },
      ],
    },
  ],
  beforeRedirect: async req => {
    const counterClaimWantToUploadFiles = req.body?.counterClaimWantToUploadFiles as YesNoValue | undefined;
    const response = buildDraftDefendantResponse(req);

    if (counterClaimWantToUploadFiles) {
      response.defendantResponses.counterClaimWantToUploadFiles = counterClaimWantToUploadFiles;
    } else {
      delete response.defendantResponses.counterClaimWantToUploadFiles;
    }

    // User has flipped away from YES → purge any uploaded counter-claim documents from CDAM.
    // The normaliser will then strip counterClaimDocuments from the saved draft.
    if (counterClaimWantToUploadFiles !== YesNoEnum.YES) {
      await purgeCounterClaimDocumentsFromCdam(req);
    }

    await saveDraftDefendantResponse(req, response);
  },
  getInitialFormData: req => {
    const caseData: CaseData | undefined = req.res?.locals?.validatedCase?.data;
    const counterClaimWantToUploadFiles: YesNoValue | undefined =
      caseData?.possessionClaimResponse?.defendantResponses?.counterClaimWantToUploadFiles;

    return counterClaimWantToUploadFiles !== undefined ? { counterClaimWantToUploadFiles } : {};
  },
});
