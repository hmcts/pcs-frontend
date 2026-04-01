import { test as base } from '@playwright/test';
import type { WorkerFixture } from '@playwright/test';

import { ensureAuthTokens } from '../utils/authTokens';

/**
 * Once per worker — avoids fetching S2S/Idam on every test. Not in globalSetup (Sauce/Jenkins API access).
 * Tokens use dynamic import of @hmcts/playwright-common (Sauce CJS runner).
 */
const setupAuth: WorkerFixture<void, object> = async (
  // eslint-disable-next-line no-empty-pattern -- required by Playwright fixture API
  {},
  use
) => {
  await ensureAuthTokens();
  await use(undefined);
};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Playwright test fixture map has no extra test-scoped fixtures
export const test = base.extend<{}, { _authHooks: void }>({
  _authHooks: [setupAuth, { scope: 'worker', auto: true }],
});

export { expect } from '@playwright/test';
