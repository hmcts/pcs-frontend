// Example usage of generated CCD client for createPossessionClaim.
// This module is for developer reference and is not wired into runtime routes.
// eslint-disable-next-line import/no-named-as-default
import Axios, { AxiosInstance } from 'axios';

import {
  CcdClientConfig,
  CcdTransport,
  CreateClaimData,
  GeneratedCcdClient,
} from '../generated/ccd/PCS';

function createTransport(api: AxiosInstance): CcdTransport {
  return {
    get: async (url, headers) => (await api.get(url, { headers })).data,
    post: async (url, data, headers) => (await api.post(url, data, { headers })).data,
  };
}

function createClient(
  baseUrl: string,
  caseTypeId: string,
  bearerToken: string,
  serviceToken: string
): GeneratedCcdClient {
  const api = Axios.create({
    baseURL: baseUrl,
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      ServiceAuthorization: `Bearer ${serviceToken}`,
      'Content-Type': 'application/json',
      experimental: 'experimental',
      Accept: '*/*',
    },
  });

  const clientConfig: CcdClientConfig = {
    baseUrl,
    caseTypeId,
    getAuthHeaders: () => ({}),
    transport: createTransport(api),
  };

  return new GeneratedCcdClient(clientConfig);
}

export async function createPossessionClaimExample(
  baseUrl: string,
  caseTypeId: string,
  bearerToken: string,
  serviceToken: string
): Promise<void> {
  const client = createClient(baseUrl, caseTypeId, bearerToken, serviceToken);

  // 1) Start event to get token + current event data.
  const flow = await client.events.createPossessionClaim.start();

  // If the event defines an about-to-start callback,  any pre-populated values are returned.
  const startData: CreateClaimData = flow.data;

  // payload is typed
  startData.feeAmount = '£12345';
  startData.propertyAddress = {
    AddressLine1: '2 Second Avenue',
      AddressLine2: '',
      AddressLine3: '',
      PostTown: 'London',
      County: '',
      PostCode: 'W3 7RX',
      Country: 'United Kingdom',
  };

  await flow.submit(startData);
}
