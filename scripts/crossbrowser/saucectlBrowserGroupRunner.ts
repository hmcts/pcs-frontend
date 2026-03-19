import { spawnSync } from 'node:child_process';
import * as path from 'path';

import {
  type CrossbrowserBrowserGroup,
  sauceSuites,
} from '../../src/test/ui/crossbrowser/supportedBrowsers';

const root = path.join(__dirname, '../..');

const SAUCE_VM_ENV_KEYS = [
  'TEST_URL',
  'BEARER_TOKEN',
  'PCS_FRONTEND_IDAM_SECRET',
  'IDAM_PCS_USER_PASSWORD',
  'IDAM_PCS_USER_EMAIL',
  'IDAM_WEB_URL',
  'IDAM_TESTING_SUPPORT_URL',
  'S2S_SECRET',
] as const;

/** HMCTS Jenkins: `withSauceConnect('reform_tunnel')` uses `--tunnel-name reformtunnel` (cnp-jenkins-library). */
function resolveSauceTunnelEnv(): { name: string; owner: string } | number {
  const jenkins = Boolean(process.env.BUILD_TAG || process.env.JENKINS_URL);
  let name = process.env.SAUCE_TUNNEL_NAME?.trim();
  let owner = process.env.SAUCE_TUNNEL_OWNER?.trim();
  if (jenkins && (!name || !owner)) {
    name = name || 'reformtunnel';
    owner = owner || process.env.SAUCE_USERNAME?.trim() || '';
  }
  if (!name || !owner) {
    console.error(
      [
        'Set tunnel from your environment (not hardcoded in .sauce/config.yml):',
        "  export SAUCE_TUNNEL_NAME='<tunnel id>'    # same as sc -i / dashboard Tunnel Name",
        "  export SAUCE_TUNNEL_OWNER='<Sauce owner username>'",
        'On HMCTS Jenkins, Sauce Connect is started by Infrastructure; tunnel defaults to reformtunnel + SAUCE_USERNAME.',
      ].join('\n')
    );
    return 1;
  }
  return { name, owner };
}

function runSaucectlSelectSuite(suiteName: string, tunnel: { name: string; owner: string }): number {
  const args = ['exec', '--', 'saucectl', 'run', '--select-suite', suiteName];

  args.push('--tunnel-name', tunnel.name);
  args.push('--tunnel-owner', tunnel.owner);
  args.push('--tunnel-timeout', process.env.SAUCE_TUNNEL_TIMEOUT ?? '3m');

  for (const key of SAUCE_VM_ENV_KEYS) {
    const val = process.env[key];
    if (val !== undefined && val !== '') {
      args.push('-e', `${key}=${val}`);
    }
  }
  const result = spawnSync('yarn', args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  return result.status ?? 1;
}

export function runSauceBrowserGroup(group: CrossbrowserBrowserGroup): number {
  const tunnel = resolveSauceTunnelEnv();
  if (typeof tunnel === 'number') {
    return tunnel;
  }

  let exitCode = 0;
  for (const suite of sauceSuites[group]) {
    const code = runSaucectlSelectSuite(suite, tunnel);
    if (code !== 0) {
      exitCode = code;
    }
  }
  return exitCode;
}
