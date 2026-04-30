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
  });

  describe('resolveTask', () => {
    it('returns null when task title key is missing', () => {
      const t = createT({});
      expect(resolveTask(t, 'Defendant.MissingTask')).toBeNull();
    });

    it('returns title when task translation exists', () => {
      const t = createT({
        'dashboard:tasks.Defendant.ViewClaim.title': 'View the claim',
      });
      expect(resolveTask(t, 'Defendant.ViewClaim')).toEqual({ title: 'View the claim' });
    });
  });
});
