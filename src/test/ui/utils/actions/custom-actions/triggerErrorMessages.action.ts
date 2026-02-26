import * as fs from 'fs';
import * as path from 'path';

import { Page } from '@playwright/test';

import { IAction } from '../../interfaces';

export class TriggerErrorMessagesAction implements IAction {
  private static readonly LOCK_DIR = path.join(process.cwd(), 'test-results', 'emv-locks');
  async execute(page: Page): Promise<void> {
    await this.triggerErrorMessages(page);
  }

  private async triggerErrorMessages(page: Page): Promise<void> {
    const pageName = await this.getFileNameForPage(page);

    if (!pageName) {
      await this.trackMissingFile(page);
      return;
    }
    if (!this.acquirePageLock(pageName)) {
      return;
    }

    const emvFilePath = await this.getEMVFilePath(page);
    if (!emvFilePath) {
      await this.trackMissingFile(page);
      return;
    }

    try {
      delete require.cache[require.resolve(emvFilePath)];
      const emvModule = require(emvFilePath);

      const fileName = path.basename(emvFilePath, '.pft.ts');
      const methodName = `${fileName}ErrorValidation`;
      const emvFunction = emvModule[methodName];

      if (typeof emvFunction === 'function') {
        await emvFunction(page);
      } else {
        await this.trackValidationFailure(page, `Method ${methodName} not found in file`);
      }
    } catch (error) {
      await this.trackValidationFailure(page, 'Execution failed', error);
    }
  }

  private acquirePageLock(pageName: string): boolean {
    try {
      if (!fs.existsSync(TriggerErrorMessagesAction.LOCK_DIR)) {
        fs.mkdirSync(TriggerErrorMessagesAction.LOCK_DIR, {
          recursive: true,
        });
      }

      const lockPath = path.join(TriggerErrorMessagesAction.LOCK_DIR, `${pageName}.lock`);

      fs.writeFileSync(lockPath, process.pid.toString(), { flag: 'wx' });

      return true;
    } catch (error: any) {
      if (error.code === 'EEXIST') {
        return false;
      }
      throw error;
    }
  }

  private async trackMissingFile(page: Page): Promise<void> {
    const { ErrorMessageValidation } = require('../../validations/element-validations/error-message.validation');
    ErrorMessageValidation?.trackMissingEMVFile?.(page.url());
  }

  private async trackValidationFailure(page: Page, actual: string, error?: unknown): Promise<void> {
    const { ErrorMessageValidation } = require('../../validations/element-validations/error-message.validation');

    ErrorMessageValidation?.addResult?.({
      pageUrl: page.url(),
      scenario: 'EMV Execution',
      passed: false,
      expected: 'Error message validation execution',
      actual,
      error: error instanceof Error ? error.message : error ? String(error) : undefined,
    });
  }

  private async getEMVFilePath(page: Page): Promise<string | null> {
    const fileName = await this.getFileNameForPage(page);
    if (!fileName) {
      return null;
    }

    const emvFilePath = path.join(__dirname, '../../../functional', `${fileName}.pft.ts`);

    return fs.existsSync(emvFilePath) ? emvFilePath : null;
  }

  private async getFileNameForPage(page: Page): Promise<string | null> {
    const urlSegment = this.getUrlSegment(page.url());

    const mappingPath = path.join(__dirname, '../../../config/urlToFileMapping.ts');
    if (!fs.existsSync(mappingPath)) {
      return null;
    }

    const mappingContent = fs.readFileSync(mappingPath, 'utf8');
    const match = mappingContent.match(/export default\s*({[\s\S]*?});/);
    if (!match) {
      return null;
    }

    const mapping = eval(`(${match[1].replace(/\s+/g, ' ').replace(/,\s*}/g, '}')})`);

    if (/^\d+$/.test(urlSegment)) {
      const headerText = await this.getHeaderText(page);
      return headerText ? (mapping[headerText] ?? null) : null;
    }

    return mapping[urlSegment] ?? null;
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
      if (await el.isVisible({ timeout: 2000 })) {
        const text = (await el.textContent())?.trim();
        if (text) {
          return text;
        }
      }
    }
    return null;
  }
}
