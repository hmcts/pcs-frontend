import axios from 'axios';
import config from 'config';

import { OIDCConfig } from '../../modules/oidc/config.interface';

import { CourtVenue } from './courtVenue.interface';

function getBaseUrl(): string {
  return config.get('api.url');
}

export const getRootGreeting = async (): Promise<string> => {
  const pcsApiURL = getBaseUrl();
  const response = await axios.get(pcsApiURL);
  return response.data;
};

export const getIdamSystemToken = async (): Promise<string> => {
  const idamUrl = config.get('idam.url');

  // eslint-disable-next-line no-console
  console.log('idamUrl=> ', idamUrl);

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

  // eslint-disable-next-line no-console
  console.log('idamBody=> ', idamBody);

  const tokenResponse = await axios.post(`${idamUrl}/o/token`, idamBody, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  // eslint-disable-next-line no-console
  console.log('tokenResponse => ', tokenResponse);
  return tokenResponse.data.access_token;
};

export const getCourtVenues = async (postcode: string): Promise<CourtVenue[]> => {
  const pcsApiURL = getBaseUrl();
  const accessToken = await getIdamSystemToken();

  // eslint-disable-next-line no-console
  console.log('accessToken => ', accessToken);

  const response = await axios.get(`${pcsApiURL}/courts?postcode=${encodeURIComponent(postcode)}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  // eslint-disable-next-line no-console
  console.log('response => ', response);

  return response.data as CourtVenue[];
};
