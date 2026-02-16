import * as fs from 'fs';
import * as path from 'path';

import { Page } from '@playwright/test';

import { IAction } from '../../interfaces';

export class TriggerErrorMessagesAction implements IAction {
  async execute(page: Page): Promise<void> {
    await this.triggerErrorMessages(page);
  }

  private async triggerErrorMessages(page: Page): Promise<void> {
    const emvFilePath = await this.getEMVFilePath(page);

    if (!emvFilePath) {
      const { ErrorMessageValidation } = require('../../validations/element-validations/error-message.validation');
      if (ErrorMessageValidation && ErrorMessageValidation.trackMissingEMVFile) {
        ErrorMessageValidation.trackMissingEMVFile(page.url());
      }
      return;
    }

    try {
      delete require.cache[require.resolve(emvFilePath)];
      const emvModule = require(emvFilePath);

      const emvFunction = emvModule.default || emvModule[Object.keys(emvModule)[0]];
      if (typeof emvFunction === 'function') {
        await emvFunction(page);
      } else {
        const { ErrorMessageValidation } = require('../../validations/element-validations/error-message.validation');
        if (ErrorMessageValidation && ErrorMessageValidation.addResult) {
          ErrorMessageValidation.addResult({
            pageUrl: page.url(),
            scenario: 'EMV Execution',
            passed: false,
            expected: 'Error message validation execution',
            actual: 'EMV file does not export a function',
          });
        }
      }
    } catch (error) {
      const { ErrorMessageValidation } = require('../../validations/element-validations/error-message.validation\n');
      if (ErrorMessageValidation && ErrorMessageValidation.addResult) {
        ErrorMessageValidation.addResult({
          pageUrl: page.url(),
          scenario: 'EMV Execution',
          passed: false,
          expected: 'Error message validation execution',
          actual: 'Execution failed',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private async getEMVFilePath(page: Page): Promise<string | null> {
    const fileName = await this.getFileNameForPage(page);

    if (!fileName) {
      return null;
    }

    const emvFileName = `${fileName}.page.emv.ts`;
    const emvFilePath = path.join(__dirname, '../../../functional/errorMessage-validation', emvFileName);

    return fs.existsSync(emvFilePath) ? emvFilePath : null;
  }

  private async getFileNameForPage(page: Page): Promise<string | null> {
    const urlSegment = this.getUrlSegment(page.url());

    const mappingPath = path.join(__dirname, '../../../data/page-data/urlToFileMapping.ts');
    if (!fs.existsSync(mappingPath)) {
      return null;
    }

    const mappingContent = fs.readFileSync(mappingPath, 'utf8');
    const match = mappingContent.match(/export default\s*({[\s\S]*?});/);
    if (!match) {
      return null;
    }

    const objectString = match[1].replace(/\s+/g, ' ').replace(/,\s*}/g, '}');
    const mapping = eval(`(${objectString})`);

    if (/^\d+$/.test(urlSegment)) {
      const headerText = await this.getHeaderText(page);
      return headerText && mapping[headerText] ? mapping[headerText] : null;
    }

    return mapping[urlSegment] || null;
  }

  private getUrlSegment(url: string): string {
    try {
      const urlObj = new URL(url);
      const segments = urlObj.pathname.split('/').filter(Boolean);
      return segments[segments.length - 1] || 'home';
    } catch {
      const segments = url.split('/').filter(Boolean);
      return segments[segments.length - 1] || 'home';
    }
  }

  private async getHeaderText(page: Page): Promise<string | null> {
    const h1Element = page.locator('h1').first();
    if (await h1Element.isVisible({ timeout: 2000 })) {
      const h1Text = await h1Element.textContent();
      if (h1Text && h1Text.trim() !== '') {
        return h1Text.trim();
      }
    }

    const h2Element = page.locator('h2').first();
    if (await h2Element.isVisible({ timeout: 2000 })) {
      const h2Text = await h2Element.textContent();
      if (h2Text && h2Text.trim() !== '') {
        return h2Text.trim();
      }
    }

    return null;
  }
}
