import * as fs from 'fs';
import * as path from 'path';

import { Page, test } from '@playwright/test';

import {
  enable_content_validation,
  enable_error_message_validation,
  enable_navigation_tests,
  enable_visibility_validation,
} from '../../../../../../playwright.config';
import { shortUrl, truncateForLog } from '../../common/string.utils';
import { IAction } from '../../interfaces';
import {
  ErrorMessageValidation,
  PageContentValidation,
  PageNavigationValidation,
  VisibilityValidation,
} from '../../validations/custom-validations';

export class TriggerPageFunctionalTestsAction implements IAction {
  private static readonly LOCK_DIR = path.join(process.cwd(), 'test-results', 'pft-locks');
  private static readonly FAILED_LOCK_DIR = path.join(process.cwd(), 'test-results', 'pft-locks', 'failed');
  private static readonly MAPPING_PATH = path.join(__dirname, '../../../config/urlToFileMapping.config.ts');
  private static readonly PFT_DIR = path.join(__dirname, '../../../functional');
  private static readonly PAGE_DATA_DIR = path.join(__dirname, '../../../data/page-data');
  private static readonly LOCK_EXCLUSIONS_PATH = path.join(__dirname, '../../../config/lock-exclusions.config.ts');

  private static excludedFromLock: Set<string> | null = null;

  private static pagesTestedInCurrentRun = new Set<string>();

  static resetTestedPages(): void {
    TriggerPageFunctionalTestsAction.pagesTestedInCurrentRun.clear();
  }

  private static getExcludedFromLock(): Set<string> {
    if (TriggerPageFunctionalTestsAction.excludedFromLock !== null) {
      return TriggerPageFunctionalTestsAction.excludedFromLock;
    }

    try {
      if (fs.existsSync(TriggerPageFunctionalTestsAction.LOCK_EXCLUSIONS_PATH)) {
        const config = require(TriggerPageFunctionalTestsAction.LOCK_EXCLUSIONS_PATH);
        TriggerPageFunctionalTestsAction.excludedFromLock = new Set(config.default || config.excludedPages || []);
      } else {
        TriggerPageFunctionalTestsAction.excludedFromLock = new Set<string>();
      }
    } catch {
      TriggerPageFunctionalTestsAction.excludedFromLock = new Set<string>();
    }

    return TriggerPageFunctionalTestsAction.excludedFromLock;
  }

  async execute(page: Page): Promise<void> {
    await this.triggerPageFunctionalTests(page);
  }

  private async triggerPageFunctionalTests(page: Page): Promise<void> {
    const pageName = await this.getFileNameForPage(page);

    if (!pageName) {
      if (TriggerPageFunctionalTestsAction.isDashboardUrl(page.url())) {
        return;
      }
      const urlSegment = this.getUrlSegment(page.url());
      console.warn(
        `[PFT] WARNING mapping missing in urlToFileMapping.config.ts | test="${truncateForLog(test.info().title, 160)}" | url=${shortUrl(page.url())} | key: ${urlSegment}`
      );
      return;
    }

    if (TriggerPageFunctionalTestsAction.pagesTestedInCurrentRun.has(pageName)) {
      return;
    }

    const excludedFromLock = TriggerPageFunctionalTestsAction.getExcludedFromLock();

    // Skip lock check for excluded pages
    if (!excludedFromLock.has(pageName)) {
      const failedLockPath = path.join(TriggerPageFunctionalTestsAction.FAILED_LOCK_DIR, `${pageName}.lock`);

      // If failed lock exists, always run tests (don't skip)
      if (!fs.existsSync(failedLockPath)) {
        const mainLockPath = path.join(TriggerPageFunctionalTestsAction.LOCK_DIR, `${pageName}.lock`);
        // Skip only if main lock exists AND no failed lock
        if (fs.existsSync(mainLockPath)) {
          return;
        }
      }
    }

    TriggerPageFunctionalTestsAction.pagesTestedInCurrentRun.add(pageName);

    const pageDataFilePath = this.resolveFilePath(
      TriggerPageFunctionalTestsAction.PAGE_DATA_DIR,
      `${pageName}.page.data.ts`
    );

    if (enable_content_validation === 'true') {
      if (pageDataFilePath && fs.existsSync(pageDataFilePath)) {
        PageContentValidation.trackPageWithData(pageName);
        await this.runPageContentValidation(page, pageName);
      } else {
        PageContentValidation.trackMissingDataFile(pageName);
      }
    }

    const pftFilePath = this.resolveFilePath(TriggerPageFunctionalTestsAction.PFT_DIR, `${pageName}.pft.ts`);
    if (!pftFilePath || !fs.existsSync(pftFilePath)) {
      if (enable_error_message_validation === 'true') {
        ErrorMessageValidation.trackMissingEMVFile(pageName);
      }
      if (enable_navigation_tests === 'true') {
        PageNavigationValidation.trackMissingNavigationFile(pageName);
      }
      if (enable_visibility_validation === 'true') {
        VisibilityValidation.trackMissingMethod(pageName);
      }
      return;
    }

    let errorValidationFailed = false;
    let navigationTestsFailed = false;
    let visibilityValidationFailed = false;

    try {
      // Parent step that groups all functional tests for this page
      await test.step(`PFT triggered for page - ${pageName}`, async () => {
        if (enable_error_message_validation === 'true') {
          await test.step(`EMV triggered for page - ${pageName}`, async () => {
            try {
              await this.runErrorMessageValidation(page, pageName, pftFilePath);
            } catch (error) {
              ErrorMessageValidation.trackValidationError(pageName, error);
              errorValidationFailed = true;
              throw error;
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
              throw error;
            }
          });
        }

        if (enable_visibility_validation === 'true') {
          await test.step(`Visibility validation triggered for page - ${pageName}`, async () => {
            try {
              await this.runVisibilityValidation(page, pageName, pftFilePath);
            } catch (error) {
              VisibilityValidation.trackValidationError(pageName, error);
              visibilityValidationFailed = true;
              throw error;
            }
          });
        }
      });
    } catch (error) {
      console.log(error);
      // Catch any error from the test.step to ensure lock creation still runs
      // The error will be propagated to the test runner
    }

    // Handle lock files based on test outcome - THIS MUST RUN EVEN IF TESTS FAIL
    const anyTestFailed = errorValidationFailed || navigationTestsFailed || visibilityValidationFailed;

    if (!excludedFromLock.has(pageName)) {
      const failedLockPath = path.join(TriggerPageFunctionalTestsAction.FAILED_LOCK_DIR, `${pageName}.lock`);

      if (anyTestFailed) {
        // Create failed lock (never create main lock)
        this.createFailedLockFile(pageName);
      } else if (!fs.existsSync(failedLockPath)) {
        // Only create main lock if no failed lock exists
        this.createLockFile(pageName);
      }
    }

    // If any test failed, re-throw the error to fail the test
    if (anyTestFailed) {
      throw new Error(`Functional tests failed for page: ${pageName}`);
    }
  }

