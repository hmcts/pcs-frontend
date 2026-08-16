import { Page } from '@playwright/test';

import { submitCaseApiData } from '../../../data/api-data';
import { submitCaseApiDataWales } from '../../../data/api-data/submitCaseWales.api.data';
import {
  confirmationOfNoticeGiven,
  correspondenceAddress,
  counterClaim,
  counterClaimAbout,
  counterClaimAgainstWhom,
  counterClaimFee,
  counterClaimHaveYouAppliedForHelp,
  counterClaimOrderOtherThanSum,
  counterClaimSpecificSumOfMoney,
  counterClaimWhatAreYouClaimingFor,
  counterclaimDoYouWantToUploadFiles,
  defendantDateOfBirth,
  defendantNameConfirmation,
  doAnyOtherAdultsLiveInYourHome,
  doYouHaveAnyDependantChildren,
  doYouHaveAnyOtherDependants,
  emailConfirmation,
  endOfJourneyCYA,
  exceptionalHardship,
  exemptLandlord,
  haveYouAppliedForUniversalCredit,
  howMuchAffordToPay,
  incomeAndExpenses,
  instalmentPayments,
  languageUsed,
  nonRentArrearsDispute,
  noticeDateWhenNotProvided,
  noticeDateWhenProvided,
  otherConsiderations,
  priorityDebtDetails,
  priorityDebts,
  rentArrears,
  repaymentsAgreed,
  repaymentsMade,
  selectDefendant,
  tenancyDateDetails,
  tenancyDateUnknown,
  tenancyTypeDetails,
  uploadAdditionalDocuments,
  uploadFilesToSupportYourCounterclaim,
  whatOtherRegularExpensesDoYouHave,
  whatRegularIncomeDoYouReceive,
  wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome,
  writtenTerms,
  yourCircumstances,
} from '../../../data/page-data/lr-page-data';
import { formatCurrency, formatPoundsValue, formatTextToLowercaseSeparatedBySpace } from '../../common/string.utils';
import { performAction, performActions, performValidation } from '../../controller';
import { IAction, actionData, actionRecord } from '../../interfaces';

import { RespondToClaimAction } from './respondToClaim.action';

