import config from 'config';

import { http } from '@modules/http';

import type { UploadDocumentsSubmitPayload } from './buildUploadDocumentsPayload';

function getCcdBaseUrl(): string {
  return config.get<string>('ccd.url');
}

function getCaseHeaders(accessToken: string) {
  return {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      experimental: true,
      Accept: '*/*',
      'Content-Type': 'application/json',
    },
  };
}

export async function submitUploadAdditionalDocuments(
  accessToken: string,
  caseId: string,
  data: UploadDocumentsSubmitPayload
): Promise<void> {
  const baseUrl = getCcdBaseUrl();

  const startUrl = `${baseUrl}/cases/${caseId}/event-triggers/uploadDocuments`;
  const startResponse = await http.get<{ token: string }>(startUrl, getCaseHeaders(accessToken));
  const eventToken = startResponse.data.token;

  const submitUrl = `${baseUrl}/cases/${caseId}/events`;
  await http.post(
    submitUrl,
    {
      data,
      event: {
        id: 'uploadDocuments',
        summary: 'Citizen uploadDocuments summary',
        description: 'Citizen uploadDocuments description',
      },
      event_token: eventToken,
      ignore_warning: false,
    },
    getCaseHeaders(accessToken)
  );
}