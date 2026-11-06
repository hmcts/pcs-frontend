import type { Request } from 'express';

import { CallbackRejectedError } from '../../HttpError';
import { MAKE_A_CLAIM_START_ROUTE } from '../../constants/makeAClaimRoutes';

import { flowConfig } from './flow.config';

import { getTranslationFunction } from '@modules/steps';
import { getStepUrl } from '@modules/steps/flow';

/** pcs-api refusals that are an answer the claimant must change, by the page that asks it. */
const STEP_FOR_PATH: [pattern: RegExp, step: string][] = [
  [/^claimant(\.individualOrOrganisation)?$/, 'individual-or-organisation'],
  [/^claimant\.(firstName|lastName)$/, 'claimant-name'],
  [/^claimant\.organisationName$/, 'organisation-name'],
  [/^claimant\.address$/, 'claimant-address'],
  [/^claimant\.emailAddress$/, 'claimant-email'],
  [/^claimant\.phoneNumber$/, 'claimant-phone'],
  [/^claimant\.textMessageNumber$/, 'claimant-text-message'],
  [/^defendants(\[\d+\](\.(firstName|lastName))?)?$/, 'defendant-name'],
  [/^defendants\[\d+\]\.address$/, 'defendant-address'],
  [/^tenancy\.(tenancyType|otherTenancyTypeDetails)$/, 'tenancy-type'],
  [/^tenancy\.noTenancyAgreementReason$/, 'tenancy-agreement'],
  [/^grounds$/, 'rent-arrears-claim'],
  [/^grounds\.otherGroundsDetails$/, 'other-grounds'],
  [/^grounds\.groundReasons(\.[A-Z0-9_]+|\.reason)?$/, 'ground-reason'],
  [/^rentArrears\.currentArrears$/, 'current-arrears'],
  [/^notice\.noticeServed$/, 'notice-served'],
  [/^notice\.noticeTypeOther$/, 'notice-type'],
  [/^notice\.noticeUnavailableReason$/, 'notice-available'],
  [/^notice\.(handedToName|emailedTo|otherElectronicDetails|otherMethodDetails)$/, 'notice-method'],
  [/^circumstances\.defendantCircumstances$/, 'defendant-circumstances'],
  [/^circumstances\.claimantCircumstances$/, 'claimant-circumstances'],
  [/^circumstances\.underlesseeName$/, 'underlessee-name'],
  [/^otherInformation\.languageUsed$/, 'language-used'],
  [/^otherInformation\.otherReasonsDetail$/, 'other-reasons'],
  [/^submission\./, 'check-your-answers'],
];

/** Refusals that mean the claimant cannot use the service, by where they are told so. */
const INELIGIBLE_REDIRECTS: Record<string, (caseId: string) => string> = {
  MULTIPLE_CLAIMANTS_NOT_ELIGIBLE: caseId => getStepUrl('multiple-claimants-ineligible', flowConfig, caseId),
  PROPERTY_NOT_IN_ENGLAND: () => `${MAKE_A_CLAIM_START_ROUTE}/property-ineligible`,
};

const ANSWER_REFUSAL = /^(REQUIRED|TOO_LONG):([A-Za-z]+(?:\[\d+\])?(?:\.[A-Za-z0-9_]+)*)$/;

export const DRAFT_CHANGED = 'DRAFT_CHANGED';

const MESSAGE_REFUSALS = ['DRAFT_NOT_FOUND', DRAFT_CHANGED, 'PAYMENT_SERVICE_UNAVAILABLE'];

export const SUBMIT_FAILED = 'failed';

export type SubmitRefusalOutcome = { redirect: string } | { codes: string[] };

/**
 * What to do when the submit fails: send the claimant to an ineligible page, or show them the problems to put
 * right, carried as the codes pcs-api gave (or a general failure) for the check your answers page to explain.
 */
