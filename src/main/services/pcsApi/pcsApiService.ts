import axios from 'axios';
import config from 'config';

import type { CourtVenue } from '../../interface/courtVenue.interface';

const { Logger } = require('@hmcts/nodejs-logging');
const logger = Logger.getLogger('pcsApiService');

function getBaseUrl(): string {
  return config.get('api.url');
}

export const getRootGreeting = async (): Promise<string> => {
  const pcsApiURL = getBaseUrl();
  const response = await axios.get(pcsApiURL);
  return response.data;
};

export const getCourtVenues = async (postcode: string): Promise<CourtVenue[]> => {
  const url = `${getBaseUrl()}/courts?postcode=${encodeURIComponent(postcode)}`;
  logger.info(`Calling PCS court search with URL: ${url}`);
  const response = await axios.get(url);

  //TODO: remove console.log before merging to master (just for testing purpose)
  // eslint-disable-next-line no-console
  console.log('response => ', response);
  return response.data as CourtVenue[];
};
