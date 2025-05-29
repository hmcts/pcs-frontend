import { Request } from 'express';

import { type JourneyStore } from './journeyStore.interface';

// Provide typed structure for session
interface TypedSession {
  [key: string]: unknown; // Base session properties
  [caseId: number]: {
    [slug: string]: Record<string, unknown>;
  };
}

export function sessionStoreFor(slug: string): JourneyStore {
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
  };
}
