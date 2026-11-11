import type { Request } from 'express';

import { CallbackRejectedError } from '../../../HttpError';
import { CLAIM_SUBMITTED_ROUTE, PAY_CLAIM_FEE_ROUTE, makeAClaimPath } from '../../../constants/makeAClaimRoutes';
import { answeredClaim, saveClaimDraft, submitClaim } from '../claimDraft';
import { claimMappings } from '../claimMapping';
import { textField } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';
import { flowConfig, taskListPath } from '../flow.config';
import { caseReferenceOf, createMakeAClaimStep, isRendering, unansweredStepUrl } from '../formStep';
import { makeAClaimSections } from '../sections.config';
import { stepRegistry } from '../stepRegistry';
import {
  draftChangedUrl,
  isDraftChanged,
  submitErrorCodes,
  submitErrorItems,
  submitRefusalOutcome,
} from '../submitErrors';
import { submittedClaimRedirect } from '../submittedClaim';
import { allCards } from '../summary';

import { Logger } from '@modules/logger';
import { getTranslationFunction } from '@modules/steps';
import { getStepUrl } from '@modules/steps/flow';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { persistPaymentSessionState } from '@services/paymentSessionService';
import { getAllSectionStatuses, getFirstVisibleStep, isStepVisible, safeIsAnswered } from '@services/sectionStatus';

const CHECK_AND_SUBMIT = 'checkAndSubmit';

const logger = Logger.getLogger('makeAClaimCheckYourAnswers');

/**
 * Where to send a claimant who opens check your answers before it is available: the first question not yet
 * answered in the first section that is not done, or that section's first page. A page sent back with submit
 * errors, such as a claim changed in another tab, is still shown, so the claimant is told what happened.
 */
async function firstUnfinishedQuestion(req: Request): Promise<string | undefined> {
  if (req.method !== 'GET' || submitErrorCodes(req.query?.submitError).length > 0) {
    return undefined;
  }
  const statuses = await getAllSectionStatuses(flowConfig, stepRegistry, req);
  if (statuses.get(CHECK_AND_SUBMIT) !== 'NOT_AVAILABLE_YET') {
    return undefined;
  }
  const caseReference = caseReferenceOf(req);
  const section = makeAClaimSections.find(
    candidate =>
      candidate.id !== CHECK_AND_SUBMIT && !['DONE', 'NOT_APPLICABLE'].includes(statuses.get(candidate.id) ?? '')
  );
  if (!section) {
    return taskListPath(caseReference);
  }
  const unanswered = section.steps.find(stepName => {
    const step = stepRegistry[stepName];
    return step?.isAnswered !== undefined && isStepVisible(stepName, flowConfig, req) && !safeIsAnswered(step, req);
  });
  if (unanswered) {
    return unansweredStepUrl(req, unanswered);
  }
  const target = getFirstVisibleStep(section, flowConfig, req);
  return target ? getStepUrl(target, flowConfig, caseReference) : taskListPath(caseReference);
}

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'check-your-answers',
  stepDir: __dirname,
  customTemplate: 'make-a-claim/templates/summary.njk',
  redirectWhen: firstUnfinishedQuestion,
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
      ...(isRendering(formContent) ? { cards: allCards(req) } : {}),
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
      const submitted = await submittedClaimRedirect(req.session.user?.accessToken as string, caseId);
      if (submitted) {
        return req.res?.redirect(303, submitted);
      }
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
