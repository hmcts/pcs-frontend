import { JourneyStore } from './journeyStore.interface';

export const memoryStore = (): JourneyStore => {
  const store = new Map<string, { data: Record<string, unknown>; version: number }>();

  return {
    async load(req, caseId) {
      const key = `memory:${caseId}`;
      const data = store.get(key) || { data: {}, version: 0 };
      return data;
    },
    async save(req, caseId, version, data) {
      const key = `memory:${caseId}`;
      const existing = store.get(key) || { data: {}, version: 0 };
      const newData = { ...existing.data, ...data };
      store.set(key, { data: newData, version: version + 1 });
      return { data: newData, version: version + 1 };
    },
    async generateReference(req, journeySlug, caseId) {
      return `REF-${caseId}`;
    },
  };
};
