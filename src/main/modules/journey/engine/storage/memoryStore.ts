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
      const newData = { ...existing.data, ...data };
      store.set(key, { data: newData, version: version + 1 });
      return { data: newData, version: version + 1 };
    },
    async generateReference(req, journeySlug, caseId) {
      void req;
      const prefix = journeySlug === 'possession-claim' ? 'PCR' : 'REF';
      return `${prefix}-${Date.now()}-${caseId}`;
    },
  };
};
