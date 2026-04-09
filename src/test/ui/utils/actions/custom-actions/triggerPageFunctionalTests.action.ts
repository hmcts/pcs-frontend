import * as fs from 'fs';
import * as path from 'path';

import { Page, test } from '@playwright/test';

import {
  enable_content_validation,
  enable_error_message_validation,
  enable_navigation_tests,
  enable_pft_debug_log,
} from '../../../../../../playwright.config';
import { shortUrl, truncateForLog } from '../../common/string.utils';
import { IAction } from '../../interfaces';
import {
  ErrorMessageValidation,
  PageContentValidation,
  PageNavigationValidation,
} from '../../validations/custom-validations';

export class TriggerPageFunctionalTestsAction implements IAction {
  private static readonly LOCK_DIR = path.join(process.cwd(), 'test-results', 'pft-locks');
  private static readonly MAPPING_PATH = path.join(__dirname, '../../../config/urlToFileMapping.config.ts');
  private static readonly PFT_DIR = path.join(__dirname, '../../../functional');
  private static readonly PAGE_DATA_DIR = path.join(__dirname, '../../../data/page-data');

  private static pagesTestedInCurrentRun = new Set<string>();

  static resetTestedPages(): void {
    TriggerPageFunctionalTestsAction.pagesTestedInCurrentRun.clear();
  }

  async execute(page: Page): Promise<void> {
    await this.triggerPageFunctionalTests(page);
  }

  private async triggerPageFunctionalTests(page: Page): Promise<void> {
    const pageName = await this.getFileNameForPage(page);
    const flowTestTitle = truncateForLog(test.info().title, 160);

    if (!pageName) {
      console.warn(
        `[PFT flow] test="${flowTestTitle}" | mapping missing in urlToFileMapping.config.ts | url=${shortUrl(page.url())}`
      );
      return;
    }

    // // Check lock file before running tests
    // const lockPath = path.join(TriggerPageFunctionalTestsAction.LOCK_DIR, `${pageName}.lock`);
    // if (fs.existsSync(lockPath)) {
    //   return; // Skip if lock file exists (page already passed all tests)
    // }

    if (TriggerPageFunctionalTestsAction.pagesTestedInCurrentRun.has(pageName)) {
      return;
    }

    if (enable_pft_debug_log === 'true') {
      console.log(`[PFT] Triggering Functional Tests for Page: ${pageName} and URL: ${shortUrl(page.url())}`);
    }

    TriggerPageFunctionalTestsAction.pagesTestedInCurrentRun.add(pageName);

    const pageDataFilePath = path.join(TriggerPageFunctionalTestsAction.PAGE_DATA_DIR, `${pageName}.page.data.ts`);
    const pageDataFileExists = fs.existsSync(pageDataFilePath);

    if (enable_content_validation === 'true') {
      if (pageDataFileExists) {
        PageContentValidation.trackPageWithData(pageName);
        await this.runPageContentValidation(page, pageName);
      } else {
        PageContentValidation.trackMissingDataFile(pageName);
      }
    }

    const pftFilePath = path.join(TriggerPageFunctionalTestsAction.PFT_DIR, `${pageName}.pft.ts`);
    const pftFileExists = fs.existsSync(pftFilePath);

    if (!pftFileExists) {
      if (enable_error_message_validation === 'true') {
        ErrorMessageValidation.trackMissingEMVFile(pageName);
      }
      if (enable_navigation_tests === 'true') {
        PageNavigationValidation.trackMissingNavigationFile(pageName);
      }
      return;
    }

    let errorValidationFailed = false;
    let navigationTestsFailed = false;

    // Parent step that groups all functional tests for this page
    await test.step(`PFT triggered for page - ${pageName}`, async () => {
      if (enable_error_message_validation === 'true') {
        await test.step(`EMV triggered for page - ${pageName}`, async () => {
          try {
            await this.runErrorMessageValidation(page, pageName, pftFilePath);
          } catch (error) {
            ErrorMessageValidation.trackValidationError(pageName, error);
            errorValidationFailed = true;
          }
        });
      }

      if (enable_navigation_tests === 'true') {
        await test.step(`Navigation tests triggered for page - ${pageName}`, async () => {
          try {
            await this.runNavigationTests(page, pageName, pftFilePath);
          } catch (error) {
            PageNavigationValidation.trackNavigationFailure(pageName, error);
            navigationTestsFailed = true;
          }
        });
      }
    });

    // Update the permanent lock file based on the test outcome
    const anyTestFailed = errorValidationFailed || navigationTestsFailed;
    if (anyTestFailed) {
      // Failure: ensure lock file is removed (if it existed)
      this.deleteLockFile(pageName);
    } else {
      // Success: create/keep lock file
      this.createLockFile(pageName);
    }
  }

