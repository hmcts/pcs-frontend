import axios from 'axios';
import config from 'config';

import type { CourtVenue } from '../../interface/courtVenue.interface';

function getBaseUrl(): string {
  return config.get('api.url');
}

export const getRootGreeting = async (): Promise<string> => {
  const pcsApiURL = getBaseUrl();
  const response = await axios.get(pcsApiURL);
  return response.data;
};

export const getCourtVenues = async (postcode: string): Promise<CourtVenue[]> => {
  const response = await axios.get(`${getBaseUrl()}/courts?postcode=${encodeURIComponent(postcode)}`);
  return response.data as CourtVenue[];
};
