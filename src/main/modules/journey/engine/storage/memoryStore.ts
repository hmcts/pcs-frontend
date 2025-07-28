import { JourneyStore } from './journeyStore.interface';

export const memoryStore = (slug: string): JourneyStore => {
  const store = new Map<string, { data: Record<string, unknown>; version: number }>();

  return {
    async load(req, caseId) {
      void req;
      const key = `${slug}:${caseId}`;
      const data = store.get(key) || { data: {}, version: 0 };
      return data;
    },
    async save(req, caseId, version, data) {
      void req;
      const key = `${slug}:${caseId}`;
      const existing = store.get(key) || { data: {}, version: 0 };

      const old = existing.data as Record<string, unknown>;
      const merged: Record<string, unknown> = { ...old };

      for (const [stepId, stepPatch] of Object.entries(data)) {
        const previousStepData = (old as Record<string, unknown>)[stepId] as Record<string, unknown> | undefined;

        if (typeof stepPatch === 'object' && stepPatch !== null && !Array.isArray(stepPatch)) {
          merged[stepId] = { ...(previousStepData ?? {}), ...(stepPatch as Record<string, unknown>) };
        } else {
          merged[stepId] = stepPatch;
        }
      }

      store.set(key, { data: merged, version: version + 1 });
      return { data: merged, version: version + 1 };
    },
    async generateReference(req, journeySlug, caseId) {
      void req;
      const prefix = journeySlug === 'possession-claim' ? 'PCR' : 'REF';
      return `${prefix}-${Date.now()}-${caseId}`;
    },
  };
};
