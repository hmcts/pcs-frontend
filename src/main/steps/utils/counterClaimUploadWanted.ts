import type { Request } from 'express';

export const counterClaimUploadWanted = (req: Request): boolean => {
  return (
    req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses
      ?.counterClaimWantToUploadFiles === 'YES'
  );
};
