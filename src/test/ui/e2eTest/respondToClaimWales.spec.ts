import config from 'config';

import { createCaseApiWalesData } from '../data/api-data/createCaseWales.api.data';
import { submitCaseApiDataWales } from '../data/api-data/submitCaseWales.api.data';
import {
  contactPreferenceEmailOrPost,
  contactPreferencesTelephone,
  contactPreferencesTextMessage,
  correspondenceAddress,
  counterClaim,
  defendantDateOfBirth,
  defendantNameCapture,
  doAnyOtherAdultsLiveInYourHome,
  doYouHaveAnyDependantChildren,
  doYouHaveAnyOtherDependants,
  freeLegalAdvice,
  installmentPayments,
  landlordLicensed,
  landlordRegistered,
  nonRentArrearsDispute,
  rentArrears,
  repaymentsAgreed,
  repaymentsMade,
  startNow,
  tenancyDateDetails,
  tenancyTypeDetails,
  wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome,
  writtenTerms,
  yourCircumstances,
} from '../data/page-data';
import { RESPOND_TO_CLAIM_WALES_BEFORE_EACH_ENV_KEYS, logTestEnvAfterBeforeEach } from '../utils/common/log-test-env';
import { test } from '../utils/common/test-with-case-role-cleanup';
import { finaliseAllValidations, initializeExecutor, performAction, performValidation } from '../utils/controller';

const home_url = config.get('e2e.testUrl') as string;
let claimantName: string;

