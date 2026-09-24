jest.mock('@utils/isCuiYourSupportEnabled', () => ({
  isCuiYourSupportEnabled: jest.fn(),
}));
jest.mock('@routes/dashboard', () => ({
  getDashboardUrl: jest.fn((caseReference?: string) => (caseReference ? `/case/${caseReference}/dashboard` : null)),
}));

import type { Request } from 'express';

import {
  YOUR_SUPPORT_SECTION_ENUM,
  addYourSupportToCompletedSections,
  getYourSupportReturnUrl,
  getYourSupportTriageUrl,
  isYourSupportSectionComplete,
  rememberYourSupportOrigin,
} from '../../../../main/steps/respond-to-claim/yourSupportSection';

const CASE = '1234123412341234';
const OTHER_CASE = '9876987698769876';
const SUBMITTED = { possessionClaimResponse: { defendantResponses: { status: 'SUBMITTED' } } };

// A request with just what the origin functions read: the query, the session, and the validated case.
const build = (options: {
  id?: string;
  query?: Record<string, unknown>;
  recorded?: Record<string, 'dashboard' | 'task-list'>;
  session?: false;
  submitted?: boolean;
}): Request =>
  ({
    query: options.query ?? {},
    session: options.session === false ? undefined : { yourSupportReturnTo: options.recorded },
    res: {
      locals: {
        validatedCase:
          options.id === undefined ? undefined : { id: options.id, data: options.submitted ? SUBMITTED : {} },
      },
    },
  }) as unknown as Request;

describe('yourSupportSection', () => {
  it('maps the section id to the enum value pcs-api stores in completedSections', () => {
    expect(YOUR_SUPPORT_SECTION_ENUM).toBe('YOUR_SUPPORT');
  });

  describe('addYourSupportToCompletedSections', () => {
    it('adds the marker to an empty or missing list', () => {
      expect(addYourSupportToCompletedSections(undefined)).toEqual(['YOUR_SUPPORT']);
      expect(addYourSupportToCompletedSections([])).toEqual(['YOUR_SUPPORT']);
    });

    it('preserves other completed sections and never duplicates the marker', () => {
      expect(addYourSupportToCompletedSections(['PERSONAL_DETAILS'])).toEqual(['PERSONAL_DETAILS', 'YOUR_SUPPORT']);
      expect(addYourSupportToCompletedSections(['PERSONAL_DETAILS', 'YOUR_SUPPORT'])).toEqual([
        'PERSONAL_DETAILS',
        'YOUR_SUPPORT',
      ]);
    });

    it('returns a new array rather than mutating the input', () => {
      const input = ['PERSONAL_DETAILS'] as const;
      const result = addYourSupportToCompletedSections(input);
      expect(result).not.toBe(input);
      expect(input).toEqual(['PERSONAL_DETAILS']);
    });
  });

  describe('isYourSupportSectionComplete', () => {
    it('is false without a response, without defendantResponses, or without the marker', () => {
      expect(isYourSupportSectionComplete(undefined)).toBe(false);
      expect(isYourSupportSectionComplete({})).toBe(false);
      expect(isYourSupportSectionComplete({ defendantResponses: { completedSections: ['PERSONAL_DETAILS'] } })).toBe(
        false
      );
    });

    it('is true once the marker is present', () => {
      expect(isYourSupportSectionComplete({ defendantResponses: { completedSections: ['YOUR_SUPPORT'] } })).toBe(true);
    });
  });
});

