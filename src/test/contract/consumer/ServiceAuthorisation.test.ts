import { PactV4 } from '@pact-foundation/pact';
import axios from 'axios';

const mockProvider = new PactV4({
  consumer: 'pcs_frontend',
  provider: 's2s_auth',
  dir: './pact/pacts',
});

//Disabling this test until DTSPO-34578 is done
describe.skip('Service Authorisation Consumer Pact Test', () => {
  const MICRO_SERVICE_NAME = 'someMicroServiceName';
  const MICRO_SERVICE_TOKEN = 'someMicroServiceToken';

  test('should receive a token when making a request to the lease endpoint', async () => {
    await mockProvider
      .addInteraction()
      .given('microservice with valid credentials')
      .uponReceiving('a request for a token')
      .withRequest('POST', '/lease', builder => {
        builder.headers({ 'Content-Type': 'application/json' });
        builder.jsonBody({
          microservice: MICRO_SERVICE_NAME,
          oneTimePassword: '784467',
        });
      })
      .willRespondWith(200, builder => {
        builder.headers({ 'Content-Type': 'text/plain' });
        builder.body('text/plain', Buffer.from(MICRO_SERVICE_TOKEN));
      })
      .executeTest(async mockserver => {
        const response = await axios.post(`${mockserver.url}/lease`, {
          microservice: MICRO_SERVICE_NAME,
          oneTimePassword: '784467',
        });

        expect(response.status).toBe(200);
        expect(response.data).toBe(MICRO_SERVICE_TOKEN);
      });
  });
});
