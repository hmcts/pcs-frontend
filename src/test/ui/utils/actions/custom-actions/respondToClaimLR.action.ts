import { Page } from '@playwright/test';

import { submitCaseApiData } from '../../../data/api-data';
import {
  circumstancesLR,
  confirmationOfNoticeGiven,
  correspondenceAddress,
  counterClaimAgainstWhom,
  doAnyOtherAdultsLiveInYourHome,
  doYouHaveAnyDependantChildren,
  doYouHaveAnyOtherDependants,
  exceptionalHardship,
  haveYouAppliedForUniversalCredit,
  incomeAndExpenses,
  nonRentArrearsDispute,
  noticeDateWhenNotProvided,
  noticeDateWhenProvided,
  otherConsiderations,
  previousPaymentsLR,
  priorityDebtDetails,
  priorityDebts,
  rentArrears,
  repaymentsAgreed,
  tenancyDateUnknown,
  whatOtherRegularExpensesDoYouHave,
  whatRegularIncomeDoYouReceive,
  wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome,
  yourCircumstances,
} from '../../../data/page-data';
import { formatCurrency } from '../../common/string.utils';
import { performAction, performActions, performValidation } from '../../controller';
import { IAction, actionData, actionRecord } from '../../interfaces';

import { RespondToClaimAction } from './respondToClaim.action';

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
      [
        'selectWhatRegularIncomeDoTheyReceiveLR',
        () => this.selectWhatRegularIncomeDoTheyReceiveLR(fieldName as actionRecord),
      ],
      ['selectPriorityDebtsLR', () => this.selectPriorityDebtsLR(fieldName as actionRecord)],
      ['enterPriorityDebtDetailsLR', () => this.enterPriorityDebtDetailsLR(fieldName as actionRecord)],
      ['selectExpensesLR', () => this.selectExpensesLR(fieldName as actionRecord)],
      ['otherConsiderationsLR', () => this.otherConsiderationsLR(fieldName as actionRecord)],
      ['rentArrearsLR', () => this.rentArrearsLR(fieldName as actionRecord)],
      ['previousPaymentsLR', () => this.previousPaymentsLR(fieldName as actionRecord)],
      ['repaymentAgreedLR', () => this.repaymentAgreedLR(fieldName as actionRecord)],
      ['selectUniversalCreditLR', () => this.selectUniversalCreditLR(fieldName as actionRecord)],
      [
        'selectCorrespondenceAddressUnknownLR',
        () => this.selectCorrespondenceAddressUnknownLR(fieldName as actionRecord),
      ],
      ['enterNoticeDateKnownLR', () => this.enterNoticeDateKnownLR(fieldName as actionRecord)],
    ]);
    const actionToPerform = actionsMap.get(action);
    if (!actionToPerform) {
      throw new Error(`No action found for '${action}'`);
    }
    await actionToPerform();
  }

  private async selectNoticeDetailsLR(noticeGivenData: actionRecord): Promise<void> {
    await performAction('clickRadioButton', {
      question: confirmationOfNoticeGiven.getLrHiddenDidClaimantGiveYouQuestion(`${process.env.CLAIMANT_NAME}`),
      option: noticeGivenData.option,
    });
    await performAction('clickButton', confirmationOfNoticeGiven.saveAndContinueButton);
  }

  private async selectCorrespondenceAddressUnknownLR(addressData: actionRecord) {
    await performValidation('mainHeader', correspondenceAddress.correspondenceAddressPostalMainHeader);
    await performAction('clickRadioButton', {
      question: correspondenceAddress.correspondenceAddressConfirmHintText(),
      option: addressData.radioOption,
    });

    if (addressData.radioOption === correspondenceAddress.noRadioOption) {
      if (addressData.addressIndex) {
        await performActions(
          'Find Address based on postcode',
          ['inputText', correspondenceAddress.enterUKPostcodeHiddenTextLabel, addressData.postcode],
          ['clickButton', correspondenceAddress.findAddressHiddenButton],
          ['select', correspondenceAddress.addressSelectHiddenLabel, addressData.addressIndex]
        );
      } else if (addressData.addressLine1) {
        await performActions(
          'Enter Address Manually',
          ['clickLink', correspondenceAddress.enterAddressManuallyHiddenLink],
          ['inputText', correspondenceAddress.addressLine1HiddenTextLabel, addressData.addressLine1],
          ['inputText', correspondenceAddress.townOrCityHiddenTextLabel, addressData.townOrCity],
          ['inputText', correspondenceAddress.postcodeHiddenTextLabel, addressData.postcode]
        );
      }
    }
    await performAction('clickButton', correspondenceAddress.saveAndContinueButton);
  }

  private async enterNoticeDateKnownLR(noticeData: actionRecord): Promise<void> {
    await performValidation('text', {
      elementType: 'listItem',
      text: noticeDateWhenProvided.noticeGivenDateHiddenLabelLR,
    });
    if (noticeData?.day && noticeData?.month && noticeData?.year) {
      await performActions(
        'Enter Date',
        ['inputText', noticeDateWhenProvided.dayTextLabel, noticeData.day],
        ['inputText', noticeDateWhenProvided.monthTextLabel, noticeData.month],
        ['inputText', noticeDateWhenProvided.yearTextLabel, noticeData.year]
      );
    }
    await performAction('clickButton', noticeDateWhenProvided.saveAndContinueButton);
  }

  private async enterTenancyStartDetailsUnKnownLR(tenancyStartData: actionRecord) {
    const getDidNotProvideParagraph = tenancyDateUnknown.getLrHiddenDidNotProvideParagraph(
      `${process.env.CLAIMANT_NAME}`
    );

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
        nonRentArrearsDispute.lrExplainWhichPartsDefendantHiddenTextLabel,
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

  private async selectWhatRegularIncomeDoTheyReceiveLR(regularIncome?: actionRecord): Promise<void> {
    if (!Array.isArray(regularIncome?.regularIncomeOptions)) {
      await performAction('clickButton', whatRegularIncomeDoYouReceive.saveAndContinueButton);
      return;
    }
    for (const income of regularIncome.regularIncomeOptions) {
      const [option, value, frequency] = income;

      await performAction('check', {
        question: whatRegularIncomeDoYouReceive.lrHiddenMainHeader,
        option,
      });

      if (option === whatRegularIncomeDoYouReceive.moneyFromSomewhereElseParagraph) {
        await performAction(
          'inputText',
          whatRegularIncomeDoYouReceive.giveDetailsAboutOtherSourcesOfIncomeHiddenTextLabel,
          value
        );
        continue;
      }

      if (!value || !frequency) {
        throw new Error(`Amount and frequency are required for option: ${option}`);
      }

      await performAction('inputText', whatRegularIncomeDoYouReceive.totalAmountReceivedHiddenTextLabel, value);
      await performAction('clickRadioButton', frequency);
    }

    await performAction('clickButton', whatRegularIncomeDoYouReceive.saveAndContinueButton);
  }

  private async selectPriorityDebtsLR(priorityDebtsData: actionRecord): Promise<void> {
    await performAction('clickRadioButton', {
      question: priorityDebts.lrDoesDefendantHavePriorityDebtsHiddenQuestion,
      option: priorityDebtsData.option,
    });
    await performAction('clickButton', priorityDebts.saveAndContinueButton);
  }

  private async enterPriorityDebtDetailsLR(priorityDebtDetailsData: actionRecord): Promise<void> {
    await performAction(
      'inputText',
      priorityDebtDetails.lrHiddenTotalAmountQuestion,
      priorityDebtDetailsData.totalAmount
    );
    await performAction(
      'inputText',
      priorityDebtDetails.lrHiddenHowMuchDefendantPays,
      priorityDebtDetailsData.payAmount
    );
    await performAction('clickRadioButton', {
      question: priorityDebtDetails.paidEveryParagraph,
      option: priorityDebtDetailsData.option,
    });
    await performAction('clickButton', priorityDebtDetails.saveAndContinueButton);
  }

  private async selectExpensesLR(regularExpense?: actionRecord): Promise<void> {
    if (!Array.isArray(regularExpense?.regularExpensesOptions)) {
      await performAction('clickButton', whatOtherRegularExpensesDoYouHave.saveAndContinueButton);
      return;
    }
    for (const expense of regularExpense.regularExpensesOptions) {
      const [option, value, frequency] = expense;

      await performAction('check', {
        question: whatOtherRegularExpensesDoYouHave.lrHiddenMainHeader,
        option,
      });

      if (!value || !frequency) {
        throw new Error(`Amount and frequency are required for option: ${option}`);
      }

      await performAction('inputText', whatOtherRegularExpensesDoYouHave.amountReceivedHiddenTextLabel, value);
      await performAction('clickRadioButton', frequency);
    }
    await performAction('clickButton', whatOtherRegularExpensesDoYouHave.saveAndContinueButton);
  }

  private async otherConsiderationsLR(otherConsiderationsData: actionRecord): Promise<void> {
    await performAction('clickRadioButton', {
      question: otherConsiderationsData.question,
      option: otherConsiderationsData.option,
    });
    if (otherConsiderationsData.option === 'Yes') {
      await performAction(
        'inputText',
        otherConsiderations.lrHiddenGiveDetailsTextLabel,
        otherConsiderationsData.courtInfo
      );
    }
    await performAction('clickButton', otherConsiderations.saveAndContinueButton);
  }

  private async rentArrearsLR(rentArrearsInfo: actionRecord): Promise<void> {
    await performValidation('text', {
      elementType: 'subHeader',
      text: `Amount the defendant owes in rent arrears given by ${process.env.CLAIMANT_NAME}:`,
    });
    const rentArrearsAmount = formatCurrency(
      `${submitCaseApiData.submitCaseRentNonRentCorrespondenceAddressUnknown.rentArrears_Total}`
    );
    await performValidation('text', {
      elementType: 'paragraph',
      text: `${rentArrearsAmount}`,
    });
    await performAction('clickRadioButton', {
      question: rentArrears.lrHiddenDoesDefendantOweQuestion,
      option: rentArrearsInfo.option,
    });
    if (rentArrearsInfo.option === 'No') {
      await performAction(
        'inputText',
        rentArrears.lrHiddenHowMuchDoesDefendantBelieveTextLabel,
        rentArrearsInfo.rentAmount
      );
    }
    await performAction('clickButton', rentArrears.saveAndContinueButton);
  }

  private async previousPaymentsLR(repaymentsData: actionRecord): Promise<void> {
    const repaymentsMadeQuestion = previousPaymentsLR.getMainHeader();
    await performAction('clickRadioButton', {
      question: repaymentsMadeQuestion,
      option: repaymentsData.repaymentOption,
    });
    if (repaymentsData.repaymentOption === 'Yes') {
      await performAction('inputText', previousPaymentsLR.giveDetailsHiddenTextLabel, repaymentsData.repaymentInfo);
    }
    await performAction('clickButton', previousPaymentsLR.saveAndContinueButton);
  }

  private async repaymentAgreedLR(repaymentsAgreedData: actionRecord): Promise<void> {
    const repaymentsAgreedQuestion = repaymentsAgreed.lrHiddenMainHeader();
    await performAction('clickRadioButton', {
      question: repaymentsAgreedQuestion,
      option: repaymentsAgreedData.repaymentAgreedOption,
    });
    if (repaymentsAgreedData.repaymentAgreedOption === 'Yes') {
      await performAction(
        'inputText',
        repaymentsAgreed.lrGiveDetailsHiddenTextLabel,
        repaymentsAgreedData.repaymentAgreedInfo
      );
    }
    await performAction('clickButton', repaymentsAgreed.saveAndContinueButton);
  }

  private async selectUniversalCreditLR(universalCreditDateData: actionRecord): Promise<void> {
    await performAction('clickRadioButton', {
      question: haveYouAppliedForUniversalCredit.lrHiddenmainHeader,
      option: universalCreditDateData.creditRadioOption,
    });
    if (
      universalCreditDateData.creditRadioOption === 'Yes' &&
      universalCreditDateData?.day &&
      universalCreditDateData?.month &&
      universalCreditDateData?.year
    ) {
      await performActions(
        'Enter Date',
        ['inputText', haveYouAppliedForUniversalCredit.dayHiddenTextLabel, universalCreditDateData.day],
        ['inputText', haveYouAppliedForUniversalCredit.monthHiddenTextLabel, universalCreditDateData.month],
        ['inputText', haveYouAppliedForUniversalCredit.yearHiddenTextLabel, universalCreditDateData.year]
      );
    }
    await performAction('clickButton', haveYouAppliedForUniversalCredit.saveAndContinueButton);
  }
}
