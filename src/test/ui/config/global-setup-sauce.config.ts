import fs from 'fs';
import path from 'path';

/**
 * Sauce / `saucectl` only. Jenkins uses `global-setup.config.ts` (full S2S/IDAM there).
 * Tunnel is not reliable during Playwright global setup on Sauce — tokens run in `setup/auth.setup.ts`.
 */
async function globalSetupSauce(): Promise<void> {
  if (!process.env.CI) {
    const lockDir = path.join(process.cwd(), 'test-results', 'pft-locks');
    fs.rmSync(lockDir, { recursive: true, force: true });
  }
}

export default globalSetupSauce;
