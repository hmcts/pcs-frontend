import axios from 'axios';
import config from 'config';

import { CourtVenue } from './court-venue.interface';

export class PcsApiClient {
  private readonly pcsApiURL: string;

  constructor() {
    this.pcsApiURL = config.get<string>('api.url');
  }

  async getRootGreeting(): Promise<string> {
    const response = await axios.get(this.pcsApiURL);
    return response.data;
  }

  async getCourtVenues(postcode: string): Promise<CourtVenue[]> {
    const response = await axios.get(`${this.pcsApiURL}/courts?postCode=${encodeURIComponent(postcode)}`);
    return response.data;
  }
}