  private createLockFile(pageName: string): void {
    try {
      if (!fs.existsSync(TriggerPageFunctionalTestsAction.LOCK_DIR)) {
        fs.mkdirSync(TriggerPageFunctionalTestsAction.LOCK_DIR, { recursive: true });
      }
      const lockPath = path.join(TriggerPageFunctionalTestsAction.LOCK_DIR, `${pageName}.lock`);
      fs.writeFileSync(lockPath, process.pid.toString(), { flag: 'wx' });
    } catch {
      // Ignore lock file creation errors (e.g., file already exists)
    }
  }

  private deleteLockFile(pageName: string): void {
    try {
      const lockPath = path.join(TriggerPageFunctionalTestsAction.LOCK_DIR, `${pageName}.lock`);
      if (fs.existsSync(lockPath)) {
        fs.unlinkSync(lockPath);
      }
    } catch (_error) {
      console.error(_error);
    }
  }

  private async runPageContentValidation(page: Page, pageName: string): Promise<void> {
    try {
      await test.step(`Page content validation for ${pageName}`, async () => {
        const validation = new PageContentValidation();
        await validation.validateCurrentPage(page, pageName);
      });
    } catch (error) {
      PageContentValidation.trackValidationError(pageName, error);
    }
  }

  private async runErrorMessageValidation(page: Page, pageName: string, pftFilePath: string): Promise<void> {
    delete require.cache[require.resolve(pftFilePath)];
    const pftModule = require(pftFilePath);

    const methodName = `${pageName}ErrorValidation`;
    const validationFunction = pftModule[methodName];

    if (typeof validationFunction === 'function') {
      ErrorMessageValidation.trackPageWithEMV(pageName);
      await validationFunction(page);
      ErrorMessageValidation.trackPagePassed(pageName);
    } else {
      ErrorMessageValidation.trackMissingEMVFile(pageName);
    }
  }

  private async runNavigationTests(page: Page, pageName: string, pftFilePath: string): Promise<void> {
    delete require.cache[require.resolve(pftFilePath)];
    const pftModule = require(pftFilePath);

    const methodName = `${pageName}NavigationTests`;
    const navigationFunction = pftModule[methodName];

    if (typeof navigationFunction === 'function') {
      PageNavigationValidation.trackPageWithNavigation(pageName);
      PageNavigationValidation.setSourcePage(pageName);
      await navigationFunction(page);
      PageNavigationValidation.clearSourcePage();
      PageNavigationValidation.trackPagePassed(pageName);
    } else {
      PageNavigationValidation.trackMissingNavigationMethod(pageName);
    }
  }

  private async getFileNameForPage(page: Page): Promise<string | null> {
    const urlSegment = this.getUrlSegment(page.url());

    const mapping = this.loadMapping();
    if (!mapping) {
      return null;
    }

    if (/^\d+$/.test(urlSegment)) {
      const headerText = await this.getHeaderText(page);
      return headerText ? (mapping[headerText] ?? null) : null;
    }

    return mapping[urlSegment] ?? null;
  }

  private loadMapping(): Record<string, string> | null {
    try {
      if (!fs.existsSync(TriggerPageFunctionalTestsAction.MAPPING_PATH)) {
        return null;
      }

      const mappingContent = fs.readFileSync(TriggerPageFunctionalTestsAction.MAPPING_PATH, 'utf8');
      const match = mappingContent.match(/export default\s*({[\s\S]*?});/);

      if (!match) {
        return null;
      }

      const objectString = match[1].replace(/\s+/g, ' ').replace(/,\s*}/g, '}');
      return eval(`(${objectString})`);
    } catch {
      return null;
    }
  }

  private getUrlSegment(url: string): string {
    try {
      const { pathname } = new URL(url);
      const segments = pathname.split('/').filter(Boolean);
      return segments.at(-1) || 'home';
    } catch {
      const segments = url.split('/').filter(Boolean);
      return segments.at(-1) || 'home';
    }
  }

  private async getHeaderText(page: Page): Promise<string | null> {
    for (const selector of ['h1', 'h2']) {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        const text = (await el.textContent())?.trim();
        if (text) {
          return text;
        }
      }
    }
    return null;
  }
}
