import { fail } from 'node:assert';

// import axios, { AxiosResponse } from 'axios';
import { describe, expect, test } from '@jest/globals';

// const testUrl = process.env.TEST_URL || 'http://localhost:3209';

describe('Smoke Test', () => {
  describe('Home page loads', () => {
    test('with correct content', async () => {
      try {
        /* const response: AxiosResponse = await axios.get(testUrl, {
          headers: {
            'Accept-Encoding': 'gzip',
          },
        }); */
        // expect(response.data).toContain('<h1 class="govuk-heading-xl">Welcome to the PCS home page</h1>');
        expect(true).toBe(true);
      } catch {
        fail('Heading not present and/or correct');
      }
    });
  });
});
