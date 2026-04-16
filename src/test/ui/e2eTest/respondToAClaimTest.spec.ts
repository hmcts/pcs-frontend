import { test } from '@playwright/test';
import config from 'config';

import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import {
  freeLegalAdvice,
  startNow
} from '../data/page-data';
import { RESPOND_TO_CLAIM_BEFORE_EACH_ENV_KEYS, logTestEnvAfterBeforeEach } from '../utils/common/log-test-env';
import { finaliseAllValidations, initializeExecutor, performAction } from '../utils/controller';

const home_url = config.get('e2e.testUrl') as string;
let claimantName: string;

test.beforeEach(async ({ page }, testInfo) => {
  initializeExecutor(page);
  claimantName = submitCaseApiData.submitCasePayload.claimantName;
  process.env.CLAIMANT_NAME = claimantName;
  if (testInfo.title.includes('NoticeServed - No')) {
    process.env.NOTICE_SERVED = 'NO';
  } else {
    process.env.NOTICE_SERVED = 'YES';
  }

  // Notice date provided
  if (testInfo.title.includes('NoticeDateProvided - No')) {
    process.env.NOTICE_DATE_PROVIDED = 'NO';
  } else if (testInfo.title.includes('NoticeDateProvided - Yes')) {
    process.env.NOTICE_DATE_PROVIDED = 'YES';
  }

  // Assign the tenancy type & grounds in the payload
  const tenancyKey = ['Introductory', 'Demoted', 'Assured', 'Secure', 'Flexible'].find(type =>
    testInfo.title.includes(type)
  );

  switch (tenancyKey) {
    case 'Introductory':
      process.env.TENANCY_TYPE = 'INTRODUCTORY_TENANCY';
      process.env.GROUNDS = 'RENT_ARREARS_GROUND10';
      break;

    case 'Demoted':
      process.env.TENANCY_TYPE = 'DEMOTED_TENANCY';
      process.env.GROUNDS = 'RENT_ARREARS';
      break;

    case 'Assured':
      process.env.TENANCY_TYPE = 'ASSURED_TENANCY';
      break;

    case 'Secure':
      process.env.TENANCY_TYPE = 'SECURE_TENANCY';
      break;

    case 'Flexible':
      process.env.TENANCY_TYPE = 'FLEXIBLE_TENANCY';
      break;
  }

  //Check if No or Im not sure is selected on NoticeDetails page - for back link navigation
  if (testInfo.title.includes('NoticeDetails - No') || testInfo.title.includes('NoticeDetails - Im not sure')) {
    process.env.NOTICE_DETAILS_NO_NOTSURE = 'YES';
  }

  // Tenancy start date logic for noDefendantTest and rentNonRent test
  if (testInfo.title.includes('NoticeServed - No') && !testInfo.title.includes('@rentNonRent')) {
    process.env.TENANCY_START_DATE_KNOWN = testInfo.title.includes('noDefendants') ? 'NO' : 'YES';
    process.env.RENT_NON_RENT = 'NO';
  } else {
    process.env.RENT_NON_RENT = 'YES';
  }

  // Check notice date provided for back link navigation
  if (testInfo.title.includes('NoticeDateProvided - No')) {
    process.env.NOTICE_DATE_PROVIDED = 'NO';
  } else if (testInfo.title.includes('NoticeDateProvided - Yes')) {
    process.env.NOTICE_DATE_PROVIDED = 'YES';
  }

  //Check if No or Im not sure is selected on NoticeDetails page - for back link navigation
  if (testInfo.title.includes('NoticeDetails - No') || testInfo.title.includes('NoticeDetails - Im not sure')) {
    process.env.NOTICE_DETAILS_NO_NOTSURE = 'YES';
  } else {
    process.env.NOTICE_DETAILS_NO_NOTSURE = 'NO';
  }

  //Check if No is selected on RepaymentAgreed page(Rent Arrears) - for back link navigation
  if (testInfo.title.includes('RentArrears - Demoted')) {
    process.env.REPAYMENT_AGREED = 'NO';
  }
  //Check if No is selected on Installment Payment page(Rent Arrears) - for back link navigation
  if (testInfo.title.includes('InstallmentPayment - No')) {
    process.env.INSTALLMENT_PAYMENT = 'NO';
  }

  // Tenancy start date logic for noDefendantTest
  if (testInfo.title.includes('NoticeServed - No')) {
    process.env.TENANCY_START_DATE_KNOWN = testInfo.title.includes('noDefendants') ? 'NO' : 'YES';
  }

  if (testInfo.title.includes('@noDefendants')) {
    claimantName = submitCaseApiData.submitCasePayloadNoDefendants.overriddenClaimantName;
    process.env.CLAIMANT_NAME = claimantName;
    process.env.CLAIMANT_NAME_OVERRIDDEN = 'YES';
    process.env.CORRESPONDENCE_ADDRESS = 'UNKNOWN';
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayloadNoDefendants });
  } else if (testInfo.title.includes('@assured')) {
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayloadAssuredTenancy });
  } else if (testInfo.title.includes('@secureFlexible')) {
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayloadSecureFlexibleTenancy });
  } else if (testInfo.title.includes('@other')) {
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayloadOtherTenancy });
  } else if (testInfo.title.includes('@rentNonRent')) {
    process.env.CORRESPONDENCE_ADDRESS = 'KNOWN';
    process.env.TENANCY_START_DATE_KNOWN = 'YES';
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayloadRentNonRent });
  } else {
    process.env.CORRESPONDENCE_ADDRESS = 'KNOWN';
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayload });
  }
  console.log(`Case created with case number: ${process.env.CASE_NUMBER}`);
  logTestEnvAfterBeforeEach(testInfo.title, RESPOND_TO_CLAIM_BEFORE_EACH_ENV_KEYS);
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

