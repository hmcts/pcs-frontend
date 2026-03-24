import { Page } from '@playwright/test';

import { performAction } from '../../controller';
import { IAction, actionData } from '../../interfaces';

export class LoginAction implements IAction {
  async execute(page: Page, action: string, userType?: actionData, roles?: actionData): Promise<void> {
    const actionsMap = new Map<string, () => Promise<void>>([
      ['createUser', () => this.createUser(userType as string, roles as string[])],
      ['login', () => this.login(page)],
      ['generateCitizenAccessToken', () => this.generateCitizenAccessToken()],
    ]);
    const actionToPerform = actionsMap.get(action);
    if (!actionToPerform) {
      throw new Error(`No action found for '${action}'`);
    }
    await actionToPerform();
  }

  /**
   * GOV.UK cookie banner on Idam / hmcts-access can steal focus or update the DOM while Playwright runs CDP
   * actions — dismiss it before typing credentials (no-op if already accepted or absent).
   */
  private async acceptGovUkCookieBannerIfPresent(page: Page): Promise<void> {
    const banner = page.locator('.govuk-cookie-banner');
    const bannerVisible = await banner.isVisible({ timeout: 2_000 }).catch(() => false);
    if (!bannerVisible) {
      return;
    }

    const acceptPreferred = page.getByRole('button', {
      name: /accept (analytics|additional) cookies/i,
    });
    try {
      await acceptPreferred.first().waitFor({ state: 'visible', timeout: 5_000 });
      await acceptPreferred.first().click();
      await banner.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
    } catch {
      try {
        await banner.getByRole('button', { name: /^accept/i }).first().click({ timeout: 3_000 });
        await banner.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
      } catch {
        /* non-standard banner — continue; login may still work */
      }
    }
  }

  private async login(page: Page) {
    console.log('[login] Signing in with Idam email:', process.env.IDAM_PCS_USER_EMAIL ?? '(unset)');
    await this.acceptGovUkCookieBannerIfPresent(page);
    await performAction('inputText', 'Email address', process.env.IDAM_PCS_USER_EMAIL);
    await performAction('inputText', 'Password', process.env.IDAM_PCS_USER_PASSWORD);
    await performAction('clickButton', 'Sign in');
  }

  private async createUser(userType: string, roles: string[]): Promise<void> {
    const token = process.env.BEARER_TOKEN as string;
    const password = process.env.IDAM_PCS_USER_PASSWORD as string;
    const random7Digit = Math.floor(1000000 + Math.random() * 9000000);
    const email = (process.env.IDAM_PCS_USER_EMAIL = `TEST_PCS_USER.${userType}.${random7Digit}@test.test`);
    const forename = 'fn_' + random7Digit;
    const surname = 'sn_' + random7Digit;
    const { IdamUtils } = await import('@hmcts/playwright-common');
    await new IdamUtils().createUser({
      bearerToken: token,
      password,
      user: {
        email,
        forename,
        surname,
        roleNames: roles,
      },
    });
    console.log('[login] Created Idam user for tests:', email);
    await this.generateCitizenAccessToken();
  }

  private async generateCitizenAccessToken(): Promise<void> {
    const { IdamUtils } = await import('@hmcts/playwright-common');
    process.env.CITIZEN_ACCESS_TOKEN = await new IdamUtils().generateIdamToken({
      username: process.env.IDAM_PCS_USER_EMAIL,
      password: process.env.IDAM_PCS_USER_PASSWORD,
      grantType: 'password',
      clientId: 'pcs-frontend',
      clientSecret: process.env.PCS_FRONTEND_IDAM_SECRET as string,
      scope: 'profile openid roles',
    });
  }
}
