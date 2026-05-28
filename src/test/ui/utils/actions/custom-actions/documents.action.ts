import { Page } from '@playwright/test';

import { performAction, performValidation } from '../../controller';
import { IAction, actionData, actionRecord } from '../../interfaces';
import { confirmIfTheseDocumentsRelateToAnApplication } from '../../../data/page-data/documents-page-data/confirmIfTheseDocumentsRelateToAnApplication.page.data';

export class DocumentsAction implements IAction {
  async execute(page: Page, action: string, fieldName: actionRecord): Promise<void> {
    const actionsMap = new Map<string, () => Promise<void>>([
      ['startEvidenceUpload', () => this.startEvidenceUpload(fieldName)],
      ['validateViewDocuments', () => this.validateViewDocuments(fieldName)],
      ['verifyDocumentRelatesToApplication', () => this.verifyDocumentRelatesToApplication(page, fieldName as actionRecord)],
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
  private async verifyDocumentRelatesToApplication(page: Page, confirmDocumentData: actionRecord) {
    await performValidation('text', { elementType: 'paragraph', text: confirmIfTheseDocumentsRelateToAnApplication.weUsuallyParagraph });
    await performValidation('text', { elementType: 'paragraph', text: confirmIfTheseDocumentsRelateToAnApplication.ifYourApplicationParagraph });
    const formattedDate = new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date()).replace(',', '');

     // 1st option (main)
  const selectOption = confirmDocumentData.option === confirmIfTheseDocumentsRelateToAnApplication.noRadioOption
    ? confirmDocumentData.option
    : `${confirmDocumentData.option} ${formattedDate}`;

  // 2nd option (previous application)
  const previousOption = confirmDocumentData.previousApplicationOption
    ? `${confirmDocumentData.previousApplicationOption} ${formattedDate}`
    : undefined;

  // last option (always no option)
  const noOption = confirmIfTheseDocumentsRelateToAnApplication.noRadioOption;

  // Build expected order
  const expectedOptions: string[] = [selectOption];

  if (previousOption) expectedOptions.push(previousOption);

  expectedOptions.push(noOption);

  // ✅ VERIFY ORDER ON UI
  await performValidation('optionList', {
    fieldName: confirmDocumentData.question,
    options: expectedOptions,
  });

    /*
    
    const selectOption = confirmDocumentData.option === confirmIfTheseDocumentsRelateToAnApplication.noRadioOption ? confirmDocumentData.option : `${confirmDocumentData.option} ${formattedDate}`;
    
// ✅ VERIFY option is visible on UI BEFORE clicking

  await performValidation('elementToBeVisible', {elementType: 'radio', text: selectOption,});

    await performAction('clickRadioButton', {
      question: confirmDocumentData.question,
      option: selectOption,
    });
    await performAction('clickButton', confirmIfTheseDocumentsRelateToAnApplication.continueButton);
    */
  }
}