//@noDefendants(submitCasePayloadNoDefendants) represents all defendant details unknown pages and non-rent arrears
//All defendant details known pages and Rent-arrears routing is covered in submitCasePayload
//Mix and match of testcases needs to updated in e2etests once complete routing is implemented. ex: (Tendency type HDPI-3316 etc.)
test.describe('Respond to a claim - e2e Journey @nightly', async () => {
  test('Respond to a claim @smoke @noDefendants @regression @accessibility', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
  });

  test('Non-RentArrears - Assured- NoticeServed - Yes and NoticeDateProvided - No - NoticeDetails- Yes - Notice date unknown @assured @regression', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
  });

  test('Non-RentArrears - Secure - NoticeServed - Yes and NoticeDateProvided - Yes - NoticeDetails- Yes - Notice date known @secureFlexible @regression', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.noRadioOption);
  });

  test('Non-RentArrears - Flexible - NoticeServed - Yes NoticeDateProvided - No - NoticeDetails - Im not sure - NonRentArrearsDispute @secureFlexible @regression', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.preferNotToSayRadioOption);
  });

  test('England - Flexible - NonRentArrears - NoticeServed - No NoticeDateProvided - No - NonRentArrearsDispute @secureFlexible @regression', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
  });

  test('RentArrears - Introductory - NoticeServed - Yes and NoticeDateProvided - No - NoticeDetails- Yes - Notice date unknown @regression', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.noRadioOption);
  });

  test('RentArrears - Demoted - NoticeServed - Yes and NoticeDateProvided - Yes - NoticeDetails- Yes - Notice date known - InstallmentPayment - No @regression', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
  });

  test('RentArrears - Demoted - NoticeServed - Yes - NoticeDateProvided - Yes NoticeDetails - No - RentArrearsDispute  @regression @accessibility', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
  });

  test('England - RentArrears - NonRentArrears - NoticeServed - No - RentArrearsDispute @rentNonRent', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
  });
});

test.describe('Respond to a claim - e2e Journey', async () => {
  test('Respond to a claim @noDefendants', async () => {
    await performAction('selectLegalAdvice', freeLegalAdvice.yesRadioOption);
  });
});
