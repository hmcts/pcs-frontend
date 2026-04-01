import { test as base } from '@playwright/test';

import { ensureAuthTokens } from '../utils/authTokens';

/** Not in globalSetup — Sauce/Jenkins may not reach internal APIs there; refresh each test like the previous beforeEach pattern. */
base.beforeEach(async () => {
  await ensureAuthTokens();
});

export const test = base;
export { expect } from '@playwright/test';
