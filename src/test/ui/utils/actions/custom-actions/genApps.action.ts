import { Page } from '@playwright/test';

import {
  chooseAnApplication,
  doYouNeedHelpPayingTheFee,
  haveYouAlreadyAppliedForHelpWithFees,
  isTheCourtHearingInTheNext14Days,
} from '../../../data/page-data/genApps-page-data';
import { generateRandomString } from '../../common/string.utils';
import { performAction, performValidation } from '../../controller';
import { IAction, actionData, actionRecord } from '../../interfaces';

import { FieldsStore } from './recordAnsweredFields.action';

export class GenAppsAction implements IAction {
  async execute(page: Page, action: string, fieldName: actionData | actionRecord): Promise<void> {
    const actionsMap = new Map<string, () => Promise<void>>([
      ['chooseAnApplication', () => this.chooseAnApplication(fieldName as actionRecord)],
      ['confirmIfCourtHearingInNext14Days', () => this.confirmIfCourtHearingInNext14Days(fieldName as actionRecord)],
      ['doYouNeedHelpPayingFee', () => this.doYouNeedHelpPayingFee(fieldName as actionRecord)],
      ['confirmYouHaveAppliedForFeeHelp', () => this.confirmYouHaveAppliedForFeeHelp(fieldName as actionRecord)],
      ['inputErrorValidationGenApp', () => this.inputErrorValidationGenApp(fieldName as actionRecord)],
    ]);
    const actionToPerform = actionsMap.get(action);
    if (!actionToPerform) {
      throw new Error(`No action found for '${action}'`);
    }
    await actionToPerform();
  }

  private async chooseAnApplication(chooseApp: actionRecord) {
    await performAction('recordUserEntry', chooseApp);
    await performAction('clickRadioButton', {
      question: chooseApp.question,
      option: chooseApp.option,
    });
    await performAction('clickButton', chooseAnApplication.continueButton);
  }

  private async confirmIfCourtHearingInNext14Days(courtHearing: actionRecord) {
    await performAction('recordUserEntry', courtHearing);
    await performAction('clickRadioButton', {
      question: courtHearing.question,
      option: courtHearing.option,
    });
    await performAction('clickButton', isTheCourtHearingInTheNext14Days.continueButton);
  }

  private async doYouNeedHelpPayingFee(feeHelp: actionRecord) {
    await performAction('recordUserEntry', feeHelp);
    await performAction('clickRadioButton', {
      question: feeHelp.question,
      option: feeHelp.option,
    });
    await performAction('clickButton', doYouNeedHelpPayingTheFee.continueButton);
  }

  private async confirmYouHaveAppliedForFeeHelp(confirmFeeHelp: actionRecord) {
    await performAction('recordUserEntry', confirmFeeHelp);
    await performAction('clickRadioButton', {
      question: confirmFeeHelp.question,
      option: confirmFeeHelp.option,
    });
    if (confirmFeeHelp.option === 'Yes') {
      await performAction('inputText', confirmFeeHelp.label, confirmFeeHelp.input);
    } else {
      FieldsStore.delete(confirmFeeHelp.label as string);
    }
    await performAction('clickButton', haveYouAlreadyAppliedForHelpWithFees.continueButton);
  }

  private async inputErrorValidationGenApp(validationArr: actionRecord) {
    const inputs = Array.isArray(validationArr.inputArray) ? validationArr.inputArray : [validationArr.inputArray];

    for (const item of inputs) {
      switch (validationArr.validationType) {
        case 'radioOptions':
          await performAction('clickButton', validationArr.button);
          await performValidation(
            'errorMessage',
            !validationArr?.header ? (validationArr.header = 'There is a problem') : validationArr.header,
            item.errMessage
          );
          await performAction('clickRadioButton', { question: validationArr.question, option: validationArr.option });
          break;

        case 'textField':
          await performAction('inputText', validationArr.label, generateRandomString(item.input));
          await performAction('clickButton', validationArr.button);
          await performValidation('errorMessage', validationArr.label, item.errMessage);
          break;
      }
    }
  }
}
