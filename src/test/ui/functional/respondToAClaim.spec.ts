import { test } from '@playwright/test';
import config from 'config';

//import { createCaseApiData, submitCaseApiData } from '../data/api-data';
import { startNow } from '../data/page-data';
import { noticeDateKnown } from '../data/page-data/noticeDateKnown.page.data';
import { noticeDateUnknown } from '../data/page-data/noticeDateUnknown.page.data';
import { noticeDetails } from '../data/page-data/noticeDetails.page.data';
import { initializeExecutor, performAction, performValidation } from '../utils/controller';
import { PageContentValidation } from '../utils/validations/element-validations/pageContent.validation';

const home_url = config.get('e2e.testUrl') as string;

test.beforeEach(async ({ page }) => {
  initializeExecutor(page);
  //await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
  //await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayload });
  //await performAction('fetchPINsAPI');
  await performAction('createUser', 'citizen', ['citizen']);
  //await performAction('validateAccessCodeAPI');
  await performAction('navigateToUrl', home_url);
  await performAction('login');
  await performAction('navigateToUrl', home_url + '/case/1234123412341234/respond-to-claim/start-now');
  await performAction('clickButton', startNow.startNowButton);
});

test.afterEach(async () => {
  PageContentValidation.finaliseTest();
});

test.describe('Respond to a claim @nightly', async () => {
  test('Respond to a claim', async () => {
    await performAction('navigateToUrl', home_url + '/respond-to-claim/start-now');
    await performAction('clickButton', startNow.startNowButton);
  });

  test('Claimant selected No to Have you served notice - Notice details screen not shown ', async () => {
    await performAction('navigateToUrl', home_url + '/respond-to-claim/start-now');
    await performAction('clickButton', startNow.startNowButton);
    //Notice details screen not shown ??progress to rent arrears or non-rent arrears screen if claim is rent / non-rent arrears respectfully
  });

  test('tenancy date details - Select Yes on Notice details screen and claimant provided notice date', async () => {
    //steps to progress to Screen 1 or Screen 2
    //entitled to free legal advice
    await performAction('clickRadioButton', 'yes');
    await performAction('clickButton', 'Save and continue');
    //name
    await performAction('clickRadioButton', 'yes');
    await performAction('clickButton', 'Save and continue');
    //defendant
    await performAction('clickButton', 'Save and continue');
    //address
    await performAction('clickRadioButton', 'yes');
    await performAction('clickButton', 'Save and continue');
    //tenancy
    await performAction('clickButton', 'Save and continue');
    await performValidation('mainHeader', noticeDetails.mainHeader);
    await performValidation('text', {
      'text': noticeDetails.didClaimantGiveYouQuestion,
      'elementType': 'legend'
    });
    await performAction('selectNoticeDetails', 'noticeDetails.yesRadioOption');
    await performValidation('mainHeader', noticeDateKnown.mainHeader);
    await performAction('enterNoticeDateKnown', {
      day: '24',
      month: '2',
      year: '2020'
    });
  });

  test('tenancy date details - Select Yes on Notice details screen and claimant did not provide notice date', async () => {
    await performAction('navigateToUrl', home_url + '/respond-to-claim/start-now');
    await performAction('clickButton', startNow.startNowButton);
    //steps to progress to Screen 1 or Screen 2
    await performValidation('mainHeader', noticeDetails.mainHeader);
    await performValidation('text', {
      'text': noticeDetails.didClaimantGiveYouQuestion,
      'elementType': 'inlineText'
    });
    await performAction('selectNoticeDetails', noticeDetails.yesRadioOption);
    await performAction('mainHeader', noticeDateUnknown.mainHeader);
    await performAction('enterNoticeDateUnknown', {
      day: '24',
      month: '2',
      year: '2020'
    });
    // progress to rent arrears or non-rent arrears screen?????
  });

  test('tenancy date unknown - Select No on Notice details screen ', async () => {
    await performAction('navigateToUrl', home_url + '/respond-to-claim/start-now');
    await performAction('clickButton', startNow.startNowButton);
    //steps to progress to Screen 1 or Screen 2
    await performValidation('mainHeader', noticeDetails.mainHeader);
    await performValidation('text', {
      'text': noticeDetails.didClaimantGiveYouQuestion,
      'elementType': 'inlineText'
    });
    await performAction('selectNoticeDetails', noticeDetails.noRadioOption);
    await performAction('mainHeader', noticeDateUnknown.mainHeader);
    await performAction('enterNoticeDateUnknown', {
      day: '24',
      month: '2',
      year: '2020'
    });
    //progress to rent arrears or non-rent arrears screen if claim is rent / non-rent arrears respectfully
  });



  test('Select Im not sure on Notice date', async () => {
    await performAction('navigateToUrl', home_url + '/respond-to-claim/start-now');
    await performAction('clickButton', startNow.startNowButton);
    //steps to progress to Screen 1 or Screen 2
    await performValidation('mainHeader', noticeDetails.mainHeader);
    await performValidation('text', {
      'text': noticeDetails.didClaimantGiveYouQuestion,
      'elementType': 'inlineText'
    });
    await performAction('selectNoticeDetails', noticeDetails.imNotSureRadioOption);
    await performAction('mainHeader', noticeDateKnown.mainHeader);
    await performAction('enterNoticeDateKnown', {
      day: '24',
      month: '2',
      year: '2020'
    });
    //progress to rent arrears or non-rent arrears screen if claim is rent / non-rent arrears respectfully
  });

});
