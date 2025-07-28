import { Request } from 'express';

import { type JourneyStore } from './journeyStore.interface';

// Provide typed structure for session
interface TypedSession {
  [caseId: string]: {
    [slug: string]: Record<string, unknown>;
  };
}

export const sessionStore = (slug: string): JourneyStore => {
  return {
    async load(req: Request, caseId: string) {
      // Create structure if needed
      const session = req.session as unknown as TypedSession;

      if (!session[caseId]) {
        session[caseId] = {};
      }

      const data = session[caseId][slug] ?? {};
      return { data, version: 0 };
    },

    async save(req: Request, caseId: string, version: number, patch: Record<string, unknown>) {
      // Create structure if needed
      const session = req.session as unknown as TypedSession;

      if (!session[caseId]) {
        session[caseId] = {};
      }

      const old = session[caseId][slug] ?? {};
      // Deep-merge at the first level: keep existing step data while updating only the fields provided in the patch.
      const merged: Record<string, unknown> = { ...old };

      for (const [stepId, stepPatch] of Object.entries(patch)) {
        const previousStepData = (old as Record<string, unknown>)[stepId] as Record<string, unknown> | undefined;

        // Only merge objects – if stepPatch is not an object, replace it entirely.
        if (typeof stepPatch === 'object' && stepPatch !== null && !Array.isArray(stepPatch)) {
          merged[stepId] = { ...(previousStepData ?? {}), ...(stepPatch as Record<string, unknown>) };
        } else {
          merged[stepId] = stepPatch;
        }
      }
      session[caseId][slug] = merged;

      return { data: merged, version };
    },

    async generateReference(_req: Request, journeySlug: string, caseId: string) {
      const prefix = journeySlug === 'possession-claim' ? 'PCR' : 'REF';
      return `${prefix}-${Date.now()}-${caseId}`;
    },
  };
};
