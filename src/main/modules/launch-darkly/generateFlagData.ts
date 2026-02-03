
const sdkKey = process.env.LAUNCHDARKLY_SDK_KEY;
const url = `https://sdk.launchdarkly.com/sdk/latest-all?sdkKey=${sdkKey}`;

import { writeFileSync } from 'node:fs';

const fetchFlagData = async (): Promise<void> => {
  if (!sdkKey) {
    throw new Error('LAUNCHDARKLY_SDK_KEY is not set in environment variables');
  }

  const response = await fetch(url, {
    headers: {
      Authorization: sdkKey,
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch flag data: ${response.statusText}`);
  }
  const data = await response.json();
  writeFileSync('flagdata.json', JSON.stringify(data, null, 2));
};

fetchFlagData().catch(error => {
  // eslint-disable-next-line no-console
  console.error('Error generating flag data:', error);
  process.exit(1);
});
