import { AxiosRequestConfig } from 'axios';

export const createCaseEventTokenApiData = {
  createCaseApiInstance: (): AxiosRequestConfig => ({
    baseURL: process.env.DATA_STORE_URL_BASE,
    headers: {
      Authorization: `Bearer ${process.env.BEARER_TOKEN}`,
      ServiceAuthorization: `Bearer ${process.env.SERVICE_AUTH_TOKEN}`,
      'Content-Type': 'application/json',
      experimental: 'experimental',
      Accept: '*/*',
    },
  }),

  createCaseEventTokenApiEndPoint: `/case-types/PCS${
    process.env.PCS_API_CHANGE_ID ? '-' + process.env.PCS_API_CHANGE_ID : ''
  }/event-triggers/createPossessionClaim`,
};
