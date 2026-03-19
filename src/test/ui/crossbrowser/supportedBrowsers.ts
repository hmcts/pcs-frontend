/**
 * Mirrors probate-frontend `test/crossbrowser/supportedBrowsers.js` (Chrome/Firefox × Win/Mac).
 * Probate also lists Safari in JS but `run-crossbrowser-tests.sh` only runs chrome + firefox — same here.
 *
 * **Keep in sync** with `.sauce/config.yml` `suites[].name` (exact strings for `saucectl --select-suite`).
 */
export const sauceSuites = {
  chrome: ['PCS crossbrowser chrome windows', 'PCS crossbrowser chrome mac'] as const,
  firefox: ['PCS crossbrowser firefox windows', 'PCS crossbrowser firefox mac'] as const,
} as const;

export type CrossbrowserBrowserGroup = keyof typeof sauceSuites;

export const isCrossbrowserBrowserGroup = (v: string): v is CrossbrowserBrowserGroup =>
  v === 'chrome' || v === 'firefox';