test.beforeEach(async ({ page }, testInfo) => {
  initializeExecutor(page);
  process.env.WALES_POSTCODE = 'YES';
  process.env.CLAIMANT_NAME = submitCaseApiDataWales.submitCasePayload.claimantName;
  if (testInfo.title.includes('Secure')) {
    process.env.OCCUPATION_LICENCE_TYPE = 'SECURE_CONTRACT';
  } else if (testInfo.title.includes('Standard')) {
    process.env.OCCUPATION_LICENCE_TYPE = 'STANDARD_CONTRACT';
  }
  submitCaseApiDataWales.submitCasePayload.occupationLicenceTypeWales = process.env.OCCUPATION_LICENCE_TYPE;
  claimantName = process.env.CLAIMANT_NAME;
  await performAction('createCaseAPI', { data: createCaseApiWalesData.createCasePayload });
  if (
    process.env.OCCUPATION_LICENCE_TYPE === 'SECURE_CONTRACT' ||
    process.env.OCCUPATION_LICENCE_TYPE === 'STANDARD_CONTRACT'
  ) {
    await performAction('submitCaseAPI', { data: submitCaseApiDataWales.submitCasePayload });
  } else {
    await performAction('submitCaseAPI', { data: submitCaseApiDataWales.submitCaseRentOtherTenancy });
  }
  logTestEnvAfterBeforeEach(testInfo.title, RESPOND_TO_CLAIM_WALES_BEFORE_EACH_ENV_KEYS);
  await performAction('fetchPINsAPI');
  await performAction('createUser', 'citizen', ['citizen']);
  await performAction('validateAccessCodeAPI');
  await performAction('navigateToUrl', home_url);
  await performAction('login');
  await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/respond-to-claim/start-now`);
  await performAction('clickButton', startNow.startNowButton);
});

test.afterEach(async () => {
  finaliseAllValidations();
});

test.describe('Respond to a claim - e2e Journey @nightly', async () => {
  test('Respond to a claim - Wales - Secure contract - @noDefendants @regression', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameTextInput,
      lName: defendantNameCapture.lastNameTextInput,
    });
    await performAction('enterDateOfBirthDetails', {
      dobDay: defendantDateOfBirth.dayInputText,
      dobMonth: defendantDateOfBirth.monthInputText,
      dobYear: defendantDateOfBirth.yearInputText,
    });
    await performAction('selectCorrespondenceAddressUnKnown', {
      addressLine1: correspondenceAddress.walesAddressLine1TextInput,
      townOrCity: correspondenceAddress.walesTownOrCityTextInput,
      postcode: correspondenceAddress.walesPostcodeTextInput,
    });
    await performAction('selectContactPreferenceEmailOrPost', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byEmailRadioOption,
      emailAddress: contactPreferenceEmailOrPost.emailAddressTextInput,
    });
    await performAction('selectContactByTelephone', {
      radioOption: contactPreferencesTelephone.yesRadioOption,
      phoneNumber: contactPreferencesTelephone.ukPhoneNumberTextInput,
    });
    await performAction('selectContactByTextMessage', contactPreferencesTextMessage.noRadioOption);
    await performAction('disputeClaimInterstitial', submitCaseApiDataWales.submitCasePayload.isClaimantNameCorrect);
    await performAction('selectLandlordRegistered', landlordRegistered.noRadioOption);
    await performAction('selectLandlordLicensed', {
      question: landlordLicensed.isYourLandlordLicensedQuestion,
      radioOption: landlordLicensed.iamNotSureRadioOption,
    });
    await performValidation('mainHeader', writtenTerms.mainHeader);
    await performAction('selectWrittenTerms', {
      question: writtenTerms.hasYourLandlordSentYouWrittenTermsQuestion,
      radioOption: writtenTerms.noRadioOption,
    });
    await performAction('tenancyOrContractTypeDetails', {
      tenancyType: submitCaseApiDataWales.submitCasePayload.occupationLicenceTypeWales,
      tenancyOption: tenancyTypeDetails.noRadioOption,
      tenancyTypeInfo: tenancyTypeDetails.giveCorrectTenancyTypeTextInput,
    });
    await performAction('selectTenancyStartDateKnown', {
      option: tenancyDateDetails.noRadioOption,
      day: '01',
      month: '12',
      year: '2025',
    });
    await performAction('clickRadioButton', rentArrears.yesRadioOption);
    await performAction('clickButton', rentArrears.saveAndContinueButton);
    await performAction('disputingOtherPartsOfTheClaim', {
      disputeOption: nonRentArrearsDispute.noRadioOption,
    });
    await performValidation('mainHeader', counterClaim.mainHeader);
    await performAction('clickButton', counterClaim.saveAndContinueButton);
    await performAction('readPaymentInterstitial');
    await performAction('repaymentsMade', {
      question: repaymentsMade.getmainHeader(claimantName),
      repaymentOption: repaymentsMade.noRadioOption,
    });
    await performAction('repaymentsAgreed', {
      repaymentAgreedOption: repaymentsAgreed.noRadioOption,
    });
    await performAction('installmentPayments', {
      question: installmentPayments.wouldYouLikeToOfferToPayQuestion,
      radioOption: installmentPayments.noRadioOption,
    });
    await performAction('readYourHouseholdAndCircumstances');
    await performAction('doYouHaveAnyDependantChildren', {
      dependantChildrenOption: doYouHaveAnyDependantChildren.noRadioOption,
    });
    await performAction('doYouHaveAnyOtherDependants', {
      otherDependantsOption: doYouHaveAnyOtherDependants.yesRadioOption,
      otherDependantsInfo: doYouHaveAnyOtherDependants.detailsTextInput,
    });
    await performAction('selectIfAnyOtherAdultsLiveInYourHouse', {
      radioOption: doAnyOtherAdultsLiveInYourHome.yesRadioOption,
      details: doAnyOtherAdultsLiveInYourHome.detailsAboutAdultsTextInput,
    });
    await performAction('selectAlternativeAccommodation', {
      radioOption: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.iamNotSureRadioOption,
    });
    await performValidation('mainHeader', yourCircumstances.mainHeader);
  });

  test('Respond to a claim - Wales - Standard contract - @noDefendants @regression', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameTextInput,
      lName: defendantNameCapture.lastNameTextInput,
    });
    await performAction('enterDateOfBirthDetails', {
      dobDay: defendantDateOfBirth.dayInputText,
      dobMonth: defendantDateOfBirth.monthInputText,
      dobYear: defendantDateOfBirth.yearInputText,
    });
    await performAction('selectCorrespondenceAddressUnKnown', {
      addressLine1: correspondenceAddress.walesAddressLine1TextInput,
      townOrCity: correspondenceAddress.walesTownOrCityTextInput,
      postcode: correspondenceAddress.walesPostcodeTextInput,
    });
    await performAction('selectContactPreferenceEmailOrPost', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byEmailRadioOption,
      emailAddress: contactPreferenceEmailOrPost.emailAddressTextInput,
    });
    await performAction('selectContactByTelephone', {
      radioOption: contactPreferencesTelephone.yesRadioOption,
      phoneNumber: contactPreferencesTelephone.ukPhoneNumberTextInput,
    });
    await performAction('selectContactByTextMessage', contactPreferencesTextMessage.noRadioOption);
    await performAction('disputeClaimInterstitial', submitCaseApiDataWales.submitCasePayload.isClaimantNameCorrect);
    await performAction('selectLandlordRegistered', landlordRegistered.noRadioOption);
    await performAction('selectLandlordLicensed', {
      question: landlordLicensed.isYourLandlordLicensedQuestion,
      radioOption: landlordLicensed.iamNotSureRadioOption,
    });
    await performValidation('mainHeader', writtenTerms.mainHeader);
    await performAction('selectWrittenTerms', {
      question: writtenTerms.hasYourLandlordSentYouWrittenTermsQuestion,
      radioOption: writtenTerms.noRadioOption,
    });
    await performAction('tenancyOrContractTypeDetails', {
      tenancyType: submitCaseApiDataWales.submitCasePayload.occupationLicenceTypeWales,
      tenancyOption: tenancyTypeDetails.yesRadioOption,
    });
    await performAction('selectTenancyStartDateKnown', {
      option: tenancyDateDetails.noRadioOption,
      day: '01',
      month: '12',
      year: '2025',
    });
    await performAction('clickRadioButton', rentArrears.yesRadioOption);
    await performAction('clickButton', rentArrears.saveAndContinueButton);
    await performAction('disputingOtherPartsOfTheClaim', {
      disputeOption: nonRentArrearsDispute.noRadioOption,
    });
    await performValidation('mainHeader', counterClaim.mainHeader);
    await performAction('clickButton', counterClaim.saveAndContinueButton);
    await performAction('readPaymentInterstitial');
    await performAction('repaymentsMade', {
      question: repaymentsMade.getmainHeader(claimantName),
      repaymentOption: repaymentsMade.noRadioOption,
    });
    await performAction('repaymentsAgreed', {
      repaymentAgreedOption: repaymentsAgreed.noRadioOption,
    });
    await performAction('installmentPayments', {
      question: installmentPayments.wouldYouLikeToOfferToPayQuestion,
      radioOption: installmentPayments.noRadioOption,
    });
    await performAction('readYourHouseholdAndCircumstances');
    await performAction('doYouHaveAnyDependantChildren', {
      dependantChildrenOption: doYouHaveAnyDependantChildren.noRadioOption,
    });
    await performAction('doYouHaveAnyOtherDependants', {
      otherDependantsOption: doYouHaveAnyOtherDependants.yesRadioOption,
      otherDependantsInfo: doYouHaveAnyOtherDependants.detailsTextInput,
    });
    await performAction('selectIfAnyOtherAdultsLiveInYourHouse', {
      radioOption: doAnyOtherAdultsLiveInYourHome.yesRadioOption,
      details: doAnyOtherAdultsLiveInYourHome.detailsAboutAdultsTextInput,
    });
    await performAction('selectAlternativeAccommodation', {
      radioOption: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.iamNotSureRadioOption,
    });
    await performValidation('mainHeader', yourCircumstances.mainHeader);
  });

  test('Respond to a claim - Wales - Other contract - @noDefendants @regression', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
    await performAction('inputDefendantDetails', {
      fName: defendantNameCapture.firstNameTextInput,
      lName: defendantNameCapture.lastNameTextInput,
    });
    await performAction('enterDateOfBirthDetails', {
      dobDay: defendantDateOfBirth.dayInputText,
      dobMonth: defendantDateOfBirth.monthInputText,
      dobYear: defendantDateOfBirth.yearInputText,
    });
    await performAction('selectCorrespondenceAddressUnKnown', {
      addressLine1: correspondenceAddress.walesAddressLine1TextInput,
      townOrCity: correspondenceAddress.walesTownOrCityTextInput,
      postcode: correspondenceAddress.walesPostcodeTextInput,
    });
    await performAction('selectContactPreferenceEmailOrPost', {
      question: contactPreferenceEmailOrPost.howDoYouWantTOReceiveUpdatesQuestion,
      radioOption: contactPreferenceEmailOrPost.byEmailRadioOption,
      emailAddress: contactPreferenceEmailOrPost.emailAddressTextInput,
    });
    await performAction('selectContactByTelephone', {
      radioOption: contactPreferencesTelephone.yesRadioOption,
      phoneNumber: contactPreferencesTelephone.ukPhoneNumberTextInput,
    });
    await performAction('selectContactByTextMessage', contactPreferencesTextMessage.noRadioOption);
    await performAction(
      'disputeClaimInterstitial',
      submitCaseApiDataWales.submitCaseRentOtherTenancy.isClaimantNameCorrect
    );
    await performAction('selectLandlordRegistered', landlordRegistered.noRadioOption);
    await performAction('selectLandlordLicensed', {
      question: landlordLicensed.isYourLandlordLicensedQuestion,
      radioOption: landlordLicensed.iamNotSureRadioOption,
    });
    await performValidation('mainHeader', writtenTerms.mainHeader);
    await performAction('selectWrittenTerms', {
      question: writtenTerms.hasYourLandlordSentYouWrittenTermsQuestion,
      radioOption: writtenTerms.noRadioOption,
    });
    await performAction('tenancyOrContractTypeDetails', {
      tenancyType: submitCaseApiDataWales.submitCaseRentOtherTenancy.occupationLicenceTypeWales,
      tenancyOption: tenancyTypeDetails.yesRadioOption,
    });
    await performAction('enterTenancyStartDetailsUnKnown');
    // The below step should be enabled after the bug fix - https://tools.hmcts.net/jira/browse/HDPI-6021
    // await performAction('selectNoticeDetails', {
    //   option: confirmationOfNoticeGiven.imNotSureRadioOption,
    // });
    //   await performAction('clickRadioButton', rentArrears.yesRadioOption);
    //   await performAction('clickButton', rentArrears.saveAndContinueButton);
    //   await performValidation('mainHeader', counterClaim.mainHeader);
    //   await performAction('clickButton', counterClaim.saveAndContinueButton);
    //   await performAction('readPaymentInterstitial');
    //   await performAction('repaymentsMade', {
    //     question: repaymentsMade.getmainHeader(claimantName),
    //     repaymentOption: repaymentsMade.noRadioOption,
    //   });
    //   await performAction('repaymentsAgreed', {
    //     repaymentAgreedOption: repaymentsAgreed.noRadioOption,
    //   });
    //   await performAction('installmentPayments', {
    //     question: installmentPayments.wouldYouLikeToOfferToPayQuestion,
    //     radioOption: installmentPayments.noRadioOption,
    //   });
    //   await performAction('readYourHouseholdAndCircumstances');
    //   await performAction('doYouHaveAnyDependantChildren', {
    //     dependantChildrenOption: doYouHaveAnyDependantChildren.noRadioOption,
    //   });
    //   await performAction('doYouHaveAnyOtherDependants', {
    //     otherDependantsOption: doYouHaveAnyOtherDependants.yesRadioOption,
    //     otherDependantsInfo: doYouHaveAnyOtherDependants.detailsTextInput,
    //   });
    //   await performAction('selectIfAnyOtherAdultsLiveInYourHouse', {
    //     radioOption: doAnyOtherAdultsLiveInYourHome.yesRadioOption,
    //     details: doAnyOtherAdultsLiveInYourHome.detailsAboutAdultsTextInput,
    //   });
    //   await performAction('selectAlternativeAccommodation', {
    //     radioOption: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.iamNotSureRadioOption,
    //   });
    //   await performValidation('mainHeader', yourCircumstances.mainHeader);
  });
});
