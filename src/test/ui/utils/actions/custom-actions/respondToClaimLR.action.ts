import { Page } from '@playwright/test';

import {
  circumstancesLR,
  confirmationOfNoticeGiven,
  counterClaimAgainstWhom,
  defendantNameConfirmation,
  doAnyOtherAdultsLiveInYourHome,
  doYouHaveAnyDependantChildren,
  doYouHaveAnyOtherDependants,
  exceptionalHardship,
  incomeAndExpenses,
  nonRentArrearsDispute,
  noticeDateWhenNotProvided,
  tenancyDateUnknown,
  wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome,
  yourCircumstances,
} from '../../../data/page-data';
import { performAction, performActions, performValidation } from '../../controller';
import { IAction, actionData, actionRecord } from '../../interfaces';

import { RespondToClaimAction } from './respondToClaim.action';

export let claimantsName: string;
export class RespondToClaimLRAction extends RespondToClaimAction implements IAction {
  async execute(page: Page, action: string, fieldName?: actionData | actionRecord): Promise<void> {
    const actionsMap = new Map<string, () => Promise<void>>([
      ['selectNoticeDetailsLR', () => this.selectNoticeDetailsLR(fieldName as actionRecord)],
      ['enterTenancyStartDetailsUnKnownLR', () => this.enterTenancyStartDetailsUnKnownLR(fieldName as actionRecord)],
      ['disputingOtherPartsOfTheClaimLR', () => this.disputingOtherPartsOfTheClaimLR(fieldName as actionRecord)],
      ['enterNoticeDateUnknownLR', () => this.enterNoticeDateUnknownLR(fieldName as actionRecord)],
      ['doesTheDependantHaveChildrenLR', () => this.doesTheDependantHaveChildrenLR(fieldName as actionRecord)],
      ['otherDependantsLR', () => this.otherDependantsLR(fieldName as actionRecord)],
      ['otherAdultsLR', () => this.otherAdultsLR(fieldName as actionRecord)],
      ['alternativeAccommodationLR', () => this.alternativeAccommodationLR(fieldName as actionRecord)],
      ['circumstancesLR', () => this.circumstancesLR(fieldName as actionRecord)],
      ['exceptionalHardshipLR', () => this.exceptionalHardshipLR(fieldName as actionRecord)],
      ['selectIncomeAndExpensesLR', () => this.selectIncomeAndExpensesLR(fieldName as actionRecord)],
      ['representationLR', () => this.representationLR(fieldName as actionRecord)],
      ['confirmDefendantDetailsLR', () => this.confirmDefendantDetailsLR(fieldName as actionRecord)],
    ]);
    const actionToPerform = actionsMap.get(action);
    if (!actionToPerform) {
      throw new Error(`No action found for '${action}'`);
    }
    await actionToPerform();
  }

  private async selectNoticeDetailsLR(noticeGivenData: actionRecord): Promise<void> {
    await performAction('clickRadioButton', {
      question: confirmationOfNoticeGiven.getLrDidClaimantGiveYouQuestion(`${process.env.CLAIMANT_NAME}`),
      option: noticeGivenData.option,
    });
    await performAction('clickButton', confirmationOfNoticeGiven.saveAndContinueButton);
  }

  private async enterTenancyStartDetailsUnKnownLR(tenancyStartData: actionRecord) {
    const getDidNotProvideParagraph = tenancyDateUnknown.getLrDidNotProvideParagraph(`${process.env.CLAIMANT_NAME}`);

    await performValidation('text', { elementType: 'paragraph', text: getDidNotProvideParagraph });
    if (tenancyStartData?.tsDay && tenancyStartData?.tsMonth && tenancyStartData?.tsYear) {
      await performActions(
        'Enter Date',
        ['inputText', tenancyDateUnknown.dayTextLabel, tenancyStartData.tsDay],
        ['inputText', tenancyDateUnknown.monthTextLabel, tenancyStartData.tsMonth],
        ['inputText', tenancyDateUnknown.yearTextLabel, tenancyStartData.tsYear]
      );
    }
    await performAction('clickButton', tenancyDateUnknown.saveAndContinueButton);
  }

  private async disputingOtherPartsOfTheClaimLR(doYouWantToDisputeOption: actionRecord): Promise<void> {
    await performAction('clickRadioButton', {
      question: nonRentArrearsDispute.doesTheDefendantWantToDisputeHiddenQuestion,
      option: doYouWantToDisputeOption.disputeOption,
    });

    if (doYouWantToDisputeOption.disputeOption === 'Yes') {
      await performAction(
        'inputText',
        nonRentArrearsDispute.explainPartOfClaimHiddenTextLabel,
        doYouWantToDisputeOption.disputeInfo
      );
    }
    await performAction('clickButton', nonRentArrearsDispute.saveAndContinueButton);
  }

  private async enterNoticeDateUnknownLR(noticeData: actionRecord): Promise<void> {
    const noticeDateNotProvidedQuestion = `When did the defendant receive notice from ${process.env.CLAIMANT_NAME} (optional)?`;
    await performValidation('text', { elementType: 'legend', text: noticeDateNotProvidedQuestion });
    await performValidation('text', {
      elementType: 'paragraph',
      text: noticeDateWhenNotProvided.didNotProvideHiddenParagraph(),
    });
    if (noticeData?.day && noticeData?.month && noticeData?.year) {
      await performActions(
        'Enter Date',
        ['inputText', noticeDateWhenNotProvided.dayTextLabel, noticeData.day],
        ['inputText', noticeDateWhenNotProvided.monthTextLabel, noticeData.month],
        ['inputText', noticeDateWhenNotProvided.yearTextLabel, noticeData.year]
      );
    }
    await performAction('clickButton', noticeDateWhenNotProvided.saveAndContinueButton);
  }

