import { test as setup } from '@playwright/test';

import { applyPlaywrightServiceUrls, getAccessToken, getS2SToken } from '../config/global-setup.config';
import { uploadTestDocuments } from '../utils/common/uploadDocument.utils';

setup('upload reusable CCD test documents', async () => {
  applyPlaywrightServiceUrls();
  if (!process.env.SERVICE_AUTH_TOKEN) {
    await getS2SToken();
  }
  if (!process.env.BEARER_TOKEN) {
    await getAccessToken();
  }
  await uploadTestDocuments();
});
