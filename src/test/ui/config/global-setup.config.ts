import fs from 'fs';
import path from 'path';

async function globalSetupConfig(): Promise<void> {
  if (!process.env.CI) {
    clearEmvLocks();
  }
}

const clearEmvLocks = (): void => {
  const lockDir = path.join(process.cwd(), 'test-results', 'pft-locks');
  fs.rmSync(lockDir, { recursive: true, force: true });
};

export default globalSetupConfig;
