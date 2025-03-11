import { Pact } from '@pact-foundation/pact';
import axios from 'axios';

const mockProvider = new Pact({
  consumer: 'pcs-frontend',
  provider: 'ProviderApp',
  port: 1234, // Mock server port
  log: './logs',
  dir: './pacts', // Where to store pact files
  logLevel: 'debug',
  pactfileWriteMode: 'overwrite',
});

describe('Pact with ProviderApp', () => {
  beforeAll(async () => {
    await mockProvider.setup();
  });

  afterAll(async () => {
    await mockProvider.finalize();
  });

  it('should request data from provider and receive correct response', async () => {
    // Define the expected interaction
    await mockProvider.addInteraction({
      state: 'provider has data',
      uponReceiving: 'a request for user data',
      withRequest: {
        method: 'GET',
        path: '/user',
      },
      willRespondWith: {
        status: 200,
        body: {
          id: 1,
          name: 'John Doe',
        },
      },
    });

    const response = await axios.get('http://localhost:1234/user');

    expect(response.status).toBe(200);
    expect(response.data.id).toBe(1);
    expect(response.data.name).toBe('John Doe');

    await mockProvider.verify();
  });
});
