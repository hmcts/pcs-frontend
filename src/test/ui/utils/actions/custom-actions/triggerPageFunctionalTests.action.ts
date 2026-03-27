import * as fs from 'fs';
import * as path from 'path';

import { Page } from '@playwright/test';

import {
  enable_content_validation,
  enable_error_message_validation,
  enable_navigation_tests,
} from '../../../../../../playwright.config';
import { IAction } from '../../interfaces';
import { isPftDebugEnabled, pftDebugReport, shortUrl } from '../../pft-debug-log';
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

  // Temporary in-memory storage for pages tested in current test run
  private static pagesTestedInCurrentRun = new Set<string>();

  static resetTestedPages(): void {
    TriggerPageFunctionalTestsAction.pagesTestedInCurrentRun.clear();
  }

  async execute(page: Page): Promise<void> {
    await this.triggerPageFunctionalTests(page);
  }

  private async triggerPageFunctionalTests(page: Page): Promise<void> {
    const resolution = await this.resolvePageFileName(page);
    if (!resolution.pageName) {
      if (enable_content_validation === 'true' && isPftDebugEnabled()) {
        await pftDebugReport({
          page,
          pageLabel: shortUrl(page.url()),
          category: 'page content',
          expected: 'URL segment or page heading maps to a page name in urlToFileMapping.config.ts',
          actual: resolution.unmappedReason ?? 'Could not resolve page from URL mapping',
        });
      }
      return;
    }

    const pageName = resolution.pageName;

    // Prevent duplicate runs within the same test run (in‑memory)
    if (TriggerPageFunctionalTestsAction.pagesTestedInCurrentRun.has(pageName)) {
      return;
    }

    // Always run the tests (ignore lock file for execution decision)
    TriggerPageFunctionalTestsAction.pagesTestedInCurrentRun.add(pageName);

    // Run all enabled tests, tracking failures
    const pageDataFilePath = path.join(TriggerPageFunctionalTestsAction.PAGE_DATA_DIR, `${pageName}.page.data.ts`);
    const pageDataFileExists = fs.existsSync(pageDataFilePath);

    if (enable_content_validation === 'true') {
      if (pageDataFileExists) {
        PageContentValidation.trackPageWithData(pageName);
        await this.runPageContentValidation(page, pageName);
      } else {
        PageContentValidation.trackMissingDataFile(pageName);
        if (isPftDebugEnabled()) {
          await pftDebugReport({
            page,
            pageLabel: pageName,
            category: 'page content',
            expected: `Page data file ${pageName}.page.data.ts exists under data/page-data/`,
            actual:
              `URL maps to "${pageName}" in urlToFileMapping.config.ts, but there is no matching page data file. ` +
              `Add src/test/ui/data/page-data/${pageName}.page.data.ts (page content / design source for validation).`,
          });
        }
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
      // No PFT file means no functional tests to run – nothing to lock
      return;
    }

    let errorValidationFailed = false;
    let navigationTestsFailed = false;

    if (enable_error_message_validation === 'true') {
      try {
        await this.runErrorMessageValidation(page, pageName, pftFilePath);
      } catch {
        errorValidationFailed = true;
      }
    }

    if (enable_navigation_tests === 'true') {
      try {
        await this.runNavigationTests(page, pageName, pftFilePath);
      } catch {
        navigationTestsFailed = true;
      }
    }

    const anyTestFailed = errorValidationFailed || navigationTestsFailed;

    // Update the permanent lock file based on the test outcome
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
      const validation = new PageContentValidation();
      await validation.validateCurrentPage(page, pageName);
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

  /**
   * Resolves the PFT page name from the URL using urlToFileMapping.config.ts.
   * When resolution fails, `unmappedReason` explains why (for PFT debug logging).
   */
  private async resolvePageFileName(page: Page): Promise<{
    pageName: string | null;
    unmappedReason: string | null;
    urlSegment: string;
  }> {
    const urlSegment = this.getUrlSegment(page.url());
    const mapping = this.loadMapping();
    if (!mapping) {
      return {
        pageName: null,
        unmappedReason: 'Could not load or parse urlToFileMapping.config.ts',
        urlSegment,
      };
    }

    if (/^\d+$/.test(urlSegment)) {
      const headerText = await this.getHeaderText(page);
      if (!headerText) {
        return {
          pageName: null,
          unmappedReason: `URL ends with numeric segment "${urlSegment}" but no visible h1/h2 heading was found to map via urlToFileMapping`,
          urlSegment,
        };
      }
      const pageName = mapping[headerText] ?? null;
      if (!pageName) {
        return {
          pageName: null,
          unmappedReason: `Heading "${headerText}" is not a key in urlToFileMapping.config.ts (numeric route path)`,
          urlSegment,
        };
      }
      return { pageName, unmappedReason: null, urlSegment };
    }

    const pageName = mapping[urlSegment] ?? null;
    if (!pageName) {
      return {
        pageName: null,
        unmappedReason: `URL segment "${urlSegment}" is not a key in urlToFileMapping.config.ts`,
        urlSegment,
      };
    }
    return { pageName, unmappedReason: null, urlSegment };
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
