import { Page, expect } from '@playwright/test';

async function headingText(page: Page): Promise<string> {
  const heading = page.locator('h1').first();
  await expect(heading).toBeVisible();
  return (await heading.innerText()).trim();
}

async function clickContinue(page: Page): Promise<void> {
  const continueButton = page.getByRole('button', { name: 'Continue', exact: true });
  if (await continueButton.count()) {
    await continueButton.first().click();
    return;
  }

  const submit = page.locator('button[type="submit"], input[type="submit"]').first();
  await expect(submit).toBeVisible();
  await submit.click();
}

async function fillByLabelOrName(page: Page, label: string, name: string, value: string): Promise<void> {
  const labelControl = page.getByLabel(label, { exact: true });
  if (await labelControl.count()) {
    await labelControl.fill(value);
    return;
  }
  await page.locator(`[name="${name}"]`).fill(value);
}

/** Complete either the legacy single-page sign-in or the HMCTS Access email/password journey. */
export async function loginWithIdam(page: Page, email: string, password: string): Promise<void> {
  // As in idam-user-dashboard, identify the journey by its heading. Keep the caller's case URL.
  let currentHeading = await headingText(page);

  // The legacy registration-enabled form shares the Access landing page's heading.
  if (currentHeading === 'Sign in or create an account' && !(await page.locator('[name="password"]').count())) {
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.locator('h1').first()).toHaveText('Enter your email address');
    currentHeading = await headingText(page);
  }

  if (currentHeading === 'Sign in' || currentHeading === 'Sign in or create an account') {
    await fillByLabelOrName(page, 'Email address', 'username', email);
    await fillByLabelOrName(page, 'Password', 'password', password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    return;
  }

  if (currentHeading === 'Enter your email address') {
    await fillByLabelOrName(page, 'Email address', 'email', email);
    await clickContinue(page);
    await expect(page.locator('h1').first()).toHaveText('Enter your password');
    await fillByLabelOrName(page, 'Password', 'password', password);
    await clickContinue(page);
    return;
  }

  if (currentHeading === 'Enter your password') {
    await fillByLabelOrName(page, 'Password', 'password', password);
    await clickContinue(page);
    return;
  }

  throw new Error(`Unexpected login page heading: "${currentHeading}"`);
}
