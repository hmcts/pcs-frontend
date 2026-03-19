import { spawnSync } from 'node:child_process';
import * as path from 'path';

const root = path.join(__dirname, '../..');

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
  const tunnel = resolveTunnel();
  if (typeof tunnel === 'number') {
    return tunnel;
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

process.exit(main());