describe('rememberYourSupportOrigin', () => {
  it("records 'dashboard' against the case when reached with ?from=dashboard", () => {
    const req = build({ id: CASE, query: { from: 'dashboard' } });

    rememberYourSupportOrigin(req);

    expect(req.session.yourSupportReturnTo).toEqual({ [CASE]: 'dashboard' });
  });

  it("records 'task-list' against the case when reached with ?from=task-list", () => {
    const req = build({ id: CASE, query: { from: 'task-list' } });

    rememberYourSupportOrigin(req);

    expect(req.session.yourSupportReturnTo).toEqual({ [CASE]: 'task-list' });
  });

  it('leaves the recorded origin alone when from is absent (language toggle, reload, retry)', () => {
    const req = build({ id: CASE, query: { lang: 'cy' }, recorded: { [CASE]: 'dashboard' } });

    rememberYourSupportOrigin(req);

    expect(req.session.yourSupportReturnTo).toEqual({ [CASE]: 'dashboard' });
  });

  it('does not trust arbitrary from values', () => {
    const req = build({ id: CASE, query: { from: 'https://evil.example' }, recorded: { [CASE]: 'dashboard' } });

    rememberYourSupportOrigin(req);

    expect(req.session.yourSupportReturnTo).toEqual({ [CASE]: 'dashboard' });
  });

  it('keeps origins for other cases when recording this one', () => {
    const req = build({ id: CASE, query: { from: 'task-list' }, recorded: { [OTHER_CASE]: 'dashboard' } });

    rememberYourSupportOrigin(req);

    expect(req.session.yourSupportReturnTo).toEqual({ [OTHER_CASE]: 'dashboard', [CASE]: 'task-list' });
  });

  it('is a no-op without a session or a case reference', () => {
    expect(() =>
      rememberYourSupportOrigin(build({ id: CASE, query: { from: 'dashboard' }, session: false }))
    ).not.toThrow();
    const noCase = build({ query: { from: 'dashboard' } });
    rememberYourSupportOrigin(noCase);
    expect(noCase.session.yourSupportReturnTo).toBeUndefined();
  });
});

describe('getYourSupportReturnUrl', () => {
  it('returns the dashboard when the recorded origin for this case is the dashboard', () => {
    expect(getYourSupportReturnUrl(build({ id: CASE, recorded: { [CASE]: 'dashboard' } }))).toBe(
      `/case/${CASE}/dashboard`
    );
  });

  it('returns the task list when the recorded origin for this case is the task list', () => {
    expect(getYourSupportReturnUrl(build({ id: CASE, recorded: { [CASE]: 'task-list' } }))).toBe(
      `/case/${CASE}/respond-to-claim/task-list`
    );
  });

  it('ignores an origin recorded for a different case', () => {
    expect(getYourSupportReturnUrl(build({ id: CASE, recorded: { [OTHER_CASE]: 'dashboard' } }))).toBe(
      `/case/${CASE}/respond-to-claim/task-list`
    );
  });

  it('falls back to the task list before the response is submitted when nothing was recorded', () => {
    expect(getYourSupportReturnUrl(build({ id: CASE }))).toBe(`/case/${CASE}/respond-to-claim/task-list`);
  });

  it('falls back to the dashboard after the response is submitted when nothing was recorded', () => {
    expect(getYourSupportReturnUrl(build({ id: CASE, submitted: true }))).toBe(`/case/${CASE}/dashboard`);
  });

  it('is undefined when no case reference is available', () => {
    expect(getYourSupportReturnUrl(build({ recorded: { [CASE]: 'dashboard' } }))).toBeUndefined();
  });
});

describe('getYourSupportTriageUrl', () => {
  it('carries the recorded origin so a retry re-enters with it', () => {
    expect(getYourSupportTriageUrl(build({ id: CASE, recorded: { [CASE]: 'dashboard' } }))).toBe(
      `/case/${CASE}/respond-to-claim/reasonable-adjustments-triage?from=dashboard`
    );
  });

  it('uses the same fallback as the return url when nothing was recorded', () => {
    expect(getYourSupportTriageUrl(build({ id: CASE }))).toBe(
      `/case/${CASE}/respond-to-claim/reasonable-adjustments-triage?from=task-list`
    );
    expect(getYourSupportTriageUrl(build({ id: CASE, submitted: true }))).toBe(
      `/case/${CASE}/respond-to-claim/reasonable-adjustments-triage?from=dashboard`
    );
  });

  it('is undefined when no case reference is available', () => {
    expect(getYourSupportTriageUrl(build({}))).toBeUndefined();
  });
});
