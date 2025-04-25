
import { test, expect } from '@playwright/test';
import { PostcodePage } from './pages/PostcodePage';
import { config as testConfig } from '../config';

test.describe('/postcode page tests @PR @nightly', () => {
  let postcodePage: PostcodePage;

  test.beforeEach(async ({ page }) => {
    postcodePage = new PostcodePage(page);
    await postcodePage.goto(`${testConfig.TEST_URL}/postcode`);
  });

  test('should display postcode text box, label and submit button', async () => {
    await postcodePage.verifyPostcodeForm();
  });

  test('should submit postcode and trigger API call', async () => {
    const request = await postcodePage.submitPostcode('W3 7RX');
    expect(request).not.toBeNull();
    expect(request.url()).toContain('/postcode');
  });

  test('Verify Court table headers and values', async () => {
    await postcodePage.submitPostcode('W3 7RX');
    await postcodePage.verifyCourtTable();
  });
  test.afterAll(async () => {

    console.log('Tests complete - cleaning up??.');

  });
});
