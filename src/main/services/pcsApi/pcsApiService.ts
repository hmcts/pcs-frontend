import { Logger } from '@hmcts/nodejs-logging';
import axios from 'axios';
import config from 'config';

import type { CourtVenue } from '../../interface/courtVenue.interface';
const logger = Logger.getLogger('pcsApiService');

function getBaseUrl(): string {
  return config.get('api.url');
}

export const getRootGreeting = async (): Promise<string> => {
  const pcsApiURL = getBaseUrl();
  const response = await axios.get(pcsApiURL);
  return response.data;
};

<<<<<<< HEAD
export const getCourtVenues = async (postcode: string, user: { accessToken: string }): Promise<CourtVenue[]> => {
  const url = `${getBaseUrl()}/courts?postcode=${encodeURIComponent(postcode)}`;
  const headersConfig = {
    headers: {
      Authorization: `Bearer ${user.accessToken}`,
    },
  };
  logger.info(`Calling PCS court search with URL: ${url}`);
  const response = await axios.get<CourtVenue[]>(url, headersConfig);
  return response.data;
=======
export const getIdamSystemToken = async (): Promise<string> => {
  const idamUrl = config.get('idam.url');
  const oidcConfig = config.get('oidc') as OIDCConfig;
  const idamBody = new URLSearchParams({
    grant_type: 'password',
    redirect_uri: oidcConfig.redirectUri,
    client_id: oidcConfig.clientId,
    username: config.get('secrets.pcs.idam-system-user-name'),
    password: config.get('secrets.pcs.idam-system-user-password'),
    client_secret: config.get('secrets.pcs.pcs-frontend-idam-secret'),
    scope: oidcConfig.scope,
  });
  const tokenResponse = await axios.post(`${idamUrl}/o/token`, idamBody, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

//   return tokenResponse.data.access_token;
// };

export const getCourtVenues = async (postcode: string): Promise<CourtVenue[]> => {
  const url = `${getBaseUrl()}/courts?postcode=${encodeURIComponent(postcode)}`;
  const headersConfig = {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  };
  logger.info(`Calling PCS court search with URL: ${url}`);
  const response = await axios.get<CourtVenue[]>(url, headersConfig);
  return response.data;
>>>>>>> 51fdcf5 (HDPI-515: update code review)
};
