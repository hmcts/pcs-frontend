import axios from 'axios';
import config from 'config';

import type { PcqParameters } from './PcqParameters.interface';
import { createSecureToken } from './createSecureToken';

import { Logger } from '@modules/logger';

const logger = Logger.getLogger('pcqLink');

/** Whether the PCQ service answers its health check as UP. The questionnaire is optional, so any failure is a no. */
export async function isPcqHealthy(): Promise<boolean> {
  const healthUrl = `${config.get<string>('pcq.url')}/health`;
  try {
    logger.info(`Checking Pcq health url: ${healthUrl}`);
    const health = await axios.get(healthUrl, { timeout: config.get<number>('pcq.healthTimeoutMs') });
    if (health.data.status !== 'UP') {
      logger.warn('PCQ service is not available, skipping');
      return false;
    }
    return true;
  } catch (err) {
    logger.warn('PCQ health check failed:', err.message);
    return false;
  }
}

/**
 * The URL that hands the citizen to PCQ. `secureToken` contributes token/authTag/iv/salt, and URLSearchParams
 * escapes the base64 padding and '+' characters, which PCQ's query parser reverses, so nothing may be pre-encoded.
 */
export function pcqUrlFor(params: PcqParameters): string {
  const secureToken = createSecureToken(params, config.get<string>('secrets.pcs.pcs-pcq-token-key'));
  const qs = new URLSearchParams({ ...params, ...secureToken }).toString();
  return `${config.get<string>('pcq.url')}${config.get<string>('pcq.path')}?${qs}`;
}
