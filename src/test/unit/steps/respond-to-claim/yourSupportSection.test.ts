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
  isYourSupportSectionComplete,
  rememberYourSupportOrigin,
} from '../../../../main/steps/respond-to-claim/yourSupportSection';

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
  const reqWith = (query: Record<string, unknown>, session: Record<string, unknown> | undefined): Request =>
    ({ query, session }) as unknown as Request;

  it("records 'dashboard' when the triage was reached with ?from=dashboard", () => {
    const req = reqWith({ from: 'dashboard' }, {});

    rememberYourSupportOrigin(req);

    expect(req.session.yourSupportReturnTo).toBe('dashboard');
  });

  it("records 'task-list' for any other entry, replacing an earlier dashboard origin", () => {
    const req = reqWith({}, { yourSupportReturnTo: 'dashboard' });

    rememberYourSupportOrigin(req);

    expect(req.session.yourSupportReturnTo).toBe('task-list');
  });

  it('does not trust arbitrary ?from values', () => {
    const req = reqWith({ from: 'https://evil.example' }, {});

    rememberYourSupportOrigin(req);

    expect(req.session.yourSupportReturnTo).toBe('task-list');
  });

  it('is a no-op without a session', () => {
    expect(() => rememberYourSupportOrigin(reqWith({ from: 'dashboard' }, undefined))).not.toThrow();
  });
});

describe('getYourSupportReturnUrl', () => {
  const build = (options: { id?: string; origin?: 'dashboard' | 'task-list'; submitted?: boolean }): Request =>
    ({
      session: options.origin ? { yourSupportReturnTo: options.origin } : {},
      res: {
        locals: {
          validatedCase:
            options.id === undefined
              ? undefined
              : {
                  id: options.id,
                  data: options.submitted
                    ? { possessionClaimResponse: { defendantResponses: { status: 'SUBMITTED' } } }
                    : {},
                },
        },
      },
    }) as unknown as Request;

  it('returns the dashboard when the recorded origin is the dashboard', () => {
    expect(getYourSupportReturnUrl(build({ id: '123', origin: 'dashboard' }))).toBe('/case/123/dashboard');
  });

  it('returns the task list when the recorded origin is the task list', () => {
    expect(getYourSupportReturnUrl(build({ id: '123', origin: 'task-list' }))).toBe(
      '/case/123/respond-to-claim/task-list'
    );
  });

  it('falls back to the task list before the response is submitted when nothing was recorded', () => {
    expect(getYourSupportReturnUrl(build({ id: '123' }))).toBe('/case/123/respond-to-claim/task-list');
  });

  it('falls back to the dashboard after the response is submitted when nothing was recorded', () => {
    expect(getYourSupportReturnUrl(build({ id: '123', submitted: true }))).toBe('/case/123/dashboard');
  });

  it('is undefined when no case reference is available', () => {
    expect(getYourSupportReturnUrl(build({ origin: 'dashboard' }))).toBeUndefined();
  });
});
