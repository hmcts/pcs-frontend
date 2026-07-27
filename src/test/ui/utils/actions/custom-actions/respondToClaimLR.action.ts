import { Page } from '@playwright/test';

import { previousPaymentsLR, whatRegularIncomeDoYouReceive } from '../../../data/page-data';
import { exceptionalHardshipLR } from '../../../data/page-data/exceptionalHardshipLR.page.data';
import { confirmationOfNoticeDateWhenNotProvidedLR } from '../../../data/page-data/lr-page-data/confirmationOfNoticeDateWhenNotProvidedLR.page.data';
import { noticeDateWhenProvidedLR } from '../../../data/page-data/lr-page-data/confirmationOfNoticeDateWhenProvidedLR.page.data';
import { confirmationOfNoticeGivenLR } from '../../../data/page-data/lr-page-data/confirmationOfNoticeGivenLR.page.data';
import { correspondenceAddressLR } from '../../../data/page-data/lr-page-data/correspondenceAddressLR.page.data';
import { doAnyOtherAdultsLiveInYourHomeLR } from '../../../data/page-data/lr-page-data/doAnyOtherAdultsLiveInYourHomeLR.page.data';
import { doYouHaveAnyDependantChildrenLR } from '../../../data/page-data/lr-page-data/doYouHaveAnyDependantChildrenLR.page.data';
import { doYouHaveAnyOtherDependantsLR } from '../../../data/page-data/lr-page-data/doYouHaveAnyOtherDependantsLR.page.data';
import { haveYouAppliedForUniversalCreditLR } from '../../../data/page-data/lr-page-data/haveYouAppliedForUniversalCreditLR.page.data';
import { incomeAndExpensesLR } from '../../../data/page-data/lr-page-data/incomeAndExpensesLR.page.data';
import { nonRentArrearsDisputeLR } from '../../../data/page-data/lr-page-data/nonRentArrearsDisputeLR.page.data';
import { otherConsiderationsLR } from '../../../data/page-data/lr-page-data/otherConsiderationsLR.page.data';
import { priorityDebtDetailsLR } from '../../../data/page-data/lr-page-data/priorityDebtDetailsLR.page.data';
import { priorityDebtsLR } from '../../../data/page-data/lr-page-data/priorityDebtsLR.page.data';
import { rentArrearsLR } from '../../../data/page-data/lr-page-data/rentArrearsDisputeLR.page.data';
import { repaymentsAgreedLR } from '../../../data/page-data/lr-page-data/repaymentsAgreedLR.page.data';
import { selectDefendantLR } from '../../../data/page-data/lr-page-data/selectDefendantLR.page.data';
import { tenancyDateUnknownLR } from '../../../data/page-data/lr-page-data/tenancyDateUnknownLR.page.data';
import { whatOtherRegularExpensesDoYouHaveLR } from '../../../data/page-data/lr-page-data/whatOtherRegularExpensesDoYouHaveLR.page.data';
import { whatRegularIncomeDoYouReceiveLR } from '../../../data/page-data/lr-page-data/whatRegularIncomeDoYouReceiveLR.page.data';
import { wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHomeLR } from '../../../data/page-data/lr-page-data/wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHomeLR.page.data';
import { yourCircumstancesLR } from '../../../data/page-data/lr-page-data/yourCircumstancesLR.page.data';
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
      ['selectExceptionalHardshipLR', () => this.selectExceptionalHardshipLR(fieldName as actionRecord)],
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
      question: confirmationOfNoticeGivenLR.getDidClaimantGiveYouQuestion(`${process.env.CLAIMANT_NAME}`),
      option: noticeGivenData.option,
    });
    await performAction('clickButton', confirmationOfNoticeGivenLR.saveAndContinueButton);
  }

  private async selectCorrespondenceAddressUnknownLR(addressData: actionRecord) {
    await performValidation('mainHeader', correspondenceAddressLR.correspondenceAddressPostalMainHeader);
    await performAction('clickRadioButton', {
      question: correspondenceAddressLR.correspondenceAddressConfirmHintText(),
      option: addressData.radioOption,
    });

    if (addressData.radioOption === correspondenceAddressLR.noRadioOption) {
      if (addressData.addressIndex) {
        await performActions(
          'Find Address based on postcode',
          ['inputText', correspondenceAddressLR.enterUKPostcodeHiddenTextLabel, addressData.postcode],
          ['clickButton', correspondenceAddressLR.findAddressHiddenButton],
          ['select', correspondenceAddressLR.addressSelectHiddenLabel, addressData.addressIndex]
        );
      } else if (addressData.addressLine1) {
        await performActions(
          'Enter Address Manually',
          ['clickLink', correspondenceAddressLR.enterAddressManuallyHiddenLink],
          ['inputText', correspondenceAddressLR.addressLine1HiddenTextLabel, addressData.addressLine1],
          ['inputText', correspondenceAddressLR.townOrCityHiddenTextLabel, addressData.townOrCity],
          ['inputText', correspondenceAddressLR.postcodeHiddenTextLabel, addressData.postcode]
        );
      }
    }
    await performAction('clickButton', correspondenceAddressLR.saveAndContinueButton);
  }

  private async enterNoticeDateKnownLR(noticeData: actionRecord): Promise<void> {
    await performValidation('text', {
      elementType: 'listItem',
      text: noticeDateWhenProvidedLR.noticeGivenDateLabel,
    });
    if (noticeData?.day && noticeData?.month && noticeData?.year) {
      await performActions(
        'Enter Date',
        ['inputText', noticeDateWhenProvidedLR.dayTextLabel, noticeData.day],
        ['inputText', noticeDateWhenProvidedLR.monthTextLabel, noticeData.month],
        ['inputText', noticeDateWhenProvidedLR.yearTextLabel, noticeData.year]
      );
    }
    await performAction('clickButton', noticeDateWhenProvidedLR.saveAndContinueButton);
  }

  private async enterTenancyStartDetailsUnKnownLR(tenancyStartData: actionRecord) {
    const getDidNotProvideParagraph = tenancyDateUnknownLR.getDidNotProvideParagraph(`${process.env.CLAIMANT_NAME}`);

    await performValidation('text', { elementType: 'paragraph', text: getDidNotProvideParagraph });
    if (tenancyStartData?.tsDay && tenancyStartData?.tsMonth && tenancyStartData?.tsYear) {
      await performActions(
        'Enter Date',
        ['inputText', tenancyDateUnknownLR.dayTextLabel, tenancyStartData.tsDay],
        ['inputText', tenancyDateUnknownLR.monthTextLabel, tenancyStartData.tsMonth],
        ['inputText', tenancyDateUnknownLR.yearTextLabel, tenancyStartData.tsYear]
      );
    }
    await performAction('clickButton', tenancyDateUnknownLR.saveAndContinueButton);
  }

  private async disputingOtherPartsOfTheClaimLR(doYouWantToDisputeOption: actionRecord): Promise<void> {
    await performAction('clickRadioButton', {
      question: nonRentArrearsDisputeLR.doYouWantToDisputeQuestion,
      option: doYouWantToDisputeOption.disputeOption,
    });

    if (doYouWantToDisputeOption.disputeOption === 'Yes') {
      await performAction(
        'inputText',
        nonRentArrearsDisputeLR.explainPartOfClaimHiddenTextLabel,
        doYouWantToDisputeOption.disputeInfo
      );
    }
    await performAction('clickButton', nonRentArrearsDisputeLR.saveAndContinueButton);
  }

  private async enterNoticeDateUnknownLR(noticeData: actionRecord): Promise<void> {
    const noticeDateNotProvidedQuestion = `When did the defendant receive notice from ${process.env.CLAIMANT_NAME} (optional)?`;
    await performValidation('text', { elementType: 'legend', text: noticeDateNotProvidedQuestion });
    await performValidation('text', {
      elementType: 'paragraph',
      text: confirmationOfNoticeDateWhenNotProvidedLR.didNotProvideNoticeLabel(),
    });
    if (noticeData?.day && noticeData?.month && noticeData?.year) {
      await performActions(
        'Enter Date',
        ['inputText', confirmationOfNoticeDateWhenNotProvidedLR.dayTextLabel, noticeData.day],
        ['inputText', confirmationOfNoticeDateWhenNotProvidedLR.monthTextLabel, noticeData.month],
        ['inputText', confirmationOfNoticeDateWhenNotProvidedLR.yearTextLabel, noticeData.year]
      );
    }
    await performAction('clickButton', confirmationOfNoticeDateWhenNotProvidedLR.saveAndContinueButton);
  }

  private async doesTheDependantHaveChildrenLR(dependantChildrenData: actionRecord): Promise<void> {
    await performAction('clickRadioButton', {
      question: doYouHaveAnyDependantChildrenLR.doesTheDefendantHaveDependantChildrenQuestion,
      option: dependantChildrenData.dependantChildrenOption,
    });

    if (dependantChildrenData.dependantChildrenOption === 'Yes') {
      await performAction(
        'inputText',
        doYouHaveAnyDependantChildrenLR.giveDetailsHiddenTextLabel,
        dependantChildrenData.dependantChildrenInfo
      );
    }
    await performAction('clickButton', doYouHaveAnyDependantChildrenLR.saveAndContinueButton);
  }

  private async otherDependantsLR(otherDependantsData: actionRecord): Promise<void> {
    await performAction('clickRadioButton', {
      question: doYouHaveAnyOtherDependantsLR.mainHeader,
      option: otherDependantsData.otherDependantsOption,
    });

    if (otherDependantsData.otherDependantsOption === 'Yes') {
      await performAction(
        'inputText',
        doYouHaveAnyOtherDependantsLR.giveDetailsHiddenTextLabel,
        otherDependantsData.otherDependantsInfo
      );
    }
    await performAction('clickButton', doYouHaveAnyOtherDependantsLR.saveAndContinueButton);
  }

  private async otherAdultsLR(adultsInHouseDetails: actionRecord) {
    await performAction('clickRadioButton', {
      question: doAnyOtherAdultsLiveInYourHomeLR.mainHeader,
      option: adultsInHouseDetails.radioOption,
    });

    if (adultsInHouseDetails.radioOption === 'Yes' && adultsInHouseDetails.details) {
      await performAction(
        'inputText',
        doAnyOtherAdultsLiveInYourHomeLR.giveDetailsAboutOtherAdultsHiddenTextLabel,
        adultsInHouseDetails.details
      );
    }
    await performAction('clickButton', doAnyOtherAdultsLiveInYourHomeLR.saveAndContinueButton);
  }

  private async alternativeAccommodationLR(moveInDetails: actionRecord) {
    await performAction('clickRadioButton', {
      question: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHomeLR.wouldTheDefendantHaveParagraph,
      option: moveInDetails.radioOption,
    });

    if (moveInDetails.radioOption === 'Yes' && moveInDetails?.day && moveInDetails?.month && moveInDetails?.year) {
      await performActions(
        'Enter Date',
        ['inputText', wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHomeLR.dayHiddenTextLabel, moveInDetails.day],
        [
          'inputText',
          wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHomeLR.monthHiddenTextLabel,
          moveInDetails.month,
        ],
        ['inputText', wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHomeLR.yearHiddenTextLabel, moveInDetails.year]
      );
    }
    await performAction('clickButton', wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHomeLR.saveAndContinueButton);
  }

  private async circumstancesLR(yourCircumstancesData: actionRecord): Promise<void> {
    await performAction('clickRadioButton', {
      question: yourCircumstancesData.question,
      option: yourCircumstancesData.yourCircumstancesOption,
    });
    if (yourCircumstancesData.yourCircumstancesOption === 'Yes') {
      await performAction(
        'inputText',
        yourCircumstancesLR.giveDetailsHiddenTextLabel,
        yourCircumstancesLR.detailsTextInput
      );
    }
    await performAction('clickButton', yourCircumstancesLR.saveAndContinueButton);
  }

  private async selectExceptionalHardshipLR(exceptionalHardshipData: actionRecord): Promise<void> {
    await performAction('clickRadioButton', {
      question: exceptionalHardshipData.question,
      option: exceptionalHardshipData.exceptionalHardshipOption,
    });
    if (exceptionalHardshipData.exceptionalHardshipOption === 'Yes') {
      await performAction(
        'inputText',
        exceptionalHardshipLR.giveDetailsHiddenTextLabel,
        exceptionalHardshipLR.detailsTextInput
      );
    }
    await performAction('clickButton', exceptionalHardshipLR.saveAndContinueButton);
  }

  private async selectIncomeAndExpensesLR(incomeAndExpenseData: actionRecord): Promise<void> {
    await performAction('clickRadioButton', {
      question: incomeAndExpensesLR.doesDefendantWantToProvideDetailsHeader,
      option: incomeAndExpenseData.incomeAndExpensesOption,
    });
    await performAction('clickButton', incomeAndExpensesLR.saveAndContinueButton);
  }

  private async representationLR(representationOption: actionRecord): Promise<void> {
    await performAction('clickRadioButton', {
      question: representationOption.question,
      option: representationOption.radioOption,
    });
    await performAction('clickButton', selectDefendantLR.saveAndContinueButton);
  }

  private async selectWhatRegularIncomeDoTheyReceiveLR(regularIncome?: actionRecord): Promise<void> {
    if (!Array.isArray(regularIncome?.regularIncomeOptions)) {
      await performAction('clickButton', whatRegularIncomeDoYouReceiveLR.saveAndContinueButton);
      return;
    }
    for (const income of regularIncome.regularIncomeOptions) {
      const [option, value, frequency] = income;

      await performAction('check', {
        question: whatRegularIncomeDoYouReceiveLR.whatRegularIncomeDoesDefendantReceiveQuestion,
        option,
      });

      if (option === whatRegularIncomeDoYouReceiveLR.moneyFromSomewhereElseParagraph) {
        await performAction(
          'inputText',
          whatRegularIncomeDoYouReceiveLR.giveDetailsAboutOtherSourcesOfIncomeHiddenTextLabel,
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
      question: priorityDebtsLR.doesDefendantHaveAnyPriorityDebtsQuestion,
      option: priorityDebtsData.option,
    });
    await performAction('clickButton', priorityDebtsLR.saveAndContinueButton);
  }

  private async enterPriorityDebtDetailsLR(priorityDebtDetailsData: actionRecord): Promise<void> {
    await performAction(
      'inputText',
      priorityDebtDetailsLR.whatIsTheTotalAmountQuestion,
      priorityDebtDetailsData.totalAmount
    );
    await performAction(
      'inputText',
      priorityDebtDetailsLR.howMuchDoesDefendantPayQuestion,
      priorityDebtDetailsData.payAmount
    );
    await performAction('clickRadioButton', {
      question: priorityDebtDetailsLR.paidEveryParagraph,
      option: priorityDebtDetailsData.option,
    });
    await performAction('clickButton', priorityDebtDetailsLR.saveAndContinueButton);
  }

  private async selectExpensesLR(regularExpense?: actionRecord): Promise<void> {
    if (!Array.isArray(regularExpense?.regularExpensesOptions)) {
      await performAction('clickButton', whatOtherRegularExpensesDoYouHaveLR.saveAndContinueButton);
      return;
    }
    for (const expense of regularExpense.regularExpensesOptions) {
      const [option, value, frequency] = expense;

      await performAction('check', {
        question: whatOtherRegularExpensesDoYouHaveLR.mainHeader,
        option,
      });

      if (!value || !frequency) {
        throw new Error(`Amount and frequency are required for option: ${option}`);
      }

      await performAction('inputText', whatOtherRegularExpensesDoYouHaveLR.amountReceivedHiddenTextLabel, value);
      await performAction('clickRadioButton', frequency);
    }
    await performAction('clickButton', whatOtherRegularExpensesDoYouHaveLR.saveAndContinueButton);
  }

  private async otherConsiderationsLR(otherConsiderationsData: actionRecord): Promise<void> {
    await performAction('clickRadioButton', {
      question: otherConsiderationsData.question,
      option: otherConsiderationsData.option,
    });
    if (otherConsiderationsData.option === 'Yes') {
      await performAction(
        'inputText',
        otherConsiderationsLR.giveDetailsHiddenTextLabel,
        otherConsiderationsData.courtInfo
      );
    }
    await performAction('clickButton', otherConsiderationsLR.saveAndContinueButton);
  }

  private async rentArrearsLR(rentArrearsInfo: actionRecord): Promise<void> {
    await performValidation('text', {
      elementType: 'subHeader',
      text: `Amount the defendant owes in rent arrears given by ${process.env.CLAIMANT_NAME}:`,
    });
    const rentArrearsAmount = formatCurrency(rentArrearsInfo.rentArrearsTotal as string);
    await performValidation('text', {
      elementType: 'paragraph',
      text: `${rentArrearsAmount}`,
    });
    await performAction('clickRadioButton', {
      question: rentArrearsLR.doesDefendantOweThisQuestion,
      option: rentArrearsInfo.option,
    });
    if (rentArrearsInfo.option === 'No') {
      await performAction(
        'inputText',
        rentArrearsLR.howMuchDoesDefendantBelieveHiddenTextLabel,
        rentArrearsInfo.rentAmount
      );
    }
    await performAction('clickButton', rentArrearsLR.saveAndContinueButton);
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
    const repaymentsAgreedQuestion = repaymentsAgreedLR.giveDetailsHiddenTextLabel;
    await performAction('clickRadioButton', {
      question: repaymentsAgreedQuestion,
      option: repaymentsAgreedData.repaymentAgreedOption,
    });
    if (repaymentsAgreedData.repaymentAgreedOption === 'Yes') {
      await performAction(
        'inputText',
        repaymentsAgreedLR.giveDetailsHiddenTextLabel,
        repaymentsAgreedData.repaymentAgreedInfo
      );
    }
    await performAction('clickButton', repaymentsAgreedLR.saveAndContinueButton);
  }

  private async selectUniversalCreditLR(universalCreditDateData: actionRecord): Promise<void> {
    await performAction('clickRadioButton', {
      question: haveYouAppliedForUniversalCreditLR.hasDefendantAppliedParagraph,
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
        ['inputText', haveYouAppliedForUniversalCreditLR.dayHiddenTextLabel, universalCreditDateData.day],
        ['inputText', haveYouAppliedForUniversalCreditLR.monthHiddenTextLabel, universalCreditDateData.month],
        ['inputText', haveYouAppliedForUniversalCreditLR.yearHiddenTextLabel, universalCreditDateData.year]
      );
    }
    await performAction('clickButton', haveYouAppliedForUniversalCreditLR.saveAndContinueButton);
  }
}