  private async doesTheDependantHaveChildrenLR(dependantChildrenData: actionRecord): Promise<void> {
    await performAction('clickRadioButton', {
      question: doYouHaveAnyDependantChildren.lrMainHeaderHidden,
      option: dependantChildrenData.dependantChildrenOption,
    });

    if (dependantChildrenData.dependantChildrenOption === 'Yes') {
      await performAction(
        'inputText',
        doYouHaveAnyDependantChildren.giveDetailsHiddenLrTextLabel,
        dependantChildrenData.dependantChildrenInfo
      );
    }
    await performAction('clickButton', doYouHaveAnyDependantChildren.saveAndContinueButton);
  }

  private async otherDependantsLR(otherDependantsData: actionRecord): Promise<void> {
    await performAction('clickRadioButton', {
      question: doYouHaveAnyOtherDependants.lrHiddenMainHeader,
      option: otherDependantsData.otherDependantsOption,
    });

    if (otherDependantsData.otherDependantsOption === 'Yes') {
      await performAction(
        'inputText',
        doYouHaveAnyOtherDependants.lrHiddenTextLabel,
        otherDependantsData.otherDependantsInfo
      );
    }
    await performAction('clickButton', doYouHaveAnyOtherDependants.saveAndContinueButton);
  }

  private async otherAdultsLR(adultsInHouseDetails: actionRecord) {
    await performAction('clickRadioButton', {
      question: doAnyOtherAdultsLiveInYourHome.lrMainHeader,
      option: adultsInHouseDetails.radioOption,
    });

    if (adultsInHouseDetails.radioOption === 'Yes' && adultsInHouseDetails.details) {
      await performAction(
        'inputText',
        doAnyOtherAdultsLiveInYourHome.lrGiveDetailsHiddenTextLabel,
        adultsInHouseDetails.details
      );
    }
    await performAction('clickButton', doAnyOtherAdultsLiveInYourHome.saveAndContinueButton);
  }

  private async alternativeAccommodationLR(moveInDetails: actionRecord) {
    await performAction('clickRadioButton', {
      question: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.lrHiddenParagraph,
      option: moveInDetails.radioOption,
    });

    if (moveInDetails.radioOption === 'Yes' && moveInDetails?.day && moveInDetails?.month && moveInDetails?.year) {
      await performActions(
        'Enter Date',
        ['inputText', wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.dayHiddenTextLabel, moveInDetails.day],
        ['inputText', wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.monthHiddenTextLabel, moveInDetails.month],
        ['inputText', wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.yearHiddenTextLabel, moveInDetails.year]
      );
    }
    await performAction('clickButton', wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.saveAndContinueButton);
  }

  private async circumstancesLR(yourCircumstancesData: actionRecord): Promise<void> {
    await performAction('clickRadioButton', {
      question: yourCircumstancesData.question,
      option: yourCircumstancesData.yourCircumstancesOption,
    });
    if (yourCircumstancesData.yourCircumstancesOption === 'Yes') {
      await performAction('inputText', circumstancesLR.lrGiveDetailsHiddenTextLabel, circumstancesLR.detailsTextInput);
    }
    await performAction('clickButton', yourCircumstances.saveAndContinueButton);
  }

  private async exceptionalHardshipLR(exceptionalHardshipData: actionRecord): Promise<void> {
    await performAction('clickRadioButton', {
      question: exceptionalHardshipData.question,
      option: exceptionalHardshipData.exceptionalHardshipOption,
    });
    if (exceptionalHardshipData.exceptionalHardshipOption === 'Yes') {
      await performAction(
        'inputText',
        exceptionalHardship.lrGiveDetailsHiddenTextLabel,
        exceptionalHardship.detailsTextInput
      );
    }
    await performAction('clickButton', exceptionalHardship.saveAndContinueButton);
  }

  private async selectIncomeAndExpensesLR(incomeAndExpenseData: actionRecord): Promise<void> {
    await performAction('clickRadioButton', {
      question: incomeAndExpenses.lrDoesDefendantWantToProvideHiddenHeader,
      option: incomeAndExpenseData.incomeAndExpensesOption,
    });
    await performAction('clickButton', incomeAndExpenses.saveAndContinueButton);
  }

  private async representationLR(representationOption: actionRecord): Promise<void> {
    await performAction('clickRadioButton', {
      question: representationOption.question,
      option: representationOption.radioOption,
    });
    await performAction('clickButton', counterClaimAgainstWhom.saveAndContinueButton);
  }

  private async confirmDefendantDetailsLR(defendantData: actionRecord) {
    //await performValidation('mainHeader', defendantData.question);
    await performAction('clickRadioButton', {
      question: `Is your client’s name ` + defendantData.defendantName + `?`,
      option: defendantData.option,
    });
    if (defendantData.option === 'No') {
      await performAction('inputText', defendantNameConfirmation.firstNameHiddenTextLabel, defendantData.fName);
      await performAction('inputText', defendantNameConfirmation.lastNameHiddenTextLabel, defendantData.lName);
    }
    await performAction('clickButton', defendantNameConfirmation.saveAndContinueButton);
  }
}
