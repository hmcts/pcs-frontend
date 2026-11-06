import type { Request } from 'express';

import { CallbackRejectedError } from '../../HttpError';
import { MAKE_A_CLAIM_START_ROUTE, PROPERTY_INELIGIBLE_URL } from '../../constants/makeAClaimRoutes';

import { flowConfig } from './flow.config';

import { getTranslationFunction } from '@modules/steps';
import { getStepUrl } from '@modules/steps/flow';

/** pcs-api refusals that are an answer the claimant must change, by the page that asks it. */
const STEP_FOR_PATH: [pattern: RegExp, step: string][] = [
  [/^claimant(\.individualOrOrganisation)?$/, 'individual-or-organisation'],
  [/^claimant\.(firstName|lastName|name)$/, 'claimant-name'],
  [/^claimant\.organisationName$/, 'organisation-name'],
  [/^claimant\.address(\.[A-Za-z0-9]+)?$/, 'claimant-address'],
  [/^claimant\.emailAddress$/, 'claimant-email'],
  [/^claimant\.phoneNumber$/, 'claimant-phone'],
  [/^claimant\.textMessageNumber$/, 'claimant-text-message'],
  [/^defendants(\[\d+\](\.(nameKnown|firstName|lastName))?)?$/, 'defendant-name'],
  [/^defendants\[\d+\]\.(addressKnown|addressSameAsProperty|address(\.[A-Za-z0-9]+)?)$/, 'defendant-address'],
  [/^tenancy\.(tenancyType|otherTenancyTypeDetails)$/, 'tenancy-type'],
  [/^tenancy\.noTenancyAgreementReason$/, 'tenancy-agreement'],
  [/^grounds$/, 'rent-arrears-claim'],
  [/^grounds\.rentArrearsGrounds$/, 'rent-arrears-grounds'],
  [/^grounds\.otherGrounds$/, 'other-grounds'],
  [/^grounds\.otherGroundsDetails$/, 'other-grounds'],
  [/^grounds\.groundReasons(\.[A-Z0-9_]+|\.reason)?$/, 'ground-reason'],
  [/^rentArrears\.currentArrears$/, 'current-arrears'],
  [/^rentArrears\.otherFrequencyDetails$/, 'rent-frequency'],
  [/^rentArrears\.recoverySteps$/, 'recovery-steps'],
  [/^rentArrears\.rentHistoryLedger\[\d+\](\.[A-Za-z]+)?$/, 'ledger-transaction'],
  [/^notice\.noticeServed$/, 'notice-served'],
  [/^notice\.(noticeType|noticeTypeOther)$/, 'notice-type'],
  [/^notice\.noticeDate$/, 'notice-date'],
  [/^notice\.noticeUnavailableReason$/, 'notice-available'],
  [
    /^notice\.(noticeMethods|postedDate|deliveredDate|handedToName|handedDate|emailedTo|emailedDate|otherElectronicDetails|otherElectronicDate|otherMethodDetails|otherMethodDate)$/,
    'notice-method',
  ],
  [/^circumstances\.defendantCircumstances$/, 'defendant-circumstances'],
  [/^circumstances\.claimantCircumstances$/, 'claimant-circumstances'],
  [/^circumstances\.underlesseeName$/, 'underlessee-name'],
  [/^circumstances\.underlesseeAddress(\.[A-Za-z0-9]+)?$/, 'underlessee-address'],
  [/^otherInformation\.languageUsed$/, 'language-used'],
  [/^otherInformation\.otherReasonsDetail$/, 'other-reasons'],
  [/^submission\./, 'check-your-answers'],
];

/** Refusals that mean the claimant cannot use the service, by where they are told so. */
const INELIGIBLE_REDIRECTS: Record<string, (caseId: string) => string> = {
  MULTIPLE_CLAIMANTS_NOT_ELIGIBLE: caseId => getStepUrl('multiple-claimants-ineligible', flowConfig, caseId),
  PROPERTY_NOT_IN_ENGLAND: () => PROPERTY_INELIGIBLE_URL,
};

const ANSWER_REFUSAL = /^(REQUIRED|TOO_LONG):([A-Za-z]+(?:\[\d+\])?(?:\.[A-Za-z0-9_]+(?:\[\d+\])?)*)$/;

export const DRAFT_CHANGED = 'DRAFT_CHANGED';

const OTHER_GROUND_NOT_ALLOWED = 'OTHER_GROUND_NOT_ALLOWED';

const MESSAGE_REFUSALS = ['DRAFT_NOT_FOUND', DRAFT_CHANGED, 'PAYMENT_SERVICE_UNAVAILABLE', OTHER_GROUND_NOT_ALLOWED];

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
  return { step, href: `${getStepUrl(step, flowConfig, caseId)}${queryForPath(path)}` };
}

/** Which defendant, ledger entry or ground a refused path is about, as the page that asks it expects. */
function queryForPath(path: string): string {
  const defendant = Number(/^defendants\[(\d+)\]/.exec(path)?.[1] ?? 0);
  const entry = /^rentArrears\.rentHistoryLedger\[(\d+)\]/.exec(path)?.[1];
  const ground = /^grounds\.groundReasons\.(GROUND_[A-Z0-9]+)$/.exec(path)?.[1];
  if (ground) {
    return `?ground=${ground}`;
  }
  if (entry !== undefined) {
    return `?entry=${entry}`;
  }
  return defendant > 0 ? `?index=${defendant}` : '';
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
    if (code === OTHER_GROUND_NOT_ALLOWED) {
      return {
        text: t('makeAClaim:submitErrors.otherGroundNotAllowed'),
        href: getStepUrl('other-grounds', flowConfig, caseId),
      };
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

/**
 * Whether pcs-api refused a draft save or submit with DRAFT_CHANGED, meaning the draft version sent is no longer
 * the stored one. A repeat of a save that already went through never gets here: saveClaimDraft takes that as done.
 */
export function isDraftChanged(error: unknown): boolean {
  return error instanceof CallbackRejectedError && error.reasons.includes(DRAFT_CHANGED);
}

/** Check your answers, reloaded with the claim as it is now, explaining it was changed elsewhere. */
export function draftChangedUrl(caseId: string): string {
  return `${getStepUrl('check-your-answers', flowConfig, caseId)}?submitError=${DRAFT_CHANGED}`;
}
