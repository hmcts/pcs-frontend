/**
 * Run on the Jenkins agent before saucectl (same vault/network as VM E2E).
 * Writes `.sauce/minted-tokens.json`; Jenkinsfile_nightly loads it into `env.*` so saucectl passes tokens into Sauce and auth.setup skips HTTP mint there.
 */
import * as fs from 'fs';
import * as path from 'path';

import { getAccessToken, getS2SToken } from '../config/global-setup.config';

async function main(): Promise<void> {
  await getS2SToken();
  await getAccessToken();

  const payload = {
    SERVICE_AUTH_TOKEN: process.env.SERVICE_AUTH_TOKEN,
    BEARER_TOKEN: process.env.BEARER_TOKEN,
    S2S_URL: process.env.S2S_URL,
    IDAM_WEB_URL: process.env.IDAM_WEB_URL,
    IDAM_TESTING_SUPPORT_URL: process.env.IDAM_TESTING_SUPPORT_URL,
  };

  if (!payload.SERVICE_AUTH_TOKEN?.trim() || !payload.BEARER_TOKEN?.trim()) {
    throw new Error('mint-e2e-tokens-for-sauce: SERVICE_AUTH_TOKEN or BEARER_TOKEN missing after mint');
  }

  const dir = path.join(process.cwd(), '.sauce');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'minted-tokens.json'), JSON.stringify(payload), 'utf8');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