const rtcNoAnswerProvidedValue = 'No answer provided';
const rtcUploadedDocumentsQuestion = 'Uploaded files';
const rtcNoDocumentsUploadedValue = 'No files uploaded';

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
      ['selectCounterClaimLR', () => this.selectCounterClaimLR(fieldName as actionRecord)],
      ['counterClaimSpecificSumOfMoneyLR', () => this.counterClaimSpecificSumOfMoneyLR(fieldName as actionRecord)],
      ['selectWhatAreYouClaimingForLR', () => this.selectWhatAreYouClaimingForLR(fieldName as actionRecord)],
      ['selectCounterClaimFeeLR', () => this.selectCounterClaimFeeLR(fieldName as actionRecord)],
      ['selectClaimAgainstWhomLR', () => this.selectClaimAgainstWhomLR(fieldName as actionRecord)],
      ['counterClaimAboutLR', () => this.counterClaimAboutLR(fieldName as actionRecord)],
      ['otherConsiderationsLR', () => this.otherConsiderationsLR(fieldName as actionRecord)],
      ['rentArrearsLR', () => this.rentArrearsLR(fieldName as actionRecord)],
      ['previousPaymentsLR', () => this.previousPaymentsLR(fieldName as actionRecord)],
      ['repaymentAgreedLR', () => this.repaymentAgreedLR(fieldName as actionRecord)],
      ['installmentPaymentsLR', () => this.installmentPaymentsLR(fieldName as actionRecord)],
      ['counterClaimOrderOtherThanSumLR', () => this.counterClaimOrderOtherThanSumLR(fieldName as actionRecord)],
      ['selectHowMuchAffordToPayLR', () => this.selectHowMuchAffordToPayLR(fieldName as actionRecord)],
      [
        'counterClaimHaveYouAppliedForHelpWithFeeLR',
        () => this.counterClaimHaveYouAppliedForHelpWithFeeLR(fieldName as actionRecord),
      ],
      ['selectUniversalCreditLR', () => this.selectUniversalCreditLR(fieldName as actionRecord)],
      ['selectCorrespondenceAddressLR', () => this.selectCorrespondenceAddressLR(fieldName as actionRecord)],
      ['enterNoticeDateKnownLR', () => this.enterNoticeDateKnownLR(fieldName as actionRecord)],
      ['uploadAdditionalDocumentsLR', () => this.uploadAdditionalDocumentsLR(fieldName as actionRecord)],
      ['doYouWantToUploadFilesLR', () => this.doYouWantToUploadFilesLR(fieldName as actionRecord)],
      ['uploadFilesToSupportCounterclaimLR', () => this.uploadFilesToSupportCounterclaimLR(fieldName as actionRecord)],
      [
        'selectCorrespondenceAddressUnKnownLR',
        () => this.selectCorrespondenceAddressUnKnownLR(fieldName as actionRecord),
      ],
      ['confirmDefendantDetailsLR', () => this.confirmDefendantDetailsLR(fieldName as actionRecord)],
      ['enterDateOfBirthDetailsLR', () => this.enterDateOfBirthDetailsLR(fieldName as actionRecord)],
      ['languageUsedLR', () => this.languageUsedLR(fieldName as actionRecord)],
      ['selectStatementOfTruthRTCLR', () => this.selectStatementOfTruthRTCLR(fieldName as actionRecord)],
      ['emailConfirmationLR', () => this.emailConfirmationLR(fieldName as actionRecord)],
      ['exemptLandlordLR', () => this.exemptLandlordLR(fieldName as actionRecord)],
      ['selectWrittenTermsLR', () => this.selectWrittenTermsLR(fieldName as actionRecord)],
      ['selectTenancyStartDateKnownLR', () => this.selectTenancyStartDateKnownLR(fieldName as actionRecord)],
      ['tenancyOrContractTypeDetailsLR', () => this.tenancyOrContractTypeDetailsLR(fieldName as actionRecord)],
    ]);
    const actionToPerform = actionsMap.get(action);
    if (!actionToPerform) {
      throw new Error(`No action found for '${action}'`);
    }
    await actionToPerform();
  }

  private async selectNoticeDetailsLR(noticeGivenData: actionRecord): Promise<void> {
    this.recordAnswer(
      confirmationOfNoticeGiven.getDidClaimantGiveYouQuestion(`${process.env.CLAIMANT_NAME}`),
      noticeGivenData.option
    );
    await performAction('clickRadioButton', {
      question: confirmationOfNoticeGiven.getDidClaimantGiveYouQuestion(`${process.env.CLAIMANT_NAME}`),
      option: noticeGivenData.option,
    });
    await performAction('clickButton', confirmationOfNoticeGiven.saveAndContinueButton);
  }

  private async exemptLandlordLR(exemptOption: actionRecord): Promise<void> {
    //this.recordAnswer(exemptLandLord.isYourLandlordAnExemptSubHeader, exemptLandLordAnswer);
    await performAction('clickRadioButton', {
      question: exemptLandlord.isYourLandlordAnExemptSubHeader,
      option: exemptOption,
    });
    await performAction('clickButton', exemptLandlord.saveAndContinueButton);
  }

  private async selectWrittenTermsLR(writtenTermsData: actionRecord): Promise<void> {
    // this.recordAnswer(String(writtenTermsData.question), writtenTermsData.radioOption);
    await performAction('clickRadioButton', {
      question: writtenTermsData.question,
      option: writtenTermsData.radioOption,
    });
    await performAction('clickButton', writtenTerms.saveAndContinueButton);
  }

  private async tenancyOrContractTypeDetailsLR(tenancyTypeDetailsInfo: actionRecord) {
    const tenancyType = formatTextToLowercaseSeparatedBySpace(tenancyTypeDetailsInfo.tenancyType as string);
    const article = /^[aeiou]/i.test(tenancyType) ? 'an' : 'a';
    if (process.env.WALES_POSTCODE === 'YES') {
      if (tenancyType === 'secure contract') {
        await performValidation('text', {
          elementType: 'listItem',
          text: `The property is let under a secure occupation contract`,
        });
      } else if (tenancyType === 'standard contract') {
        await performValidation('text', {
          elementType: 'listItem',
          text: `The property is let under a standard occupation contract`,
        });
      } else if (tenancyType === 'other') {
        await performValidation('text', {
          elementType: 'listItem',
          text: `The claimant provided the following information about your tenancy, occupation contract or licence agreement type: ${submitCaseApiDataWales.submitCaseRentOtherTenancy.otherLicenceTypeDetails}`,
        });
      }
    } else {
      if (
        tenancyType === 'assured tenancy' ||
        tenancyType === 'introductory tenancy' ||
        tenancyType === 'secure tenancy' ||
        tenancyType === 'flexible tenancy' ||
        tenancyType === 'demoted tenancy'
      ) {
        await performValidation('text', {
          elementType: 'listItem',
          text: `The property is let under ${article} ${tenancyType} agreement`,
        });
      } else if (tenancyType === 'other') {
        await performValidation('text', {
          elementType: 'listItem',
          text: `The claimant provided the following information about your tenancy, occupation contract or licence agreement type: ${submitCaseApiData.submitCasePayloadOtherTenancy.tenancy_DetailsOfOtherTypeOfTenancyLicence}`,
        });
      }
    }
    if (tenancyTypeDetailsInfo?.showTenancyDocumentLink) {
      await performValidation('text', {
        elementType: 'link',
        text: tenancyTypeDetails.tenancyDocumentDynamicLink,
      });
      await performValidation('validatePdfDocument', {
        linkText: tenancyTypeDetails.tenancyDocumentDynamicLink,
      });
    }
    //this.recordAnswer(tenancyTypeDetails.isTenancyTypeCorrectQuestion, tenancyTypeDetailsInfo.tenancyOption);
    await performAction('clickRadioButton', {
      question: tenancyTypeDetails.isTenancyTypeCorrectQuestion,
      option: tenancyTypeDetailsInfo.tenancyOption,
    });
    if (tenancyTypeDetailsInfo.tenancyOption === 'No' && tenancyTypeDetailsInfo.tenancyTypeInfo) {
      //this.recordAnswer(
      //   tenancyTypeDetails.giveCorrectTenancyTypeHiddenTextLabel,
      //   tenancyTypeDetailsInfo.tenancyTypeInfo
      // );
      await performAction(
        'inputText',
        tenancyTypeDetails.giveCorrectTenancyTypeHiddenTextLabel,
        tenancyTypeDetailsInfo.tenancyTypeInfo
      );
    } else {
      //this.deleteAnswer(tenancyTypeDetails.giveCorrectTenancyTypeHiddenTextLabel);
    }
    await performAction('clickButton', tenancyTypeDetails.saveAndContinueButton);
  }

  private async selectTenancyStartDateKnownLR(tenancyStartDateData: actionRecord): Promise<void> {
    await performValidation('text', {
      elementType: 'paragraph',
      text: tenancyDateDetails.getDetailsGivenByParagraph(),
    });
    //this.recordAnswer(tenancyDateDetails.isTheTenancyLicenceOrOccupationContractQuestion, tenancyStartDateData.option);
    await performAction('clickRadioButton', {
      question: tenancyDateDetails.isTheTenancyLicenceOrOccupationContractQuestion,
      option: tenancyStartDateData.option,
    });
    if (tenancyStartDateData?.day && tenancyStartDateData?.month && tenancyStartDateData?.year) {
      // this.recordRtcCyaDateFromParts(
      //   this.getRtcCyaQuestionLabel(tenancyDateDetails.whatIsTheCorrectStartDateHiddenQuestion),
      //   tenancyStartDateData.day,
      //   tenancyStartDateData.month,
      //   tenancyStartDateData.year
      // );
      await performActions(
        'Enter Date',
        ['inputText', tenancyDateDetails.dayHiddenTextLabel, tenancyStartDateData.day],
        ['inputText', tenancyDateDetails.monthHiddenTextLabel, tenancyStartDateData.month],
        ['inputText', tenancyDateDetails.yearHiddenTextLabel, tenancyStartDateData.year]
      );
    }
    await performAction('clickButton', tenancyDateDetails.saveAndContinueButton);
  }

  private async selectCorrespondenceAddressLR(addressData: actionRecord) {
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

  private async emailConfirmationLR(emailData: actionRecord): Promise<void> {
    await performAction('clickRadioButton', {
      question: emailConfirmation.doYouKnowDefendantEmailQuestion,
      option: emailData.radioOption,
    });
    if (emailData.radioOption === 'Yes') {
      await performAction(
        'inputText',
        emailConfirmation.enterDefendantEmailAddressHiddenTextLabel,
        emailConfirmation.emailAddressTextInput
      );
    }
    await performAction('clickButton', emailConfirmation.saveAndContinueButton);
  }

  private async enterNoticeDateKnownLR(noticeData: actionRecord): Promise<void> {
    await performValidation('text', { elementType: 'listItem', text: noticeDateWhenProvided.noticeGivenDateLabel });
    await performValidation('text', {
      elementType: 'listItem',
      text: noticeDateWhenProvided.noticeGivenDateLabel,
    });
    this.recordRtcCyaDateFromParts(
      `When did the defendant receive notice from ${process.env.CLAIMANT_NAME}?`,
      noticeData?.day,
      noticeData?.month,
      noticeData?.year
    );
    if (noticeData?.day && noticeData?.month && noticeData?.year) {
      await performActions(
        'Enter Date',
        ['inputText', noticeDateWhenProvided.dayTextLabel, noticeData.day],
        ['inputText', noticeDateWhenProvided.monthTextLabel, noticeData.month],
        ['inputText', noticeDateWhenProvided.yearTextLabel, noticeData.year]
      );
    }
    await performAction('clickButton', noticeDateWhenNotProvided.saveAndContinueButton);
  }

  private async enterTenancyStartDetailsUnKnownLR(tenancyStartData: actionRecord) {
    const getDidNotProvideParagraph = tenancyDateUnknown.getDidNotProvideParagraph(`${process.env.CLAIMANT_NAME}`);

    await performValidation('text', { elementType: 'paragraph', text: getDidNotProvideParagraph });
    this.recordRtcCyaDateFromParts(
      this.getRtcCyaQuestionLabel(tenancyDateUnknown.whenDidYourTenancyQuestion),
      tenancyStartData?.tsDay,
      tenancyStartData?.tsMonth,
      tenancyStartData?.tsYear
    );
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
    this.recordAnswer(nonRentArrearsDispute.doYouWantToDisputeQuestion, doYouWantToDisputeOption.disputeOption);
    await performAction('clickRadioButton', {
      question: nonRentArrearsDispute.doYouWantToDisputeQuestion,
      option: doYouWantToDisputeOption.disputeOption,
    });

    if (doYouWantToDisputeOption.disputeOption === 'Yes') {
      this.recordAnswer(nonRentArrearsDispute.explainPartOfClaimHiddenTextLabel, doYouWantToDisputeOption.disputeInfo);
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
      text: noticeDateWhenNotProvided.didNotProvideNoticeLabel(),
    });
    this.recordRtcCyaDateFromParts(
      `When did the defendant receive notice from ${process.env.CLAIMANT_NAME}?`,
      noticeData?.day,
      noticeData?.month,
      noticeData?.year
    );
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
    this.recordAnswer(
      doYouHaveAnyDependantChildren.doesTheDefendantHaveDependantChildrenQuestion,
      dependantChildrenData.dependantChildrenOption
    );
    await performAction('clickRadioButton', {
      question: doYouHaveAnyDependantChildren.doesTheDefendantHaveDependantChildrenQuestion,
      option: dependantChildrenData.dependantChildrenOption,
    });

    if (dependantChildrenData.dependantChildrenOption === 'Yes') {
      await performAction(
        'inputText',
        doYouHaveAnyDependantChildren.giveDetailsHiddenTextLabel,
        dependantChildrenData.dependantChildrenInfo
      );
    }
    await performAction('clickButton', doYouHaveAnyDependantChildren.saveAndContinueButton);
  }

  private async otherDependantsLR(otherDependantsData: actionRecord): Promise<void> {
    this.recordAnswer(
      doYouHaveAnyOtherDependants.doesDefendantHaveDependantParagraph,
      otherDependantsData.otherDependantsOption
    );
    await performAction('clickRadioButton', {
      question: doYouHaveAnyOtherDependants.mainHeader,
      option: otherDependantsData.otherDependantsOption,
    });

    if (otherDependantsData.otherDependantsOption === 'Yes') {
      this.recordAnswer(
        doYouHaveAnyOtherDependants.giveDetailsHiddenTextLabel,
        otherDependantsData.otherDependantsInfo
      );
      await performAction(
        'inputText',
        doYouHaveAnyOtherDependants.giveDetailsHiddenTextLabel,
        otherDependantsData.otherDependantsInfo
      );
    } else {
      this.deleteAnswer(doYouHaveAnyOtherDependants.giveDetailsHiddenTextLabel);
    }
    await performAction('clickButton', doYouHaveAnyOtherDependants.saveAndContinueButton);
  }

  private async otherAdultsLR(adultsInHouseDetails: actionRecord) {
    this.recordAnswer(doAnyOtherAdultsLiveInYourHome.doAnyOtherAdultsParagraph, adultsInHouseDetails.radioOption);
    await performAction('clickRadioButton', {
      question: doAnyOtherAdultsLiveInYourHome.mainHeader,
      option: adultsInHouseDetails.radioOption,
    });

    if (adultsInHouseDetails.radioOption === 'Yes' && adultsInHouseDetails.details) {
      this.recordAnswer(
        doAnyOtherAdultsLiveInYourHome.giveDetailsAboutOtherAdultsHiddenTextLabel,
        adultsInHouseDetails.details
      );
      await performAction(
        'inputText',
        doAnyOtherAdultsLiveInYourHome.giveDetailsAboutOtherAdultsHiddenTextLabel,
        adultsInHouseDetails.details
      );
    }
    await performAction('clickButton', doAnyOtherAdultsLiveInYourHome.saveAndContinueButton);
  }

  private async alternativeAccommodationLR(moveInDetails: actionRecord) {
    const moveInDateLabel = this.getRtcCyaQuestionLabel(
      wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.whenWouldTheyBeAbleToMoveInHiddenQuestion
    );
    this.recordAnswer(
      wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.wouldTheDefendantHaveParagraph,
      moveInDetails.radioOption
    );
    await performAction('clickRadioButton', {
      question: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.wouldTheDefendantHaveParagraph,
      option: moveInDetails.radioOption,
    });

    if (moveInDetails.radioOption === 'Yes' && moveInDetails?.day && moveInDetails?.month && moveInDetails?.year) {
      this.recordRtcCyaDateFromParts(moveInDateLabel, moveInDetails.day, moveInDetails.month, moveInDetails.year);
      await performActions(
        'Enter Date',
        ['inputText', wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.dayHiddenTextLabel, moveInDetails.day],
        ['inputText', wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.monthHiddenTextLabel, moveInDetails.month],
        ['inputText', wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.yearHiddenTextLabel, moveInDetails.year]
      );
    } else if (moveInDetails.radioOption === 'Yes') {
      this.recordRtcCyaSummaryRow(moveInDateLabel, []);
    }
    if (moveInDetails.radioOption !== 'Yes') {
      this.deleteRtcCyaDate(moveInDateLabel);
    }
    await performAction('clickButton', wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.saveAndContinueButton);
  }

  private async circumstancesLR(yourCircumstancesData: actionRecord): Promise<void> {
    this.recordAnswer(yourCircumstances.wouldYouLikeToShareHeader, yourCircumstancesData.yourCircumstancesOption);
    await performAction('clickRadioButton', {
      question: yourCircumstancesData.question,
      option: yourCircumstancesData.yourCircumstancesOption,
    });
    if (yourCircumstancesData.yourCircumstancesOption === 'Yes') {
      this.recordAnswer(yourCircumstances.giveDetailsHiddenTextLabel, yourCircumstances.detailsTextInput);
      await performAction(
        'inputText',
        yourCircumstances.giveDetailsHiddenTextLabel,
        yourCircumstances.detailsTextInput
      );
    } else {
      this.deleteAnswer(yourCircumstances.giveDetailsHiddenTextLabel);
    }
    await performAction('clickButton', yourCircumstances.saveAndContinueButton);
  }

  private async selectExceptionalHardshipLR(exceptionalHardshipData: actionRecord): Promise<void> {
    this.recordAnswer(
      exceptionalHardship.wouldDefendantExperienceExceptionalHardshipParagraph,
      exceptionalHardshipData.exceptionalHardshipOption
    );
    await performAction('clickRadioButton', {
      question: exceptionalHardshipData.question,
      option: exceptionalHardshipData.exceptionalHardshipOption,
    });
    if (exceptionalHardshipData.exceptionalHardshipOption === 'Yes') {
      this.recordAnswer(exceptionalHardship.giveDetailsHiddenTextLabel, exceptionalHardship.detailsTextInput);
      await performAction(
        'inputText',
        exceptionalHardship.giveDetailsHiddenTextLabel,
        exceptionalHardship.detailsTextInput
      );
    } else {
      this.deleteAnswer(exceptionalHardship.giveDetailsHiddenTextLabel);
    }
    await performAction('clickButton', exceptionalHardship.saveAndContinueButton);
  }

  private async selectIncomeAndExpensesLR(incomeAndExpenseData: actionRecord): Promise<void> {
    this.recordAnswer(
      incomeAndExpenses.doesDefendantWantToProvideDetailsHeader,
      incomeAndExpenseData.incomeAndExpensesOption
    );
    await performAction('clickRadioButton', {
      question: incomeAndExpenses.doesDefendantWantToProvideDetailsHeader,
      option: incomeAndExpenseData.incomeAndExpensesOption,
    });
    await performAction('clickButton', incomeAndExpenses.saveAndContinueButton);
  }

  private async representationLR(representationOption: actionRecord): Promise<void> {
    await performAction('clickRadioButton', {
      question: representationOption.question,
      option: representationOption.radioOption,
    });
    await performAction('clickButton', selectDefendant.saveAndContinueButton);
  }

  private async confirmDefendantDetailsLR(defendantData: actionRecord) {
    this.recordAnswer(String(defendantData.question), defendantData.option);
    await performAction('clickRadioButton', {
      question: defendantData.question,
      option: defendantData.option,
    });
    if (defendantData.option === 'No') {
      this.recordAnswer(String(defendantData.question), defendantData.option);
      await performAction(
        'inputText',
        defendantNameConfirmation.defendantFirstNameHiddenTextLabel,
        defendantData.fName
      );
      await performAction('inputText', defendantNameConfirmation.defendantLastNameHiddenTextLabel, defendantData.lName);
    }
    await performAction('clickButton', defendantNameConfirmation.saveAndContinueButton);
  }

  private async enterDateOfBirthDetailsLR(defendantData: actionRecord) {
    if (defendantData?.dobDay && defendantData?.dobMonth && defendantData?.dobYear) {
      this.recordRtcCyaDateFromParts(
        `Defendant’s date of birth`,
        defendantData?.dobDay,
        defendantData?.dobMonth,
        defendantData?.dobYear
      );
      await performActions(
        'Defendant Date of Birth Entry',
        ['inputText', defendantDateOfBirth.dayTextLabel, defendantData.dobDay],
        ['inputText', defendantDateOfBirth.monthTextLabel, defendantData.dobMonth],
        ['inputText', defendantDateOfBirth.yearTextLabel, defendantData.dobYear]
      );
    }
    await performAction('clickButton', defendantDateOfBirth.saveAndContinueButton);
  }

  private async selectCorrespondenceAddressUnKnownLR(addressData: actionRecord) {
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
      }
      await performActions(
        'Enter Address Manually',
        ['clickLink', correspondenceAddress.enterAddressManuallyHiddenLink],
        ['inputText', correspondenceAddress.addressLine1HiddenTextLabel, addressData.addressLine1],
        ['inputText', correspondenceAddress.townOrCityHiddenTextLabel, addressData.townOrCity],
        ['inputText', correspondenceAddress.postcodeHiddenTextLabel, addressData.postcode]
      );
    }

    await performAction('clickButton', correspondenceAddress.saveAndContinueButton);
  }

  private async selectWhatRegularIncomeDoTheyReceiveLR(regularIncome?: actionRecord): Promise<void> {
    const regularIncomeQuestionLabel = this.getRtcCyaQuestionLabel(`What regular income does the defendant receive?`);
    if (!Array.isArray(regularIncome?.regularIncomeOptions)) {
      this.recordAnswer(regularIncomeQuestionLabel, rtcNoAnswerProvidedValue);
      await performAction('clickButton', whatRegularIncomeDoYouReceive.saveAndContinueButton);
      return;
    }
    const selectedRegularIncomeEntries: [string, string][] = [];

    for (const income of regularIncome.regularIncomeOptions) {
      const [option, value, frequency] = income;

      await performAction('check', {
        question: whatRegularIncomeDoYouReceive.whatRegularIncomeDoesDefendantReceiveQuestion,
        option,
      });

      if (option === whatRegularIncomeDoYouReceive.moneyFromSomewhereElseParagraph) {
        await performAction(
          'inputText',
          whatRegularIncomeDoYouReceive.giveDetailsAboutOtherSourcesOfIncomeHiddenTextLabel,
          value
        );
        selectedRegularIncomeEntries.push([this.getRtcCyaChoiceLabel(option), String(value)]);
        continue;
      }

      if (!value || !frequency) {
        throw new Error(`Amount and frequency are required for option: ${option}`);
      }

      await performAction('inputText', whatRegularIncomeDoYouReceive.totalAmountReceivedHiddenTextLabel, value);
      await performAction('clickRadioButton', frequency);
      selectedRegularIncomeEntries.push([
        this.getRtcCyaChoiceLabel(option),
        this.buildRtcCyaAmountAndFrequencyValue(value, frequency, 'received every'),
      ]);
    }
    this.recordRtcCyaHeadingWithItems(regularIncomeQuestionLabel, selectedRegularIncomeEntries);

    await performAction('clickButton', whatRegularIncomeDoYouReceive.saveAndContinueButton);
  }

  private async selectPriorityDebtsLR(priorityDebtsData: actionRecord): Promise<void> {
    this.recordAnswer(priorityDebts.doesDefendantHaveAnyPriorityDebtsQuestion, priorityDebtsData.option);
    await performAction('clickRadioButton', {
      question: priorityDebts.doesDefendantHaveAnyPriorityDebtsQuestion,
      option: priorityDebtsData.option,
    });

    await performAction('clickButton', priorityDebts.saveAndContinueButton);
  }

  private async enterPriorityDebtDetailsLR(priorityDebtDetailsData: actionRecord): Promise<void> {
    this.recordAnswer(
      priorityDebtDetails.whatIsTheTotalAmountQuestion,
      formatPoundsValue(String(priorityDebtDetailsData.totalAmount))
    );
    this.recordAnswer(
      priorityDebtDetails.howMuchDoesDefendantPayQuestion,
      this.buildRtcCyaAmountAndFrequencyValue(
        priorityDebtDetailsData.payAmount,
        priorityDebtDetailsData.option,
        'paid every'
      )
    );
    this.deleteAnswer(priorityDebtDetails.paidEveryParagraph);
    await performAction(
      'inputText',
      priorityDebtDetails.whatIsTheTotalAmountQuestion,
      priorityDebtDetailsData.totalAmount
    );
    await performAction(
      'inputText',
      priorityDebtDetails.howMuchDoesDefendantPayQuestion,
      priorityDebtDetailsData.payAmount
    );
    await performAction('clickRadioButton', {
      question: priorityDebtDetails.paidEveryParagraph,
      option: priorityDebtDetailsData.option,
    });
    await performAction('clickButton', priorityDebtDetails.saveAndContinueButton);
  }

  private async selectExpensesLR(regularExpense?: actionRecord): Promise<void> {
    const regularExpensesQuestionLabel = this.getRtcCyaQuestionLabel(
      whatOtherRegularExpensesDoYouHave.whatOtherRegularExpensesQuestion
    );

    const clearRegularExpenseAnswers = (): void => {
      this.deleteAnswer(regularExpensesQuestionLabel);
    };
    if (!Array.isArray(regularExpense?.regularExpensesOptions)) {
      clearRegularExpenseAnswers();
      this.recordRtcCyaSummaryRow(regularExpensesQuestionLabel, []);
      await performAction('clickButton', whatOtherRegularExpensesDoYouHave.saveAndContinueButton);
      return;
    }
    clearRegularExpenseAnswers();
    const selectedRegularExpenseEntries: [string, string][] = [];

    for (const expense of regularExpense.regularExpensesOptions) {
      const [option, value, frequency] = expense;

      await performAction('check', {
        question: whatOtherRegularExpensesDoYouHave.mainHeader,
        option,
      });

      if (!value || !frequency) {
        throw new Error(`Amount and frequency are required for option: ${option}`);
      }

      await performAction('inputText', whatOtherRegularExpensesDoYouHave.amountReceivedHiddenTextLabel, value);
      await performAction('clickRadioButton', frequency);
      const mappedCyaLabel =
        option === whatOtherRegularExpensesDoYouHave.otherExpensesParagraph
          ? 'Other expenses'
          : this.getRtcCyaChoiceLabel(option);
      selectedRegularExpenseEntries.push([mappedCyaLabel, this.buildRtcCyaAmountAndFrequencyValue(value, frequency)]);
    }
    this.recordRtcCyaHeadingWithItems(regularExpensesQuestionLabel, selectedRegularExpenseEntries);
    await performAction('clickButton', whatOtherRegularExpensesDoYouHave.saveAndContinueButton);
  }

  private async otherConsiderationsLR(otherConsiderationsData: actionRecord): Promise<void> {
    this.recordAnswer(otherConsiderations.isThereAnythingElseParagraph, otherConsiderationsData.option);
    await performAction('clickRadioButton', {
      question: otherConsiderationsData.question,
      option: otherConsiderationsData.option,
    });
    if (otherConsiderationsData.option === 'Yes') {
      this.recordAnswer(otherConsiderations.giveDetailsHiddenTextLabel, otherConsiderationsData.courtInfo);
      await performAction(
        'inputText',
        otherConsiderations.giveDetailsHiddenTextLabel,
        otherConsiderationsData.courtInfo
      );
    } else {
      this.deleteAnswer(otherConsiderations.giveDetailsHiddenTextLabel);
    }
    await performAction('clickButton', otherConsiderations.saveAndContinueButton);
  }

  private async rentArrearsLR(rentArrearsInfo: actionRecord): Promise<void> {
    await performValidation('text', {
      elementType: 'subHeader',
      text: `Amount the defendant owes in rent arrears given by ${process.env.CLAIMANT_NAME}:`,
    });
    if (rentArrearsInfo?.showRentDocumentLink) {
      await performValidation('text', {
        elementType: 'link',
        text: rentArrears.rentDocumentDynamicLink,
      });
      await performValidation('validatePdfDocument', {
        linkText: rentArrears.rentDocumentDynamicLink,
      });
    }
    const rentArrearsAmount = formatCurrency(rentArrearsInfo.rentArrearsTotal as string);
    await performValidation('text', {
      elementType: 'paragraph',
      text: `${rentArrearsAmount}`,
    });
    this.recordAnswer(rentArrears.doesDefendantOweThisQuestion, rentArrearsInfo.option);
    await performAction('clickRadioButton', {
      question: rentArrears.doesDefendantOweThisQuestion,
      option: rentArrearsInfo.option,
    });
    if (rentArrearsInfo.option === 'No') {
      this.recordAnswer(rentArrears.howMuchDoesDefendantBelieveHiddenTextLabel, rentArrearsInfo.rentAmount);
      await performAction(
        'inputText',
        rentArrears.howMuchDoesDefendantBelieveHiddenTextLabel,
        rentArrearsInfo.rentAmount
      );
    }
    await performAction('clickButton', rentArrears.saveAndContinueButton);
  }

  private async previousPaymentsLR(repaymentsData: actionRecord): Promise<void> {
    const repaymentsMadeQuestion = repaymentsMade.getMainHeader();
    this.recordAnswer(repaymentsMadeQuestion, repaymentsData.repaymentOption);
    await performAction('clickRadioButton', {
      question: repaymentsMadeQuestion,
      option: repaymentsData.repaymentOption,
    });
    if (repaymentsData.repaymentOption === 'Yes') {
      this.recordAnswer(repaymentsMade.giveDetailsHiddenTextLabel, repaymentsData.repaymentInfo);
      await performAction('inputText', repaymentsMade.giveDetailsHiddenTextLabel, repaymentsData.repaymentInfo);
    } else {
      this.deleteAnswer(repaymentsMade.giveDetailsHiddenTextLabel);
    }
    await performAction('clickButton', repaymentsMade.saveAndContinueButton);
  }

  private async repaymentAgreedLR(repaymentsAgreedData: actionRecord): Promise<void> {
    const repaymentsAgreedQuestion = repaymentsAgreed.giveDetailsHiddenTextLabel;
    this.recordAnswer(repaymentsAgreedQuestion, repaymentsAgreedData.repaymentAgreedOption);
    await performAction('clickRadioButton', {
      question: repaymentsAgreedQuestion,
      option: repaymentsAgreedData.repaymentAgreedOption,
    });
    if (repaymentsAgreedData.repaymentAgreedOption === 'Yes') {
      this.recordAnswer(repaymentsAgreed.giveDetailsHiddenTextLabel, repaymentsAgreedData.repaymentAgreedInfo);
      await performAction(
        'inputText',
        repaymentsAgreed.giveDetailsHiddenTextLabel,
        repaymentsAgreedData.repaymentAgreedInfo
      );
    } else {
      this.deleteAnswer(repaymentsAgreed.giveDetailsHiddenTextLabel);
    }
    await performAction('clickButton', repaymentsAgreed.saveAndContinueButton);
  }

  private async selectCounterClaimLR(counterClaimOption: actionRecord): Promise<void> {
    this.recordAnswer(counterClaim.getDoYouWantToMakeACounterclaimQuestion(), counterClaimOption.option);
    await performAction('clickRadioButton', {
      question: counterClaim.getDoYouWantToMakeACounterclaimQuestion(),
      option: counterClaimOption.option,
    });

    await performAction('clickButton', counterClaim.saveAndContinueButton);
  }

  private async selectWhatAreYouClaimingForLR(counterClaimingOption: actionRecord): Promise<void> {
    this.recordAnswer(String(counterClaimingOption.question), counterClaimingOption.option);
    await performAction('clickRadioButton', {
      question: counterClaimWhatAreYouClaimingFor.mainHeader,
      option: counterClaimingOption.option,
    });
    await performAction('clickButton', counterClaimWhatAreYouClaimingFor.saveAndContinueButton);
  }

  private async counterClaimSpecificSumOfMoneyLR(sumOfMoney: actionRecord): Promise<void> {
    this.recordAnswer(String(sumOfMoney.question), sumOfMoney.option);
    await performAction('clickRadioButton', {
      question: sumOfMoney.question,
      option: sumOfMoney.option,
    });

    if (sumOfMoney.option === counterClaimSpecificSumOfMoney.yesRadioOption) {
      this.recordAnswer(counterClaimSpecificSumOfMoney.howMuchIsTheDefendantHiddenQuestion, sumOfMoney.amount);
      await performAction(
        'inputText',
        counterClaimSpecificSumOfMoney.howMuchIsTheDefendantHiddenQuestion,
        sumOfMoney.amount
      );
    } else {
      this.recordAnswer(counterClaimSpecificSumOfMoney.maximumValueOfYourClaimHiddenQuestion, sumOfMoney.amount);
      await performAction(
        'inputText',
        counterClaimSpecificSumOfMoney.maximumValueOfYourClaimHiddenQuestion,
        sumOfMoney.amount
      );
    }

    await performAction('clickButton', counterClaimSpecificSumOfMoney.saveAndContinueButton);
  }

  private async selectCounterClaimFeeLR(counterClaimFeeOption: actionRecord) {
    let counterClaimFeeValue: number | string = 0;
    if (counterClaimFeeOption.typeOfClaim === 'Something else') {
      counterClaimFeeValue = 387;
    } else if (
      counterClaimFeeOption.typeOfClaim === 'A sum of money or compensation' ||
      counterClaimFeeOption.typeOfClaim === 'Both'
    ) {
      if (counterClaimFeeOption.amount === null) {
        throw new Error('Amount is required for this type of claim');
      }
      const amount = Number(counterClaimFeeOption.amount);
      if (amount <= 300) {
        counterClaimFeeValue = 35; // FEE0514
      } else if (amount <= 500) {
        counterClaimFeeValue = 50; // FEE0513
      } else if (amount <= 1000) {
        counterClaimFeeValue = 70; // FEE0512
      } else if (amount <= 1500) {
        counterClaimFeeValue = 80; // FEE0511
      } else if (amount <= 3000) {
        counterClaimFeeValue = 115; // FEE0510
      } else if (amount <= 5000) {
        counterClaimFeeValue = 205; // FEE0509
      } else if (amount <= 10000) {
        counterClaimFeeValue = 455; // FEE0508
      } else if (amount <= 200000) {
        counterClaimFeeValue = Number((amount * 0.05).toFixed(2)); // FEE0507
      } else {
        counterClaimFeeValue = 10000; // FEE0506
      }
    }
    const basedOnInformationParagraph = `Based on the information provided, it will cost the defendant £${counterClaimFeeValue} to make their counterclaim.`;
    await performValidation('text', { elementType: 'paragraph', text: basedOnInformationParagraph });
    this.recordAnswer(counterClaimFee.doesTheDefendantNeedHelpQuestion, counterClaimFeeOption.radioOption);
    await performAction('clickRadioButton', {
      question: counterClaimFee.doesTheDefendantNeedHelpQuestion,
      option: counterClaimFeeOption.radioOption,
    });
    await performAction('clickButton', counterClaimFee.saveAndContinueButton);
  }

  private async selectClaimAgainstWhomLR(claimAgainstWhom: actionRecord): Promise<void> {
    if (Array.isArray(claimAgainstWhom.options)) {
      this.recordAnswer(String(claimAgainstWhom.question), claimAgainstWhom.options);
      for (const option of claimAgainstWhom.options) {
        await performAction('check', {
          question: claimAgainstWhom.question,
          option,
        });
      }
    } else if (claimAgainstWhom.radioOption) {
      this.recordAnswer(String(claimAgainstWhom.question), claimAgainstWhom.options);
      await performAction('check', {
        question: claimAgainstWhom.question,
        option: claimAgainstWhom.radioOption,
      });
    }
    await performAction('clickButton', counterClaimAgainstWhom.saveAndContinueButton);
  }

  private async counterClaimAboutLR(claimAbout: actionRecord): Promise<void> {
    this.recordAnswer(counterClaimAbout.whatIsYourCounterClaimLabelText, claimAbout.counterClaimFor);
    this.recordAnswer(counterClaimAbout.whatAreYourReasonsLabelText, claimAbout.reasonsInput);
    await performAction('inputText', counterClaimAbout.whatIsYourCounterClaimLabelText, claimAbout.counterClaimFor);
    await performAction('inputText', counterClaimAbout.whatAreYourReasonsLabelText, claimAbout.reasonsInput);
    await performAction('clickButton', counterClaimAbout.saveAndContinueButton);
  }

  private async doYouWantToUploadFilesLR(uploadOption: actionRecord): Promise<void> {
    this.recordAnswer(counterclaimDoYouWantToUploadFiles.mainHeader, uploadOption.option);
    await performAction('clickRadioButton', {
      question: counterclaimDoYouWantToUploadFiles.mainHeader,
      option: uploadOption.option,
    });
    await performAction('clickButton', counterclaimDoYouWantToUploadFiles.saveAndContinueButton);
  }

  private async uploadFilesToSupportCounterclaimLR(uploadCounterClaimFiles: actionRecord): Promise<void> {
    const uploadedFiles = Array.isArray(uploadCounterClaimFiles.files)
      ? uploadCounterClaimFiles.files.join(', ')
      : String(uploadCounterClaimFiles.files);
    this.recordAnswer(rtcUploadedDocumentsQuestion, uploadedFiles);
    await performAction('uploadFile', uploadCounterClaimFiles.files);
    await performAction('clickButton', uploadFilesToSupportYourCounterclaim.saveAndContinueButton);
  }

  private async installmentPaymentsLR(installmentData: actionRecord): Promise<void> {
    this.recordAnswer(String(installmentData.question), installmentData.radioOption);
    await performAction('clickRadioButton', {
      question: installmentData.question,
      option: installmentData.radioOption,
    });
    await performAction('clickButton', instalmentPayments.saveAndContinueButton);
  }

  private async selectHowMuchAffordToPayLR(howMuchToPayData: actionRecord): Promise<void> {
    await performAction(
      'inputText',
      howMuchAffordToPay.howMuchCouldDefendantAffordToPayTextLabel,
      howMuchToPayData.affordToPay
    );
    await performAction('clickRadioButton', {
      question: howMuchToPayData.question,
      option: howMuchToPayData.radioOption,
    });
    await performAction('clickButton', howMuchAffordToPay.saveAndContinueButton);
  }

  private async counterClaimOrderOtherThanSumLR(cliamOtherThanSum: actionRecord): Promise<void> {
    await performAction(
      'inputText',
      counterClaimOrderOtherThanSum.whatOrdersAreTheyAskingLabelText,
      cliamOtherThanSum.ordersInput
    );
    await performAction(
      'inputText',
      counterClaimOrderOtherThanSum.whatFactsWouldTheyLikeLabelText,
      cliamOtherThanSum.factsInput
    );
    await performAction('clickButton', counterClaimOrderOtherThanSum.saveAndContinueButton);
  }

  private async counterClaimHaveYouAppliedForHelpWithFeeLR(helpWithFee: actionRecord): Promise<void> {
    this.recordAnswer(counterClaimHaveYouAppliedForHelp.mainHeader, helpWithFee.helpWithFeeOption);
    await performAction('clickRadioButton', {
      question: counterClaimHaveYouAppliedForHelp.mainHeader,
      option: helpWithFee.helpWithFeeOption,
    });

    if (helpWithFee.helpWithFeeOption === 'Yes') {
      this.recordAnswer(
        counterClaimHaveYouAppliedForHelp.enterHelpWithFeeReferenceHiddenTextLabel,
        helpWithFee.feeReference
      );
      await performAction(
        'inputText',
        counterClaimHaveYouAppliedForHelp.enterHelpWithFeeReferenceHiddenTextLabel,
        helpWithFee.feeReference
      );
    }
    await performAction('clickButton', counterClaimHaveYouAppliedForHelp.saveAndContinueButton);
  }

  private async uploadAdditionalDocumentsLR(data: actionRecord): Promise<void> {
    if (data?.files) {
      const uploadedFiles = Array.isArray(data.files) ? data.files.join(', ') : String(data.files);
      this.recordAnswer(rtcUploadedDocumentsQuestion, uploadedFiles);
      await performAction('uploadFile', data.files);
    } else {
      this.recordAnswer(rtcUploadedDocumentsQuestion, rtcNoDocumentsUploadedValue);
    }
    await performAction('clickButton', uploadAdditionalDocuments.saveAndContinueButton);
  }

  private async languageUsedLR(languageScreenData: actionRecord): Promise<void> {
    this.recordAnswer(String(languageScreenData.question), languageScreenData.radioOption);
    await performAction('clickRadioButton', {
      question: languageScreenData.question,
      option: languageScreenData.radioOption,
    });
    await performAction('clickButton', languageUsed.saveAndContinueButton);
  }

  private async selectStatementOfTruthRTCLR(sot: actionRecord): Promise<void> {
    await performValidation('elementToBeVisible', endOfJourneyCYA.contemptOfCourtParagraph);
    await performAction('check', sot.checkBox);
    await performAction('inputText', endOfJourneyCYA.fullNameTextLabel, sot.firstName);
    await performAction('inputText', endOfJourneyCYA.nameOfFirmTextLabel, sot.firmName);
    await performAction('inputText', endOfJourneyCYA.positionOrOfficeHeldTextLabel, sot.position);

    await performAction('clickButton', endOfJourneyCYA.submitButton);
  }

  private async selectUniversalCreditLR(universalCreditDateData: actionRecord): Promise<void> {
    this.recordAnswer(
      haveYouAppliedForUniversalCredit.hasDefendantAppliedParagraph,
      universalCreditDateData.creditRadioOption
    );
    await performAction('clickRadioButton', {
      question: haveYouAppliedForUniversalCredit.hasDefendantAppliedParagraph,
      option: universalCreditDateData.creditRadioOption,
    });
    if (
      universalCreditDateData.creditRadioOption === 'Yes' &&
      universalCreditDateData?.day &&
      universalCreditDateData?.month &&
      universalCreditDateData?.year
    ) {
      this.recordRtcCyaDateFromParts(
        `When did the defendant apply?`,
        universalCreditDateData.day,
        universalCreditDateData.month,
        universalCreditDateData.year
      );
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