export function submitRefusalOutcome(error: unknown, caseId: string): SubmitRefusalOutcome {
  const reasons = error instanceof CallbackRejectedError ? error.reasons : [];
  const ineligible = reasons.find(reason => INELIGIBLE_REDIRECTS[reason]);
  if (ineligible) {
    return { redirect: INELIGIBLE_REDIRECTS[ineligible](caseId) };
  }
  const known = reasons.filter(reason => ANSWER_REFUSAL.test(reason) || MESSAGE_REFUSALS.includes(reason));
  return { codes: known.length > 0 ? known : [SUBMIT_FAILED] };
}

export interface ErrorSummaryItem {
  text: string;
  href?: string;
}

function stepForPath(path: string, caseId: string): { step: string; href: string } | undefined {
  const step = STEP_FOR_PATH.find(([pattern]) => pattern.test(path))?.[1];
  if (!step) {
    return undefined;
  }
  if (step === 'check-your-answers') {
    return { step, href: path.endsWith('Agreed') ? '#statementOfTruth' : `#${path.split('.').pop()}` };
  }
  const index = Number(/^defendants\[(\d+)\]/.exec(path)?.[1] ?? 0);
  const ground = /^grounds\.groundReasons\.(GROUND_[A-Z0-9]+)$/.exec(path)?.[1];
  const query = ground ? `?ground=${ground}` : step.startsWith('defendant-') && index > 0 ? `?index=${index}` : '';
  return { step, href: `${getStepUrl(step, flowConfig, caseId)}${query}` };
}

/** The error summary for the problems the check your answers page was sent back with, one line each. */
export function submitErrorItems(req: Request, codes: string[]): ErrorSummaryItem[] {
  const t = getTranslationFunction(req, ['makeAClaim', 'common']);
  const caseId = req.res?.locals.validatedCase?.id ?? '';
  const items = codes.map((code): ErrorSummaryItem => {
    const answer = ANSWER_REFUSAL.exec(code);
    if (answer) {
      const target = stepForPath(answer[2], caseId);
      if (target) {
        const page = t(`makeAClaim:submitErrors.pages.${target.step}`);
        return {
          text: t(`makeAClaim:submitErrors.${answer[1] === 'REQUIRED' ? 'required' : 'tooLong'}`, { page }),
          href: target.href,
        };
      }
      return { text: t('makeAClaim:submitErrors.checkAnswers'), href: getStepUrl('task-list', flowConfig, caseId) };
    }
    if (code === 'DRAFT_NOT_FOUND') {
      return { text: t('makeAClaim:submitErrors.draftNotFound'), href: MAKE_A_CLAIM_START_ROUTE };
    }
    if (code === DRAFT_CHANGED) {
      return { text: t('makeAClaim:submitErrors.draftChanged') };
    }
    if (code === 'PAYMENT_SERVICE_UNAVAILABLE') {
      return { text: t('makeAClaim:submitErrors.paymentServiceUnavailable') };
    }
    return { text: t('makeAClaim:submitErrors.failed') };
  });
  return items.filter((item, index) => items.findIndex(other => other.text === item.text) === index);
}

/** The codes a check your answers URL carries, ignoring anything that is not one the page explains. */
export function submitErrorCodes(query: unknown): string[] {
  const raw = Array.isArray(query) ? query.join(',') : typeof query === 'string' ? query : '';
  return raw
    .split(',')
    .filter(code => code === SUBMIT_FAILED || ANSWER_REFUSAL.test(code) || MESSAGE_REFUSALS.includes(code))
    .slice(0, 20);
}

/** Whether a draft save or submit was refused because the claim had been saved since this page loaded it. */
export function isDraftChanged(error: unknown): boolean {
  return error instanceof CallbackRejectedError && error.reasons.includes(DRAFT_CHANGED);
}

/** Check your answers, reloaded with the claim as it is now, explaining it was changed elsewhere. */
export function draftChangedUrl(caseId: string): string {
  return `${getStepUrl('check-your-answers', flowConfig, caseId)}?submitError=${DRAFT_CHANGED}`;
}
