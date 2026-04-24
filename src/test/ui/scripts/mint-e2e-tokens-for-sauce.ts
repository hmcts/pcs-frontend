/**
 * Optional: run locally (e.g. via sauce-run.sh) before saucectl to pre-mint S2S + IDAM and pass tokens into Sauce.
 * Writes `.sauce/minted-tokens.json` for shell scripts to export into the environment before `yarn test:sauce:nightly`.
 * Jenkins can call the same script if you want agent-side mint; otherwise globalSetup mints on Sauce.
 */
import * as fs from 'fs';
import * as path from 'path';

import { getAccessToken, getS2SToken } from '../config/global-setup.config';

async function main(): Promise<void> {
  console.log(
    '[E2E tokens] Minting S2S + IDAM on this machine (Jenkins agent or local shell running mint-e2e-tokens-for-sauce).'
  );
  if (!process.env.PCS_FRONTEND_IDAM_SECRET?.trim()) {
    console.error(
      '[E2E tokens] PCS_FRONTEND_IDAM_SECRET is missing or empty. For Jenkins, ensure vault secrets are passed into the mint step (see Jenkinsfile_nightly withEnv). For local runs, set env or .env.'
    );
  }
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
  const outFile = path.join(dir, 'minted-tokens.json');
  fs.writeFileSync(outFile, JSON.stringify(payload), 'utf8');
  console.log(`[E2E tokens] Wrote ${outFile} for Jenkins/sauce-run to pass into Sauce.`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
