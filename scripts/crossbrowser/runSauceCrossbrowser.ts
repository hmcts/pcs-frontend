import { spawnSync } from 'node:child_process';
import * as fs from 'fs';
import * as path from 'path';

import { loadSauceEnvFiles } from './loadSauceEnv';

const root = path.join(__dirname, '../..');

function saucectlInstalled(): boolean {
  const bin = path.join(root, 'node_modules', '.bin', 'saucectl');
  const winCmd = path.join(root, 'node_modules', '.bin', 'saucectl.cmd');
  return fs.existsSync(bin) || fs.existsSync(winCmd);
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

function main(): number {
  loadSauceEnvFiles(root);
  const tunnel = resolveTunnel();
  if (typeof tunnel === 'number') {
    return tunnel;
  }

  if (!saucectlInstalled()) {
    console.error(
      'saucectl is not installed. From the repo root run: yarn install\n' +
        '(saucectl is a devDependency; it must be present under node_modules/.bin.)'
    );
    return 1;
  }

  const args = [
    'saucectl',
    'run',
    '--tunnel-name',
    tunnel.name,
    '--tunnel-owner',
    tunnel.owner,
    '--tunnel-timeout',
    process.env.SAUCE_TUNNEL_TIMEOUT ?? '3m',
  ];

  const result = spawnSync('npx', args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  });
  return result.status ?? 1;
}

process.exit(main());
