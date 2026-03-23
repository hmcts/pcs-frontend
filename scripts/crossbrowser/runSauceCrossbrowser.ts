import { spawnSync } from 'node:child_process';
import * as fs from 'fs';
import * as path from 'path';

import { IdamUtils, ServiceAuthUtils } from '@hmcts/playwright-common';

import { accessTokenApiData, s2STokenApiData } from '../../src/test/ui/data/api-data';
import { user } from '../../src/test/ui/data/user-data';

const root = path.join(__dirname, '../..');

function saucectlInstalled(): boolean {
  const bin = path.join(root, 'node_modules', '.bin', 'saucectl');
  const winCmd = path.join(root, 'node_modules', '.bin', 'saucectl.cmd');
  return fs.existsSync(bin) || fs.existsSync(winCmd);
}

async function ensureS2STokenOnRunnerHost(): Promise<void> {
  if (process.env.SERVICE_AUTH_TOKEN?.trim()) {
    return;
  }
  process.env.S2S_URL = s2STokenApiData.s2sUrl;
  process.env.SERVICE_AUTH_TOKEN = await new ServiceAuthUtils().retrieveToken({
    microservice: s2STokenApiData.microservice,
  });
}

async function ensureBearerTokenOnRunnerHost(): Promise<void> {
  if (process.env.BEARER_TOKEN?.trim()) {
    return;
  }
  process.env.IDAM_WEB_URL = accessTokenApiData.idamUrl;
  process.env.IDAM_TESTING_SUPPORT_URL = accessTokenApiData.idamTestingSupportUrl;
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
      'Set SAUCE_TUNNEL_NAME and SAUCE_TUNNEL_OWNER (same as Sauce Connect). On Jenkins use enableCrossBrowserTest + reform_tunnel.'
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

  if (!saucectlInstalled()) {
    console.error('saucectl not found — run: yarn install');
    return 1;
  }

  try {
    await ensureS2STokenOnRunnerHost();
    await ensureBearerTokenOnRunnerHost();
  } catch (e) {
    console.error(
      'S2S or Idam token fetch failed (PCS_FRONTEND_IDAM_SECRET, IDAM_PCS_USER_PASSWORD, VPN/network as for Full E2E).',
      e
    );
    return 1;
  }

  const args = ['exec', '--', 'saucectl', 'run'];
  args.push('--tunnel-name', tunnel.name);
  args.push('--tunnel-owner', tunnel.owner);
  args.push('--tunnel-timeout', process.env.SAUCE_TUNNEL_TIMEOUT ?? '3m');

  return (
    spawnSync('yarn', args, {
      cwd: root,
      stdio: 'inherit',
      env: process.env,
      shell: process.platform === 'win32',
    }).status ?? 1
  );
}

main()
  .then(code => process.exit(code))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
