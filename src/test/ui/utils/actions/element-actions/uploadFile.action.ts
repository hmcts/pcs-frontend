import * as path from 'path';

import { Page } from '@playwright/test';

import { IAction, actionData } from '../../interfaces';

export class UploadFileAction implements IAction {
  async execute(page: Page, action: string, files: actionData): Promise<void> {
    if (typeof files === 'string') {
      await this.uploadFile(page, files);
    } else if (Array.isArray(files)) {
      for (let index = 0; index < files.length; index++) {
        await this.uploadFile(page, files[index]);
        if (index < files.length - 1) {
          await page.waitForTimeout(5000);
        }
      }
    }
  }

  private async uploadFile(page: Page, file: string): Promise<void> {
    const fileInput = page.locator('input[type="file"].govuk-file-upload');
    const filePath = path.resolve(__dirname, '../../../data/inputFiles', file);
    await fileInput.last().setInputFiles(filePath);
  }
}
