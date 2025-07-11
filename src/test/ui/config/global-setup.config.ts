import { createTempUser } from '../utils/helpers/idam-helpers/idam.helper';

async function globalSetupConfig(): Promise<void> {
  await createTempUser('citizen', ['citizen']);
}
export default globalSetupConfig;
