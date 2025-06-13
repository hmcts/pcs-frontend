import { JourneyStore } from './types';

export const memoryStore = (slug: string): JourneyStore => {
  const store = new Map<string, { data: Record<string, unknown>; version: number }>();

  return {
    async load(req, caseId) {
      const key = `${slug}:${caseId}`;
      const data = store.get(key) || { data: {}, version: 0 };
      return data;
    },
    async save(req, caseId, version, data) {
      const key = `${slug}:${caseId}`;
      const existing = store.get(key) || { data: {}, version: 0 };
      const newData = { ...existing.data, ...data };
      store.set(key, { data: newData, version: version + 1 });
      return { data: newData, version: version + 1 };
    },
    async generateReference(req, slug, caseId) {
      return `REF-${caseId}`;
    }
  };
}; 