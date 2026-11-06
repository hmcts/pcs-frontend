import { CallbackRejectedError } from '../../../HttpError';
import { draftClaim, submitClaim } from '../claimDraft';
import { claimMappings } from '../claimMapping';
import { textField } from '../fieldBuilders';
import { createMakeAClaimStep } from '../formStep';
import { allCards } from '../summary';

import { Logger } from '@modules/logger';
import { getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { persistPaymentSessionState } from '@services/paymentSessionService';

const logger = Logger.getLogger('makeAClaimCheckYourAnswers');

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'check-your-answers',
  stepDir: __dirname,
  customTemplate: 'make-a-claim/templates/summary.njk',
  fields: [
    {
      name: 'statementOfTruth',
      type: 'checkbox',
      required: true,
      legendClasses: 'govuk-fieldset__legend--m',
      translationKey: { label: 'statementOfTruth.legend', hint: 'statementOfTruth.hint' },
      validator: (value: unknown): boolean | string =>
        Array.isArray(value) && value.includes('contempt') && value.includes('belief')
          ? true
          : 'errors.statementOfTruth',
      options: [
        { value: 'contempt', translationKey: 'statementOfTruth.contempt' },
        { value: 'belief', translationKey: 'statementOfTruth.belief' },
      ],
    },
    textField('statementOfTruthFullName', { maxLength: 100, attributes: { autocomplete: 'name' } }),
    textField('statementOfTruthPosition', { required: false, maxLength: 100 }),
  ],
  extendGetContent: req => {
    const t = getTranslationFunction(req);
    return {
      cards: allCards(req),
      saveAndContinue: t('submitButton'),
      submitError: req.query?.submitError === 'failed' ? t('errors.submitFailed') : undefined,
    };
  },
  beforeRedirect: async req => {
    if (req.body?.action === 'saveForLater') {
      return;
    }
    const claim = draftClaim(req);
    claimMappings['check-your-answers'].fromForm?.(claim, req.body ?? {}, req);
    const caseId = req.res?.locals.validatedCase?.id as string;
    try {
      const fee = await submitClaim(req, claim);
      if (fee) {
        await persistPaymentSessionState(req, {
          caseReference: caseId,
          serviceRequestReference: fee.serviceRequestReference,
          feeAmount: Number(fee.feeAmount) / 100,
        });
        return req.res?.redirect(303, `/case/${caseId}/pay-claim-fee`);
      }
      return req.res?.redirect(303, `/case/${caseId}/claim-submitted`);
    } catch (error) {
      logger.error(`Failed to submit private landlord claim for case ${caseId}`, {
        error: error instanceof Error ? error.message : String(error),
        reasons: error instanceof CallbackRejectedError ? error.reasons : undefined,
      });
      return req.res?.redirect(303, `${req.originalUrl.split('?')[0]}?submitError=failed`);
    }
  },
});
