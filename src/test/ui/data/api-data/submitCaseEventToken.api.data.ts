export const submitCaseEventTokenApiData = {
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  createCaseApiInstance: () => ({
    baseURL: process.env.DATA_STORE_URL_BASE,
    headers: {
      Authorization: `Bearer ${process.env.BEARER_TOKEN}`,
      ServiceAuthorization: `Bearer ${process.env.SERVICE_AUTH_TOKEN}`,
      'Content-Type': 'application/json',
      experimental: 'experimental',
      Accept: '*/*',
    },
  }),
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  submitCaseEventTokenApiEndPoint: () => `/cases/${process.env.CASE_NUMBER}/event-triggers/resumePossessionClaim`,
};
