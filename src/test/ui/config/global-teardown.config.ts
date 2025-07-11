import { cleanupTempUsers } from '../utils/helpers/idam-helpers/idam.helper';

async function globalTeardownConfig(): Promise<void> {
  await cleanupTempUsers();
}

export default globalTeardownConfig;
