export const linkSolicitorTokenApiData = {
  linkSolicitorTokenApiInstance: () => ({
    baseURL: process.env.PCS_API_URL,
    headers: {
      Authorization: `Bearer ${process.env.SOLICITOR_ACCESS_TOKEN}`,
      ServiceAuthorization: `Bearer ${process.env.SERVICE_AUTH_TOKEN}`,
      'Content-Type': 'application/json',
      experimental: 'experimental',
      Accept: '*/*',
    },
  }),
  linkSolicitorApiEndPoint: (): string =>
    `/testing-support/link-defendant-solicitor-to-party/${process.env.CASE_NUMBER}/${process.env.Defendant_ID}`,
};
