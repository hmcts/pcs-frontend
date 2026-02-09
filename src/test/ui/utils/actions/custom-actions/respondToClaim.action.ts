import { Page } from '@playwright/test';

import { submitCaseApiData } from '../../../data/api-data';
import {
  correspondenceAddressKnown,
  dateOfBirth,
  defendantNameCapture,
  defendantNameConfirmation,
  freeLegalAdvice,
  paymentInterstitial,
} from '../../../data/page-data';
import { performAction, performActions, performValidation } from '../../controller';
import { IAction, actionData, actionRecord } from '../../interfaces';

export let claimantsName: string;
export class RespondToClaimAction implements IAction {
  async execute(page: Page, action: string, fieldName: actionData | actionRecord): Promise<void> {
    const actionsMap = new Map<string, () => Promise<void>>([
      ['selectLegalAdvice', () => this.selectLegalAdvice(fieldName)],
      ['inputDefendantDetails', () => this.inputDefendantDetails(fieldName as actionRecord)],
      ['inputErrorValidation', () => this.inputErrorValidation(fieldName as actionRecord)],
      ['enterDateOfBirthDetails', () => this.enterDateOfBirthDetails(fieldName as actionRecord)],
      ['confirmDefendantDetails', () => this.confirmDefendantDetails(fieldName as actionRecord)],
      ['selectCorrespondenceAddressKnown', () => this.selectCorrespondenceAddressKnown(fieldName as actionRecord)],
      ['validateClaimantName', () => this.validateClaimantName(fieldName)],
      ['readPaymentInterstitial', () => this.readPaymentInterstitial()],
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
    await performActions(
      'Defendant Date of Birth Entry',
      ['inputText', dateOfBirth.dayTextLabel, defendantData.dobDay],
      ['inputText', dateOfBirth.monthTextLabel, defendantData.dobMonth],
      ['inputText', dateOfBirth.yearTextLabel, defendantData.dobYear],
      ['clickButton', dateOfBirth.saveAndContinueButton]
    );
  }

  private async confirmDefendantDetails(confirmDefendantName: actionRecord): Promise<void> {
    await performAction('clickRadioButton', {
      question: confirmDefendantName.question,
      option: confirmDefendantName.option,
    });
    await performAction('clickButton', defendantNameConfirmation.saveAndContinueButton);
  }

  private async selectCorrespondenceAddressKnown(addressData: actionRecord): Promise<void> {
    await performAction('clickRadioButton', {
      question: correspondenceAddressKnown.correspondenceAddressConfirmHintText,
      option: addressData.radioOption,
    });
    if (addressData.radioOption === correspondenceAddressKnown.noRadioOption) {
      await performActions(
        'Find Address based on postcode',
        ['inputText', correspondenceAddressKnown.enterUKPostcodeHiddenTextLabel, addressData.postcode],
        ['clickButton', correspondenceAddressKnown.findAddressHiddenButton],
        ['select', correspondenceAddressKnown.addressSelectHiddenLabel, addressData.addressIndex]
      );
    }
    await performAction('clickButton', defendantNameCapture.saveAndContinueButton);
  }

  private async validateClaimantName(isClaimantNameCorrect: actionData) {
    if (isClaimantNameCorrect === 'YES') {
      claimantsName = submitCaseApiData.submitCasePayload.claimantName;
    } else {
      claimantsName = submitCaseApiData.submitCasePayloadNoDefendants.overriddenClaimantName;
    }
    const nameClaimant =
      claimantsName.substring(claimantsName.length - 1) === 's' ? `${claimantsName}’` : `${claimantsName}’s`;
    claimantsName = nameClaimant;
    await performValidation('text', { elementType: 'paragraph', text: claimantsName });
  }
  private async readPaymentInterstitial(): Promise<void> {
    await performAction('clickButton', paymentInterstitial.continueButton);
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
