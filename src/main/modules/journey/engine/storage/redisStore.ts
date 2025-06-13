import { JourneyStore } from './types';

export const redisStore = (slug: string): JourneyStore => {
  return {
    async load(req, caseId) {
      // TODO: Implement Redis storage
      return { data: {}, version: 0 };
    },
    async save(req, caseId, version, data) {
      // TODO: Implement Redis storage
      return { data: {}, version: version + 1 };
    },
    async generateReference(req, slug, caseId) {
      // TODO: Implement Redis storage
      return `REF-${caseId}`;
    }
  };
}; 