import { JourneyStore } from './types';

export const databaseStore = (slug: string): JourneyStore => {
  return {
    async load(req, caseId) {
      // TODO: Implement database storage
      return { data: {}, version: 0 };
    },
    async save(req, caseId, version, data) {
      // TODO: Implement database storage
      return { data: {}, version: version + 1 };
    },
    async generateReference(req, slug, caseId) {
      // TODO: Implement database storage
      return `REF-${caseId}`;
    }
  };
}; 