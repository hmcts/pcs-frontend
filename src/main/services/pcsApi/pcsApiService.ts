import axios from 'axios';
import config from 'config';

import { CourtVenue } from './courtVenue.interface';
import { OIDCConfig } from 'modules/oidc/config.interface';

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

  const tokenResponse = await axios.post(`${idamUrl}/o/token`, idamBody, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  return tokenResponse.data.access_token;
};

export const getCourtVenues = async (postcode: string): Promise<CourtVenue[]> => {
  const pcsApiURL = getBaseUrl();
  const accessToken = getIdamSystemToken();

  const response = await axios.get(`${pcsApiURL}/courts?postCode=${encodeURIComponent(postcode)}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data as CourtVenue[];
};
