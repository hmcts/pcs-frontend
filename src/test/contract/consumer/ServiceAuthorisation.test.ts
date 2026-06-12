import { PactV3 } from '@pact-foundation/pact/src/v3';
import axios from 'axios';

describe('Service Authorisation Consumer Pact Test', () => {
  const MICRO_SERVICE_NAME = 'someMicroServiceName';
  const MICRO_SERVICE_TOKEN = 'someMicroServiceToken';

  test('should receive a token when making a request to the lease endpoint', async () => {
    const mockProvider = new PactV3({
      consumer: 'pcs_frontend',
      provider: 's2s_auth',
      dir: './pact/pacts',
      logLevel: 'info',
    });

    await mockProvider.addInteraction({
      states: [{ description: 'microservice with valid credentials' }],
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

    await mockProvider.executeTest(async mockServer => {
      const response = await axios.post(`${mockServer.url}/lease`, {
        microservice: MICRO_SERVICE_NAME,
        oneTimePassword: '784467',
      });

      expect(response.status).toBe(200);
      expect(response.data).toBe(MICRO_SERVICE_TOKEN);
    });
  });
});
