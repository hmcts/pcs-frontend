import { test as base } from '@playwright/test';
import type { TestFixture } from '@playwright/test';

import { ensureAuthTokens } from '../utils/authTokens';

type AuthTestFixtures = {
  _authHooks: void;
};

const setupAuth: TestFixture<void, object> = async (
  // eslint-disable-next-line no-empty-pattern -- required by Playwright fixture API
  {},
  use,
) => {
  await ensureAuthTokens();
  await use(undefined);
};

export const test = base.extend<AuthTestFixtures>({
  _authHooks: [setupAuth, { scope: 'test', auto: true }],
});

export { expect } from '@playwright/test';
