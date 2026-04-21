import * as fs from 'fs';
import * as path from 'path';

import { Page, test } from '@playwright/test';
import { error } from 'winston';

import {
  enable_content_validation,
  enable_error_message_validation,
  enable_navigation_tests,
  enable_visibility_validation,
} from '../../../../../../playwright.config';
import { excludedPages } from '../../../config/lock-exclusions.config';
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
  private static readonly PASSED_DIR = path.join(TriggerPageFunctionalTestsAction.LOCK_DIR, 'passed');
  private static readonly FAILED_DIR = path.join(TriggerPageFunctionalTestsAction.LOCK_DIR, 'failed');
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

  private shouldSkipPage(pageName: string): boolean {
    // Already tested in this run (in-memory): skip regardless of exclusion or lock state
    if (TriggerPageFunctionalTestsAction.pagesTestedInCurrentRun.has(pageName)) {
      return true;
    }

    // Excluded pages: never skip (but still respect in-memory guard above)
    if (excludedPages.includes(pageName)) {
      return false;
    }

    // Failed lock exists: never skip (always re-run across runs/retries)
    if (this.hasFailedLock(pageName)) {
      return false;
    }

    // Passed lock exists: skip
    if (this.hasPassedLock(pageName)) {
      return true;
    }

    return false;
  }

  private async triggerPageFunctionalTests(page: Page): Promise<void> {
    const pageName = await this.getFileNameForPage(page);

    if (!pageName) {
      if (TriggerPageFunctionalTestsAction.isDashboardUrl(page.url())) {
        return;
      }
      const urlSegment = this.getUrlSegment(page.url());
      console.warn(
        `[PFT] WARNING mapping missing in urlToFileMapping.config.ts | test="${truncateForLog(
          test.info().title,
          160
        )}" | url=${shortUrl(page.url())} | key: ${urlSegment}`
      );
      return;
    }

    if (this.shouldSkipPage(pageName)) {
      return;
    }

    // Mark as tested in this run immediately to prevent duplicate runs within same test
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
      // Write failed lock immediately if content validation found failures
      if (PageContentValidation.hasErrorForPage(pageName)) {
        this.createFailedLock(pageName);
        this.deletePassedLock(pageName);
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
      if (!this.hasFailedLock(pageName)) {
        this.createPassedLock(pageName);
      }
      return;
    }

    let errorValidationFailed = false;
    let navigationTestsFailed = false;
    let visibilityValidationFailed = false;

    await test.step(`PFT triggered for page - ${pageName}`, async () => {
      if (enable_error_message_validation === 'true') {
        await test.step(`EMV triggered for page - ${pageName}`, async () => {
          try {
            await this.runErrorMessageValidation(page, pageName, pftFilePath);
          } catch (err) {
            ErrorMessageValidation.trackValidationError(pageName, err);
            errorValidationFailed = true;
            this.createFailedLock(pageName);
            this.deletePassedLock(pageName);
          }
        });
      }

      if (enable_navigation_tests === 'true') {
        await test.step(`Navigation tests triggered for page - ${pageName}`, async () => {
          try {
            await this.runNavigationTests(page, pageName, pftFilePath);
          } catch (err) {
            PageNavigationValidation.trackNavigationFailure(pageName, err);
            navigationTestsFailed = true;
            this.createFailedLock(pageName);
            this.deletePassedLock(pageName);
          }
        });
      }

      if (enable_visibility_validation === 'true') {
        await test.step(`Visibility validation triggered for page - ${pageName}`, async () => {
          try {
            await this.runVisibilityValidation(page, pageName, pftFilePath);
          } catch (err) {
            VisibilityValidation.trackValidationError(pageName, err);
            visibilityValidationFailed = true;
            this.createFailedLock(pageName);
            this.deletePassedLock(pageName);
          }
        });
      }
    });

    const anyTestFailed = errorValidationFailed || navigationTestsFailed || visibilityValidationFailed;

    // Write passed lock only if nothing failed across all 4 types
    if (!anyTestFailed && !this.hasFailedLock(pageName)) {
      this.createPassedLock(pageName);
    }
  }

  // ── Lock helpers ──────────────────────────────────────────────────────────

  private hasPassedLock(pageName: string): boolean {
    return fs.existsSync(path.join(TriggerPageFunctionalTestsAction.PASSED_DIR, `${pageName}.lock`));
  }

  private hasFailedLock(pageName: string): boolean {
    return fs.existsSync(path.join(TriggerPageFunctionalTestsAction.FAILED_DIR, `${pageName}.lock`));
  }

  private createPassedLock(pageName: string): void {
    try {
      fs.mkdirSync(TriggerPageFunctionalTestsAction.PASSED_DIR, { recursive: true });
      const lockPath = path.join(TriggerPageFunctionalTestsAction.PASSED_DIR, `${pageName}.lock`);
      fs.writeFileSync(lockPath, process.pid.toString(), { flag: 'w' });
    } catch {
      console.log(error);
    }
  }

  private createFailedLock(pageName: string): void {
    try {
      fs.mkdirSync(TriggerPageFunctionalTestsAction.FAILED_DIR, { recursive: true });
      const lockPath = path.join(TriggerPageFunctionalTestsAction.FAILED_DIR, `${pageName}.lock`);
      fs.writeFileSync(lockPath, process.pid.toString(), { flag: 'w' });
    } catch {
      console.log(error);
    }
  }

  private deletePassedLock(pageName: string): void {
    try {
      const lockPath = path.join(TriggerPageFunctionalTestsAction.PASSED_DIR, `${pageName}.lock`);
      if (fs.existsSync(lockPath)) {
        fs.unlinkSync(lockPath);
      }
    } catch (_error) {
      console.error(_error);
    }
  }

  // ── File resolution ───────────────────────────────────────────────────────

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

  // ── Validation runners ────────────────────────────────────────────────────

  private async runPageContentValidation(page: Page, pageName: string): Promise<void> {
    try {
      await test.step(`Page content validation for ${pageName}`, async () => {
        const validation = new PageContentValidation();
        await validation.validateCurrentPage(page, pageName);
      });
    } catch (err) {
      PageContentValidation.trackValidationError(pageName, err);
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
      } catch (err) {
        VisibilityValidation.trackValidationError(pageName, err);
        throw error;
      }
    } else {
      VisibilityValidation.trackMissingMethod(pageName);
    }
  }

  // ── URL helpers ───────────────────────────────────────────────────────────

  private static isDashboardUrl(url: string): boolean {
    try {
      return new URL(url).pathname.split('/').filter(Boolean)[0] === 'dashboard';
    } catch {
      return /\/dashboard(\/|$)/.test(url);
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
