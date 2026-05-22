import { Page } from '@playwright/test';

import { performAction, performValidation } from '../../controller';
import { IAction, actionData, actionRecord } from '../../interfaces';

export class DocumentsAction implements IAction {
  async execute(page: Page, action: string, fieldName: actionRecord): Promise<void> {
    const actionsMap = new Map<string, () => Promise<void>>([
      ['startEvidenceUpload', () => this.startEvidenceUpload(fieldName)],
      ['validateViewDocuments', () => this.validateViewDocuments(fieldName)],
    ]);

    const actionToPerform = actionsMap.get(action);
    if (!actionToPerform) {
      throw new Error(`No action found for '${action}'`);
    }
    await actionToPerform();
  }

  private async startEvidenceUpload(data: actionData): Promise<void> {
    await performAction('clickButton', data);
  }

  private async validateViewDocuments(data: actionRecord): Promise<void> {
    if (Array.isArray(data.documents)) {
      for (const document of data.documents) {
        await performValidation('validateDocumentUnderSection', {
          sectionHeader: document.sectionHeader,
          documentName: document.documentName,
          submittedDate: document.submittedDate,
        });
      }
    }
  }
}
