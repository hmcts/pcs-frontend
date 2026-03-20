import { spawnSync } from 'node:child_process';
import * as path from 'path';

import { s2STokenApiData } from '../../src/test/ui/data/api-data';

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
  } catch (e) {
    console.error('S2S token fetch failed on this machine (need VPN / same network as Full E2E Chrome).', e);
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
