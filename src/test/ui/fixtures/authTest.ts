import { test as base } from '@playwright/test';

import { ensureAuthTokens } from '../utils/authTokens';

/**
 * S2S + Idam per test (matches behaviour that worked vs globalSetup). Not in globalSetup.
 * Dynamic import of @hmcts/playwright-common is in authTokens (Sauce CJS runner).
 */
base.beforeEach(async () => {
  await ensureAuthTokens();
});

export const test = base;
export { expect } from '@playwright/test';
