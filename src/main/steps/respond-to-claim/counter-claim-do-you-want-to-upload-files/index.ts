import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CaseData, PossessionClaimResponse, YesNoValue } from '@services/ccdCase.interface';

export const step: StepDefinition = createFormStep({
  stepName: 'counter-claim-do-you-want-to-upload-files',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/counterClaimDoYouWantToUploadFiles.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
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
    const counterClaimWantToUploadFiles: YesNoValue | undefined = req.body?.counterClaimWantToUploadFiles;

    if (!counterClaimWantToUploadFiles) {
      return;
    }

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        counterClaimWantToUploadFiles,
      },
    };

    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
  getInitialFormData: req => {
    const caseData: CaseData | undefined = req.res?.locals?.validatedCase?.data;
    const counterClaimWantToUploadFiles: YesNoValue | undefined =
      caseData?.possessionClaimResponse?.defendantResponses?.counterClaimWantToUploadFiles;

    return counterClaimWantToUploadFiles !== undefined ? { counterClaimWantToUploadFiles } : {};
  },
});
