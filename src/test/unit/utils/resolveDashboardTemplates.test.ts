import type { TFunction } from 'i18next';

import { lookup, resolveNotification, resolveTask } from '@utils/resolveDashboardTemplates';

const MISSING = '__MISSING_TRANSLATION__';

function createT(map: Record<string, string | ((opts: Record<string, unknown>) => string)>): TFunction {
  return ((key: string, opts?: Record<string, unknown> & { defaultValue?: string }) => {
    const entry = map[key];
    if (typeof entry === 'function') {
      return entry(opts ?? {});
    }
    if (typeof entry === 'string') {
      return entry;
    }
    return opts?.defaultValue ?? MISSING;
  }) as TFunction;
}

describe('resolveDashboardTemplates', () => {
  describe('lookup', () => {
    it('returns null when translation is missing (defaultValue path)', () => {
      const t = createT({});
      expect(lookup(t, 'dashboard:tasks.other.title')).toBeNull();
    });

    it('returns translated string when key exists', () => {
      const t = createT({ 'dashboard:tasks.statuses.AVAILABLE': 'Available' });
      expect(lookup(t, 'dashboard:tasks.statuses.AVAILABLE')).toBe('Available');
    });

    it('passes interpolation values to t()', () => {
      const t = jest.fn((key: string, opts?: Record<string, unknown>) => {
        if (key === 'dashboard:example') {
          return `Hello ${opts?.name as string}`;
        }
        return MISSING;
      }) as unknown as TFunction;

      expect(lookup(t, 'dashboard:example', { name: 'Pat' })).toBe('Hello Pat');
    });
  });

  describe('resolveNotification', () => {
    describe('date values', () => {
      const t = createT({
        'dashboard:notifications.Defendant.CaseIssued.title': 'Case issued',
        'dashboard:notifications.Defendant.CaseIssued.body': opts => `Respond by ${opts.responseEndDate as string}.`,
      });

      it('shows an ISO date in Welsh on a Welsh page', () => {
        expect(
          resolveNotification(t, 'Defendant.CaseIssued', { responseEndDate: '2026-11-12' }, '1234567890123456', 'cy')
            ?.body
        ).toBe('Respond by 12 Tachwedd 2026.');
      });

      it('shows an ISO date in English on an English page', () => {
        expect(
          resolveNotification(t, 'Defendant.CaseIssued', { responseEndDate: '2026-11-12' }, '1234567890123456', 'en')
            ?.body
        ).toBe('Respond by 12 November 2026.');
      });

      it('leaves values that are not ISO dates exactly as sent', () => {
        expect(
          resolveNotification(
            t,
            'Defendant.CaseIssued',
            { responseEndDate: '12 November 2026' },
            '1234567890123456',
            'cy'
          )?.body
        ).toBe('Respond by 12 November 2026.');
      });

      it('changes nothing when no page language is given', () => {
        expect(
          resolveNotification(t, 'Defendant.CaseIssued', { responseEndDate: '2026-11-12' }, '1234567890123456')?.body
        ).toBe('Respond by 2026-11-12.');
      });
    });

    it('returns null when title is missing', () => {
      const t = createT({
        'dashboard:notifications.Defendant.Foo.body': 'Body only',
      });
      expect(resolveNotification(t, 'Defendant.Foo', {}, '1234567890123456')).toBeNull();
    });

    it('returns null when body is missing', () => {
      const t = createT({
        'dashboard:notifications.Defendant.Foo.title': 'Title only',
      });
      expect(resolveNotification(t, 'Defendant.Foo', {}, '1234567890123456')).toBeNull();
    });

    it('merges caseReference into values passed to body lookup', () => {
      const t = createT({
        'dashboard:notifications.Defendant.Foo.title': 'Title',
        'dashboard:notifications.Defendant.Foo.body': opts => `Case ref in body: ${String(opts.caseReference)}`,
      });

      expect(resolveNotification(t, 'Defendant.Foo', { extra: 'x' }, '999')).toEqual({
        title: 'Title',
        body: 'Case ref in body: 999',
      });
    });

    it('parses feeAmount as a number and includes payCounterclaimFeeUrl for unpaid counterclaim notification', () => {
      const t = jest.fn((key: string, opts?: Record<string, unknown>) => {
        if (key === 'dashboard:notifications.Defendant.CounterClaimFeeUnpaid.title') {
          return 'Your response';
        }
        if (key === 'dashboard:notifications.Defendant.CounterClaimFeeUnpaid.body') {
          return `Fee ${String(opts?.feeAmount)} link ${String(opts?.payCounterclaimFeeUrl)}`;
        }
        return MISSING;
      }) as unknown as TFunction;

      expect(resolveNotification(t, 'Defendant.CounterClaimFeeUnpaid', { feeAmount: '404.00' }, '1234')).toEqual({
        title: 'Your response',
        body: 'Fee 404 link /case/1234/respond-to-claim/counter-claim-application-fee-amount?from=dashboard',
      });
      expect(t).toHaveBeenCalledWith(
        'dashboard:notifications.Defendant.CounterClaimFeeUnpaid.body',
        expect.objectContaining({
          feeAmount: 404,
          payCounterclaimFeeUrl: '/case/1234/respond-to-claim/counter-claim-application-fee-amount?from=dashboard',
        })
      );
    });
  });

  describe('resolveTask', () => {
    it('returns null when task title key is missing', () => {
      const t = createT({});
      expect(resolveTask(t, 'MissingTask')).toBeNull();
    });

    it('returns title when task translation exists', () => {
      const t = createT({
        'dashboard:tasks.ViewClaim.title': 'View the claim',
      });
      expect(resolveTask(t, 'ViewClaim')).toEqual({ title: 'View the claim' });
    });
  });
});
