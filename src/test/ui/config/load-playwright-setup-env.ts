import fs from 'fs';
import path from 'path';

/** Written by the `setup` project (`auth.setup.ts`); applied before UI tests use API helpers. */
const SETUP_ENV_PATH = path.join(__dirname, '../.auth/setup-env.json');

export function loadPlaywrightSetupEnvIntoProcess(): void {
  if (!fs.existsSync(SETUP_ENV_PATH)) {
    return;
  }
  try {
    const raw = fs.readFileSync(SETUP_ENV_PATH, 'utf8');
    const data = JSON.parse(raw) as Record<string, string>;
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        process.env[key] = value;
      }
    }
  } catch {
    return;
  }
}
