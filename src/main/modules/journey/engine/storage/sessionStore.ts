import { Request } from 'express';

import { type JourneyStore } from './journeyStore.interface';

// Provide typed structure for session
interface TypedSession {
  [key: string]: unknown; // Base session properties
  [caseId: number]: {
    [slug: string]: Record<string, unknown>;
  };
}

export const sessionStore = (slug: string): JourneyStore => {
  return {
    async load(req: Request, caseId: number) {
      // Create structure if needed
      const session = req.session as unknown as TypedSession;

      if (!session[caseId]) {
        session[caseId] = {};
      }

      const data = session[caseId][slug] ?? {};
      return { data, version: 0 };
    },

    async save(req: Request, caseId: number, version: number, patch: Record<string, unknown>) {
      // Create structure if needed
      const session = req.session as unknown as TypedSession;

      if (!session[caseId]) {
        session[caseId] = {};
      }

      const old = session[caseId][slug] ?? {};
      const merged = { ...old, ...patch };
      session[caseId][slug] = merged;

      return { data: merged, version };
    },

    async generateReference(_req: Request, journeySlug: string, caseId: number) {
      const prefix = journeySlug === 'possession-claim' ? 'PCR' : 'REF';
      return `${prefix}-${Date.now()}-${caseId}`;
    },
  };
};
