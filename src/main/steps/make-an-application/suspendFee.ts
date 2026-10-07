import { Logger } from '@modules/logger';
import { FeeType, getFee } from '@services/feeLookupService';

const logger = Logger.getLogger('make-an-application-suspend-fee');

export const SUSPEND_APPLICATION_FEE_FALLBACK = 16;

export const getSuspendApplicationFee = async (): Promise<number> => {
  try {
    return await getFee(FeeType.genAppSuspendFeeFEE0458);
  } catch (err) {
    logger.warn('Using fallback suspend application fee because fee lookup failed', {
      err,
      fallbackFee: SUSPEND_APPLICATION_FEE_FALLBACK,
    });
    return SUSPEND_APPLICATION_FEE_FALLBACK;
  }
};
