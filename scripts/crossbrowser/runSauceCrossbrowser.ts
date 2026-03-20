import { spawnSync } from 'node:child_process';
import * as path from 'path';

import { accessTokenApiData, s2STokenApiData } from '../../src/test/ui/data/api-data';
import { user } from '../../src/test/ui/data/user-data';

const root = path.join(__dirname, '../..');

/**
 * Same S2S lease as global-setup / Full E2E, but runs HERE (Jenkins agent or your machine with VPN).
 * Sauce VMs cannot resolve *.internal — saucectl forwards SERVICE_AUTH_TOKEN via .sauce/config.yml.
 */
async function ensureS2STokenOnRunnerHost(): Promise<void> {
  if (process.env.SERVICE_AUTH_TOKEN?.trim()) {
    console.log('SERVICE_AUTH_TOKEN already set; not fetching S2S again.');
    return;
  }
  const { ServiceAuthUtils } = await import('@hmcts/playwright-common');
  process.env.S2S_URL = s2STokenApiData.s2sUrl;
  process.env.SERVICE_AUTH_TOKEN = await new ServiceAuthUtils().retrieveToken({
    microservice: s2STokenApiData.microservice,
  });
}

/**
 * Same Idam password grant as global-setup / Full E2E, on the runner host.
 * Sauce VMs often fail DNS/outbound to idam-api from Node — forward BEARER_TOKEN via .sauce/config.yml.
 */
async function ensureBearerTokenOnRunnerHost(): Promise<void> {
  if (process.env.BEARER_TOKEN?.trim()) {
    console.log('BEARER_TOKEN already set; not fetching Idam again.');
    return;
  }
  // IdamUtils requires these (same order as global-setup getAccessToken).
  process.env.IDAM_WEB_URL = accessTokenApiData.idamUrl;
  process.env.IDAM_TESTING_SUPPORT_URL = accessTokenApiData.idamTestingSupportUrl;
  const { IdamUtils } = await import('@hmcts/playwright-common');
  process.env.BEARER_TOKEN = await new IdamUtils().generateIdamToken({
    username: user.claimantSolicitor.email,
    password: user.claimantSolicitor.password,
    grantType: 'password',
    clientId: 'pcs-frontend',
    clientSecret: process.env.PCS_FRONTEND_IDAM_SECRET as string,
    scope: 'profile openid roles',
  });
}

function resolveTunnel(): { name: string; owner: string } | number {
  const jenkins = Boolean(process.env.BUILD_TAG || process.env.JENKINS_URL);
  let name = process.env.SAUCE_TUNNEL_NAME?.trim();
  let owner = process.env.SAUCE_TUNNEL_OWNER?.trim();
  if (jenkins && (!name || !owner)) {
    name = name || 'reformtunnel';
    owner = owner || process.env.SAUCE_USERNAME?.trim() || '';
  }
  if (!name || !owner) {
    console.error(
      'Set SAUCE_TUNNEL_NAME and SAUCE_TUNNEL_OWNER (same as local `sc -i` / dashboard). On HMCTS Jenkins use enableCrossBrowserTest + reform_tunnel.'
    );
    return 1;
  }
  return { name, owner };
}

async function main(): Promise<number> {
  const tunnel = resolveTunnel();
  if (typeof tunnel === 'number') {
    return tunnel;
  }

  try {
    await ensureS2STokenOnRunnerHost();
    await ensureBearerTokenOnRunnerHost();
  } catch (e) {
    console.error(
      'S2S or Idam token fetch failed on this machine (need PCS_FRONTEND_IDAM_SECRET + IDAM_PCS_USER_PASSWORD + VPN / same network as Full E2E Chrome).',
      e
    );
    return 1;
  }

  const args = ['exec', '--', 'saucectl', 'run'];
  args.push('--tunnel-name', tunnel.name);
  args.push('--tunnel-owner', tunnel.owner);
  args.push('--tunnel-timeout', process.env.SAUCE_TUNNEL_TIMEOUT ?? '3m');

  const result = spawnSync('yarn', args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  return result.status ?? 1;
}

main()
  .then(code => process.exit(code))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
