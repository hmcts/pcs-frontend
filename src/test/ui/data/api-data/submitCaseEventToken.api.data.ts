export const submitCaseEventTokenApiData = {
  createCaseApiInstance: (): Record<string, unknown> => ({
    baseURL: process.env.DATA_STORE_URL_BASE,
    headers: {
      Authorization: `Bearer ${process.env.BEARER_TOKEN}`,
      ServiceAuthorization: `Bearer ${process.env.SERVICE_AUTH_TOKEN}`,
      'Content-Type': 'application/json',
      experimental: 'experimental',
      Accept: '*/*',
    },
  }),

  submitCaseEventTokenApiEndPoint: (): string =>
    `/cases/${process.env.CASE_NUMBER}/event-triggers/resumePossessionClaim`,
};
export const submitCaseTestSupportApiInstance = {
  headerTokens: (): Record<string, unknown> => ({
    baseURL: process.env.PCS_API_URL,
    headers: {
      Authorization: `Bearer ${process.env.BEARER_TOKEN}`,
      ServiceAuthorization: `Bearer ${process.env.SERVICE_AUTH_TOKEN}`,
      'Content-Type': 'application/json',
      experimental: 'experimental',
      Accept: '*/*',
    },
  }),
  submitCaseTestSupportApiEndPoint: (issueAndGenerateAccessCodes = true): string =>
    `/testing-support/england/create-case?issueAndGenerateAccessCodes=${issueAndGenerateAccessCodes}`,
};
