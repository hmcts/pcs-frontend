import path from 'path';

import { Pact } from '@pact-foundation/pact';
import axios from 'axios';

const pact = new Pact({
  consumer: 'pcs_frontend',
  provider: 's2s_auth',
  port: 5050,
  log: path.resolve(process.cwd(), 'pact/logs', 'pact.log'),
  dir: path.resolve(process.cwd(), 'pact/pacts'),
  logLevel: 'info',
});

describe('Service Authorisation Consumer Pact Test', () => {
  const MICRO_SERVICE_NAME = 'someMicroServiceName';
  const MICRO_SERVICE_TOKEN = 'someMicroServiceToken';
  const AUTHORISATION_TOKEN = 'Bearer someAuthorisationToken';

  test('should receive a token when requesting a lease', async () => {
    await pact.addInteraction({
      state: 'microservice with valid credentials',
      uponReceiving: 'a request for a token',
      withRequest: {
        method: 'POST',
        path: '/lease',
        body: { microservice: MICRO_SERVICE_NAME, oneTimePassword: '784467' },
        headers: { 'Content-Type': 'application/json' },
      },
      willRespondWith: {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
        body: MICRO_SERVICE_TOKEN,
      },
    });

    const response = await axios.post('http://localhost:5050/lease', {
      microservice: MICRO_SERVICE_NAME,
      oneTimePassword: '784467',
    });

    expect(response.status).toBe(200);
    expect(response.data).toBe(MICRO_SERVICE_TOKEN);

    await pact.verify();
  });

  test('should validate details with a valid token', async () => {
    await pact.addInteraction({
      state: 'microservice with valid token',
      uponReceiving: 'a request to validate details',
      withRequest: {
        method: 'GET',
        path: '/details',
        headers: { Authorization: AUTHORISATION_TOKEN },
      },
      willRespondWith: {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
        body: MICRO_SERVICE_NAME,
      },
    });

    const response = await axios.get('http://localhost:5050/details', {
      headers: { Authorization: AUTHORISATION_TOKEN },
    });

    expect(response.status).toBe(200);
    expect(response.data).toBe(MICRO_SERVICE_NAME);

    await pact.verify();
  });
});
