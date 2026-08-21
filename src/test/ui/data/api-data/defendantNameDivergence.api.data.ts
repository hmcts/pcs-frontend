import { AxiosRequestConfig } from 'axios';

export const defendantNameDivergenceApiData = {
  defendantNameDivergenceApiInstance: (): AxiosRequestConfig => ({
    baseURL: process.env.PCS_API_URL,
    headers: {
      ServiceAuthorization: `Bearer ${process.env.SERVICE_AUTH_TOKEN}`,
      'Content-Type': 'application/json',
      experimental: 'experimental',
      Accept: '*/*',
    },
  }),
  defendantNameDivergenceApiEndPoint: (): string =>
    `/testing-support/defendant-name-divergence/${process.env.CASE_NUMBER}`,
};
