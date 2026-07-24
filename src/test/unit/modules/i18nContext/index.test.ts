import type { TFunction } from 'i18next';

import { getRequestLang, getRequestT, runWithRequestI18n } from '@modules/i18nContext';

describe('i18nContext', () => {
  const makeT = (returnValue: string): TFunction => ((..._args: unknown[]) => returnValue) as unknown as TFunction;

  it('returns fallback values when called outside a request context', () => {
    const t = getRequestT();
    expect(t('any.key', 'default')).toBe('default');
    expect(t(['k1', 'k2'])).toBe('k1');
    expect(getRequestLang()).toBe('en');
  });

  it('exposes the context values inside runWithRequestI18n', () => {
    const t = makeT('welsh-translation');
    runWithRequestI18n({ t, lang: 'cy' }, () => {
      expect(getRequestT()).toBe(t);
      expect(getRequestT()('anything')).toBe('welsh-translation');
      expect(getRequestLang()).toBe('cy');
    });
  });

  it('isolates context across two interleaved requests via AsyncLocalStorage', async () => {
    const tA = makeT('A');
    const tB = makeT('B');

    const observed: string[] = [];

    const requestA = runWithRequestI18n({ t: tA, lang: 'en' }, async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
      observed.push(`A:${getRequestT()('x')}`);
    });

    const requestB = runWithRequestI18n({ t: tB, lang: 'cy' }, async () => {
      await new Promise(resolve => setTimeout(resolve, 5));
      observed.push(`B:${getRequestT()('x')}`);
    });

    await Promise.all([requestA, requestB]);

    expect(observed).toContain('A:A');
    expect(observed).toContain('B:B');
  });

  it('returns the fallback again after the context exits', () => {
    runWithRequestI18n({ t: makeT('in'), lang: 'cy' }, () => {
      expect(getRequestT()('x')).toBe('in');
    });
    expect(getRequestT()('x', 'default')).toBe('default');
    expect(getRequestLang()).toBe('en');
  });
});