  private resolveFilePath(baseDir: string, pageName: string): string | null {
    if (!fs.existsSync(baseDir)) {
      throw new Error(`Base directory does not exist: ${baseDir}`);
    }

    const directPath = path.join(baseDir, pageName);
    if (fs.existsSync(directPath)) {
      return directPath;
    }

    const subDirs = fs.readdirSync(baseDir, { withFileTypes: true }).filter(d => d.isDirectory());

    for (const dir of subDirs) {
      const subDirPath = path.join(baseDir, dir.name, pageName);
      if (fs.existsSync(subDirPath)) {
        return subDirPath;
      }
    }

    return null;
  }

  private createLockFile(pageName: string): void {
    try {
      if (!fs.existsSync(TriggerPageFunctionalTestsAction.LOCK_DIR)) {
        fs.mkdirSync(TriggerPageFunctionalTestsAction.LOCK_DIR, { recursive: true });
      }
      const lockPath = path.join(TriggerPageFunctionalTestsAction.LOCK_DIR, `${pageName}.lock`);
      fs.writeFileSync(lockPath, process.pid.toString(), { flag: 'w' });
    } catch {
      // Ignore lock file creation errors
    }
  }

  private createFailedLockFile(pageName: string): void {
    try {
      if (!fs.existsSync(TriggerPageFunctionalTestsAction.FAILED_LOCK_DIR)) {
        fs.mkdirSync(TriggerPageFunctionalTestsAction.FAILED_LOCK_DIR, { recursive: true });
      }
      const failedLockPath = path.join(TriggerPageFunctionalTestsAction.FAILED_LOCK_DIR, `${pageName}.lock`);
      fs.writeFileSync(failedLockPath, process.pid.toString(), { flag: 'w' });
    } catch {
      // Ignore failed lock file creation errors
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

  /** Dashboard is not in url mapping; skip PFT warn. */
  private static isDashboardUrl(url: string): boolean {
    try {
      return new URL(url).pathname.split('/').filter(Boolean)[0] === 'dashboard';
    } catch {
      return /\/dashboard(\/|$)/.test(url);
    }
  }

  private async runVisibilityValidation(page: Page, pageName: string, pftFilePath: string): Promise<void> {
    delete require.cache[require.resolve(pftFilePath)];
    const pftModule = require(pftFilePath);

    const camelCaseName = pageName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const methodName = `${camelCaseName}VisibilityValidationTests`;

    const validationFunction = pftModule[methodName];

    if (typeof validationFunction === 'function') {
      VisibilityValidation.trackPageWithVisibilityTests(pageName);
      try {
        await validationFunction(page);
      } catch (error) {
        VisibilityValidation.trackValidationError(pageName, error);
        throw error;
      }
    } else {
      VisibilityValidation.trackMissingMethod(pageName);
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
