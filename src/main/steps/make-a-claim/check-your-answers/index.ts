import { CallbackRejectedError } from '../../../HttpError';
import { CLAIM_SUBMITTED_ROUTE, PAY_CLAIM_FEE_ROUTE, makeAClaimPath } from '../../../constants/makeAClaimRoutes';
import { answeredClaim, saveClaimDraft, submitClaim } from '../claimDraft';
import { claimMappings } from '../claimMapping';
import { textField } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';
import { createMakeAClaimStep } from '../formStep';
import {
  draftChangedUrl,
  isDraftChanged,
  submitErrorCodes,
  submitErrorItems,
  submitRefusalOutcome,
} from '../submitErrors';
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
    textField('statementOfTruthFullName', {
      maxLength: FIELD_LIMITS.statementOfTruthFullName,
      attributes: { autocomplete: 'name' },
    }),
    textField('statementOfTruthPosition', { required: false, maxLength: FIELD_LIMITS.statementOfTruthPosition }),
  ],
  extendGetContent: (req, formContent) => {
    const t = getTranslationFunction(req);
    const submitErrors = submitErrorItems(req, submitErrorCodes(req.query?.submitError));
    return {
      cards: allCards(req),
      saveAndContinue: t('submitButton'),
      ...(submitErrors.length > 0 && !formContent.errorSummary
        ? { errorSummary: { titleText: t('makeAClaim:summary.problem'), errorList: submitErrors } }
        : {}),
    };
  },
  beforeRedirect: async req => {
    const claim = answeredClaim(req, draft =>
      claimMappings['check-your-answers'].fromForm?.(draft, req.body ?? {}, req)
    );
    const caseId = req.res?.locals.validatedCase?.id as string;
    if (req.body?.action === 'saveForLater') {
      try {
        return await saveClaimDraft(req, claim);
      } catch (error) {
        if (!isDraftChanged(error)) {
          throw error;
        }
        return req.res?.redirect(303, draftChangedUrl(caseId));
      }
    }
    try {
      const fee = await submitClaim(req, claim);
      if (fee) {
        await persistPaymentSessionState(req, {
          caseReference: caseId,
          serviceRequestReference: fee.serviceRequestReference,
          feeAmountInPence: fee.feeAmount,
        });
        return req.res?.redirect(303, makeAClaimPath(PAY_CLAIM_FEE_ROUTE, caseId));
      }
      return req.res?.redirect(303, makeAClaimPath(CLAIM_SUBMITTED_ROUTE, caseId));
    } catch (error) {
      logger.error(`Failed to submit private landlord claim for case ${caseId}`, {
        error: error instanceof Error ? error.message : String(error),
        reasons: error instanceof CallbackRejectedError ? error.reasons : undefined,
      });
      const outcome = submitRefusalOutcome(error, caseId);
      return req.res?.redirect(
        303,
        'redirect' in outcome
          ? outcome.redirect
          : `${req.originalUrl.split('?')[0]}?submitError=${encodeURIComponent(outcome.codes.join(','))}`
      );
    }
  },
});
