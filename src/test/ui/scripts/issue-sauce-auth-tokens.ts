/**
 * Optional: run on the Jenkins agent or locally before saucectl to obtain S2S + IDAM tokens and pass them into Sauce.
 * Writes `.sauce/sauce-auth-tokens.json` for shell scripts to export into the environment before `yarn test:sauce:nightly`.
 * On Sauce VMs, globalSetup does not call IDAM/S2S — tokens must come from env (this script, vault-injected, or .sauce.yml).
 */
import * as fs from 'fs';
import * as path from 'path';

import { getAccessToken, getS2SToken } from '../config/global-setup.config';

const OUT_RELATIVE = path.join('.sauce', 'sauce-auth-tokens.json');

async function main(): Promise<void> {
  console.log(`[E2E auth] Issuing S2S + IDAM tokens on this machine (run: yarn e2e:issue-sauce-auth-tokens).`);
  if (!process.env.PCS_FRONTEND_IDAM_SECRET?.trim()) {
    console.error(
      '[E2E auth] PCS_FRONTEND_IDAM_SECRET is missing or empty. For Jenkins, ensure vault secrets are passed into the step that runs this script. For local runs, set env or .env.'
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
    throw new Error('issue-sauce-auth-tokens: SERVICE_AUTH_TOKEN or BEARER_TOKEN still missing after issuing tokens');
  }

  const dir = path.join(process.cwd(), '.sauce');
  fs.mkdirSync(dir, { recursive: true });
  const outFile = path.join(process.cwd(), OUT_RELATIVE);
  fs.writeFileSync(outFile, JSON.stringify(payload), 'utf8');
  console.log(`[E2E auth] Wrote ${outFile} for Jenkins/sauce-run to pass into Sauce.`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
