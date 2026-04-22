import { test as base } from '@playwright/test';

import { performAction } from '../controller';

/**
 * Use this instead of `@playwright/test` in specs that create a case and must
 * remove the `[CREATOR]` case role after each test (single `CASE_NUMBER` is overwritten per test).
 */
export const test = base;

test.afterEach(async () => {
  if (process.env.CASE_NUMBER) {
    await performAction('deleteCaseRole', '[CREATOR]');
  }
});

export { expect } from '@playwright/test';
