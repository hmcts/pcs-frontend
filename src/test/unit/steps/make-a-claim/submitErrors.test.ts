import type { Request } from 'express';

import { CallbackRejectedError, HTTPError } from '../../../../main/HttpError';
import {
  draftChangedUrl,
  isDraftChanged,
  submitErrorCodes,
  submitErrorItems,
  submitRefusalOutcome,
} from '../../../../main/steps/make-a-claim/submitErrors';

jest.mock('@modules/steps', () => ({
  getTranslationFunction: () => (key: string, options?: { page?: string }) =>
    options?.page ? `${key}(${options.page})` : key,
}));

const CASE = '1777027600017761';
const claimPage = (step: string) => `/case/${CASE}/make-a-claim/${step}`;

function request(): Request {
  return { res: { locals: { validatedCase: { id: CASE } } } } as unknown as Request;
}

const refused = (...reasons: string[]) => new CallbackRejectedError(reasons, 422);

describe('submitRefusalOutcome', () => {
  it('sends a claim with other claimants to the ineligible page', () => {
    expect(submitRefusalOutcome(refused('REQUIRED:claimant.address', 'MULTIPLE_CLAIMANTS_NOT_ELIGIBLE'), CASE)).toEqual(
      {
        redirect: claimPage('multiple-claimants-ineligible'),
      }
    );
  });

  it('sends a property outside England to the property ineligible page', () => {
    expect(submitRefusalOutcome(refused('PROPERTY_NOT_IN_ENGLAND'), CASE)).toEqual({
      redirect: '/make-a-claim/property-ineligible',
    });
  });

  it('keeps the answer and message refusals for the page to explain', () => {
    expect(
      submitRefusalOutcome(
        refused('REQUIRED:defendants[1].address', 'TOO_LONG:claimant.organisationName', 'DRAFT_NOT_FOUND', 'OTHER'),
        CASE
      )
    ).toEqual({ codes: ['REQUIRED:defendants[1].address', 'TOO_LONG:claimant.organisationName', 'DRAFT_NOT_FOUND'] });
  });

  it.each([
    ['an unexplained refusal', refused('This service is not available')],
    ['a failure', new HTTPError('CCD down', 502)],
  ])('falls back to a general failure for %s', (_case, error) => {
    expect(submitRefusalOutcome(error, CASE)).toEqual({ codes: ['failed'] });
  });
});

describe('submitErrorItems', () => {
  const items = (...codes: string[]) => submitErrorItems(request(), codes);

  it.each([
    ['REQUIRED:claimant.address', claimPage('claimant-address')],
    ['REQUIRED:claimant.firstName', claimPage('claimant-name')],
    ['TOO_LONG:claimant.organisationName', claimPage('organisation-name')],
    ['TOO_LONG:claimant.emailAddress', claimPage('claimant-email')],
    ['REQUIRED:defendants', claimPage('defendant-name')],
    ['REQUIRED:defendants[0].lastName', claimPage('defendant-name')],
    ['REQUIRED:defendants[2].firstName', `${claimPage('defendant-name')}?index=2`],
    ['REQUIRED:defendants[1].address', `${claimPage('defendant-address')}?index=1`],
    ['REQUIRED:tenancy.otherTenancyTypeDetails', claimPage('tenancy-type')],
    ['REQUIRED:grounds', claimPage('rent-arrears-claim')],
    ['TOO_LONG:grounds.groundReasons.reason', claimPage('ground-reason')],
    ['REQUIRED:grounds.groundReasons.GROUND_14ZA', `${claimPage('ground-reason')}?ground=GROUND_14ZA`],
    ['REQUIRED:grounds.otherGroundsDetails', claimPage('other-grounds')],
    ['REQUIRED:rentArrears.currentArrears', claimPage('current-arrears')],
    ['TOO_LONG:notice.noticeTypeOther', claimPage('notice-type')],
    ['TOO_LONG:notice.emailedTo', claimPage('notice-method')],
    ['REQUIRED:circumstances.underlesseeName', claimPage('underlessee-name')],
    ['REQUIRED:otherInformation.languageUsed', claimPage('language-used')],
    ['REQUIRED:submission.statementOfTruthAgreed', '#statementOfTruth'],
    ['TOO_LONG:submission.statementOfTruthFullName', '#statementOfTruthFullName'],
  ])('links %s to %s', (code, href) => {
    expect(items(code)).toEqual([{ text: expect.any(String), href }]);
  });

  it('says whether an answer is missing or too long', () => {
    const [missing] = items('REQUIRED:claimant.address');
    const [tooLong] = items('TOO_LONG:claimant.address');
    expect(missing.text).toBe('makeAClaim:submitErrors.required(makeAClaim:submitErrors.pages.claimant-address)');
    expect(tooLong.text).toBe('makeAClaim:submitErrors.tooLong(makeAClaim:submitErrors.pages.claimant-address)');
  });

  it('sends a path it does not know to the task list', () => {
    expect(items('REQUIRED:somethingNew')).toEqual([
      { text: 'makeAClaim:submitErrors.checkAnswers', href: claimPage('task-list') },
    ]);
  });

  it('explains a lost draft, one changed elsewhere, the payment service being down, and anything else', () => {
    expect(items('DRAFT_NOT_FOUND', 'DRAFT_CHANGED', 'PAYMENT_SERVICE_UNAVAILABLE', 'failed')).toEqual([
      { text: 'makeAClaim:submitErrors.draftNotFound', href: '/make-a-claim' },
      { text: 'makeAClaim:submitErrors.draftChanged' },
      { text: 'makeAClaim:submitErrors.paymentServiceUnavailable' },
      { text: 'makeAClaim:submitErrors.failed' },
    ]);
  });

  it('shows the same problem once', () => {
    expect(items('REQUIRED:claimant.firstName', 'REQUIRED:claimant.lastName')).toHaveLength(1);
  });
});

describe('draft changed elsewhere', () => {
  it('is recognised from the refusal and sends the claimant to check their answers again', () => {
    expect(isDraftChanged(refused('DRAFT_CHANGED'))).toBe(true);
    expect(isDraftChanged(refused('DRAFT_NOT_FOUND'))).toBe(false);
    expect(isDraftChanged(new Error('DRAFT_CHANGED'))).toBe(false);
    expect(draftChangedUrl(CASE)).toBe(`${claimPage('check-your-answers')}?submitError=DRAFT_CHANGED`);
  });
});

describe('submitErrorCodes', () => {
  it('reads only the codes the page explains', () => {
    expect(submitErrorCodes('REQUIRED:claimant.address,<script>,DRAFT_NOT_FOUND,failed')).toEqual([
      'REQUIRED:claimant.address',
      'DRAFT_NOT_FOUND',
      'failed',
    ]);
    expect(submitErrorCodes(undefined)).toEqual([]);
  });
});
