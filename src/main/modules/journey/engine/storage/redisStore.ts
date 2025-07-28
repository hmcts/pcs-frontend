import { type Request } from 'express';
import { type Redis } from 'ioredis';

import { JourneyStore } from './journeyStore.interface';

export const redisStore = (slug: string): JourneyStore => {
  const keyFor = (req: Request, caseId: string): string => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req.session as any)?.user?.uid ?? 'anon';
    return `${slug}:${userId}:${caseId}`;
  };

  const deepMerge = (target: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> => {
    const merged: Record<string, unknown> = { ...target };

    for (const [stepId, stepPatch] of Object.entries(patch)) {
      const previousStepData = merged[stepId] as Record<string, unknown> | undefined;

      if (typeof stepPatch === 'object' && stepPatch !== null && !Array.isArray(stepPatch)) {
        merged[stepId] = { ...(previousStepData ?? {}), ...(stepPatch as Record<string, unknown>) };
      } else {
        merged[stepId] = stepPatch;
      }
    }

    return merged;
  };

  const getClient = (req: Request): Redis | undefined => {
    // Expect the application to attach an already-connected Redis client instance here
    return req.app?.locals?.redisClient as Redis | undefined;
  };

  return {
    async load(req, caseId) {
      const client = getClient(req);
      if (!client) {
        // Graceful fallback when Redis is not available (e.g. unit tests)
        return { data: {}, version: 0 };
      }

      const raw = await client.get(keyFor(req, caseId));
      if (!raw) {
        return { data: {}, version: 0 };
      }

      try {
        const parsed = JSON.parse(raw) as { data: Record<string, unknown>; version: number };
        return parsed;
      } catch {
        // Corrupted data – start afresh
        return { data: {}, version: 0 };
      }
    },

    async save(req, caseId, version, patch) {
      const client = getClient(req);
      if (!client) {
        // Fallback when Redis missing – behave like memory store
        return { data: patch, version: version + 1 };
      }

      const key = keyFor(req, caseId);
      const existingRaw = await client.get(key);
      let existing: { data: Record<string, unknown>; version: number } = { data: {}, version: 0 };
      if (existingRaw) {
        try {
          existing = JSON.parse(existingRaw);
        } catch {
          // ignore parse errors and overwrite
        }
      }

      const mergedData = deepMerge(existing.data, patch);
      const newVersion = version + 1;
      const payload = { data: mergedData, version: newVersion };
      await client.set(key, JSON.stringify(payload));
      return payload;
    },

    async generateReference(_req, journeySlug, caseId) {
      const prefix = journeySlug === 'possession-claim' ? 'PCR' : 'REF';
      return `${prefix}-${caseId}`;
    },
  };
};
