import { Pact } from '@pact-foundation/pact';
import axios from 'axios';

const mockProvider = new Pact({
  consumer: 'pcs_frontend',
  provider: 's2s_auth',
  port: 5050,
  log: './pact/logs',
  dir: './pact/pacts',
  logLevel: 'info',
});

// temporarily disabled until  DTSPO-27978 is done
describe.skip('Service Authorisation Consumer Pact Test', () => {
  beforeAll(async () => {
    await mockProvider.setup();
  });
  afterAll(async () => {
    await mockProvider.finalize();
  });

  const MICRO_SERVICE_NAME = 'someMicroServiceName';
  const MICRO_SERVICE_TOKEN = 'someMicroServiceToken';

  test('should receive a token when making a request to the lease endpoint', async () => {
    const BASE_URL = mockProvider.mockService.baseUrl;

    await mockProvider.addInteraction({
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

    const response = await axios.post(`${BASE_URL}/lease`, {
      microservice: MICRO_SERVICE_NAME,
      oneTimePassword: '784467',
    });

    expect(response.status).toBe(200);
    expect(response.data).toBe(MICRO_SERVICE_TOKEN);

    await mockProvider.verify();
  });
});
