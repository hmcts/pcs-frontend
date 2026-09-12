import { AsyncLocalStorage } from 'node:async_hooks';

import type { TFunction } from 'i18next';

interface RequestI18nContext {
  t: TFunction;
  lang: string;
}

const storage = new AsyncLocalStorage<RequestI18nContext>();

// Inlined here (not imported from @modules/i18n) to avoid a circular module
// dependency: @modules/i18n is what populates this context.
const fallbackT = ((key: string | string[], defaultValue?: string) =>
  Array.isArray(key) ? key[0] : (defaultValue ?? key)) as unknown as TFunction;

/** Run `fn` inside a request-scoped i18n context. Use from per-request middleware. */
export function runWithRequestI18n<T>(ctx: RequestI18nContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

/** Get the request-scoped translation function, or a fallback if called outside a request. */
export function getRequestT(): TFunction {
  return storage.getStore()?.t ?? fallbackT;
}

/** Get the request-scoped language, or 'en' if called outside a request. */
export function getRequestLang(): string {
  return storage.getStore()?.lang ?? 'en';
}
