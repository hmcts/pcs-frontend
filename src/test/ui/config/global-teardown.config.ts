import { updateTestReadme } from '../update-testReadme';

async function globalTeardownConfig(): Promise<void> {
  if (!process.env.CI) {
    await updateTestReadme();
  }
}

export default globalTeardownConfig;
