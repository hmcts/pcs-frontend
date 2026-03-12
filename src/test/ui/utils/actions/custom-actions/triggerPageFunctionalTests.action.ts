import * as fs from 'fs';
import * as path from 'path';

import { Page } from '@playwright/test';

import {
  enable_content_validation,
  enable_error_message_validation,
  enable_navigation_tests,
} from '../../../../../../playwright.config';
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

  async execute(page: Page): Promise<void> {
    await this.triggerPageFunctionalTests(page);
  }

  private async triggerPageFunctionalTests(page: Page): Promise<void> {
    const pageName = await this.getFileNameForPage(page);

    if (!pageName) {
      return;
    }

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

    if (!this.acquirePageLock(pageName)) {
      return;
    }

    if (enable_error_message_validation === 'true') {
      await this.runErrorMessageValidation(page, pageName, pftFilePath);
    }

    if (enable_navigation_tests === 'true') {
      await this.runNavigationTests(page, pageName, pftFilePath);
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
    try {
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
    } catch (error) {
      ErrorMessageValidation.trackValidationError(pageName, error);
    }
  }

  private async runNavigationTests(page: Page, pageName: string, pftFilePath: string): Promise<void> {
    try {
      delete require.cache[require.resolve(pftFilePath)];
      const pftModule = require(pftFilePath);

      const methodName = `${pageName}NavigationTests`;
      const navigationFunction = pftModule[methodName];

      if (typeof navigationFunction === 'function') {
        PageNavigationValidation.trackPageWithNavigation(pageName);
        await navigationFunction(page);
        PageNavigationValidation.trackPagePassed(pageName);
      } else {
        PageNavigationValidation.trackMissingNavigationMethod(pageName);
      }
    } catch (error) {
      PageNavigationValidation.trackNavigationFailure(pageName, error);
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

  private acquirePageLock(pageName: string): boolean {
    try {
      if (!fs.existsSync(TriggerPageFunctionalTestsAction.LOCK_DIR)) {
        fs.mkdirSync(TriggerPageFunctionalTestsAction.LOCK_DIR, { recursive: true });
      }

      const lockPath = path.join(TriggerPageFunctionalTestsAction.LOCK_DIR, `${pageName}.lock`);

      fs.writeFileSync(lockPath, process.pid.toString(), { flag: 'wx' });
      return true;
    } catch (error: any) {
      if (error.code === 'EEXIST') {
        return false;
      }
      console.error(`Error acquiring lock for page ${pageName}:`, error);
      return false;
    }
  }
}
