import { Page } from '@playwright/test';

import { defendantNameCapture, freeLegalAdvice, dateOfBirth } from '../../../data/page-data';
import { performAction, performValidation } from '../../controller';
import { IAction, actionData, actionRecord } from '../../interfaces';

export class RespondToClaimAction implements IAction {
  async execute(page: Page, action: string, fieldName: actionData | actionRecord): Promise<void> {
    const actionsMap = new Map<string, () => Promise<void>>([
      ['selectLegalAdvice', () => this.selectLegalAdvice(fieldName)],
      ['inputDefendantDetails', () => this.inputDefendantDetails(fieldName as actionRecord)],
      ['inputErrorValidation', () => this.inputErrorValidation(fieldName as actionRecord)],
      ['enterDateOfBirthDetails', () => this.enterDateOfBirthDetails(fieldName as actionRecord)],
    ]);
    const actionToPerform = actionsMap.get(action);
    if (!actionToPerform) {
      throw new Error(`No action found for '${action}'`);
    }
    await actionToPerform();
  }

  private async selectLegalAdvice(legalAdviceData: actionData): Promise<void> {
    await performAction('clickRadioButton', {
      question: freeLegalAdvice.haveYouHadAnyFreeLegalAdviceQuestion,
      option: legalAdviceData,
    });
    await performAction('clickButton', freeLegalAdvice.saveAndContinueButton);
  }

  private async inputDefendantDetails(defendantData: actionRecord): Promise<void> {
    await performAction('inputText', defendantNameCapture.firstNameLabelText, defendantData.fName);
    await performAction('inputText', defendantNameCapture.lastNameLabelText, defendantData.lName);
    await performAction('clickButton', defendantNameCapture.saveAndContinueButton);
  }

  private async enterDateOfBirthDetails(defendantData: actionRecord): Promise<void> {
    await performAction('inputText', dateOfBirth.dayTextLabel, defendantData.dobDay);
    await performAction('inputText', dateOfBirth.monthTextLabel, defendantData.dobMonth);
    await performAction('inputText', dateOfBirth.yearTextLabel, defendantData.dobYear);
    await performAction('clickButton', dateOfBirth.saveAndContinueButton);
  }

  // Below changes are temporary will be changed as part of HDPI-3596
  private async inputErrorValidation(validationArr: actionRecord) {
    if (!validationArr || validationArr.validationReq !== 'YES') {
      return;
    }
    if (!Array.isArray(validationArr.inputArray)) {
      return;
    }

    for (const item of validationArr.inputArray) {
      switch (validationArr.validationType) {
        case 'radioOptions':
          await performValidation(
            'inputError',
            !validationArr?.label ? validationArr.question : validationArr.label,
            item.errMessage
          );
          if (validationArr.option) {
            await performAction('clickRadioButton', { question: validationArr.question, option: validationArr.option });
          }
          break;

        case 'textField':
          await performValidation('inputError', item.label, item.errMessage);
          await performValidation('errorMessage', { header: validationArr.header, message: item.errMessage });
          break;

        case 'checkBox':
          await performAction('clickButton', validationArr.button);
          await performValidation(
            'inputError',
            !validationArr?.label ? validationArr.question : validationArr.label,
            item.errMessage
          );
          break;

        default:
          throw new Error(`Validation type :"${validationArr.validationType}" is not valid`);
      }
    }
  }
}
