import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { createRespondToClaimFormStep } from '../formStep';
import { purgeUploadedDocumentsFromCdam } from '../utils';
import { DocumentType } from '../utils/purgeUploadedDocuments';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { YesNoValue } from '@services/ccdCase.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'resume-response',
  isAnswered: req => Boolean(req.res?.locals.validatedCase?.defendantResponses?.makeCounterClaim),
  stepDir: __dirname,
  customTemplate: `${__dirname}/resumeResponse.njk`,
  translationKeys: {},
  fields: [
    {
      name: 'resumeResponse',
      type: 'radio',
      required: true,
      legendClasses: 'govuk-fieldset__legend--m',
      translationKey: {
        label: 'question',
      },
      errorMessage: 'errors.resumeResponse',
      options: [
        { value: 'YES', translationKey: 'options.yes' },
        { value: 'NO', translationKey: 'options.no' },
      ],
    },
  ],
  beforeRedirect: async req => {
    const response = buildDraftDefendantResponse(req);
    const resumeResponse = req.body?.resumeResponse as YesNoValue | undefined;

    if (resumeResponse === 'NO') {
      response.defendantResponses = {};
      await purgeUploadedDocumentsFromCdam(req, DocumentType.UPLOAD);
      await purgeUploadedDocumentsFromCdam(req, DocumentType.COUNTER_CLAIM);
    }

    await saveDraftDefendantResponse(req, response);
  },
});
