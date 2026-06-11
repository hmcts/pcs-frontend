import * as path from 'path';

import { Page } from '@playwright/test';

import { IAction, actionData } from '../../interfaces';

export class UploadFileAction implements IAction {
  async execute(page: Page, action: string, files: actionData): Promise<void> {
    if (typeof files === 'string') {
      await this.uploadFile(page, files);
    } else if (Array.isArray(files)) {
      for (const file of files) {
        await this.uploadFile(page, file);
      }
    }
  }

  private async uploadFile(page: Page, file: string): Promise<void> {
    const uploadedDocuments = page.locator('input[name="uploadedDocuments[]"]');
    const uploadedDocumentCount = await uploadedDocuments.count();
    const fileInput = page.locator('input[type="file"].moj-multi-file-upload__input');
    const filePath = path.resolve(__dirname, '../../../data/inputFiles', file);
    await fileInput.last().setInputFiles(filePath);
    await uploadedDocuments.nth(uploadedDocumentCount).waitFor({ state: 'attached' });
  }
}
