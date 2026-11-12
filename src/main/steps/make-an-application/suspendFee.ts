import { FeeType, getFee } from '@services/feeLookupService';

export const getSuspendApplicationFee = async (): Promise<number> => {
  return getFee(FeeType.genAppSuspendFeeFEE0458);
};
