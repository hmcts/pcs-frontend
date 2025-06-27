import { JourneyStore } from './journeyStore.interface';

export const databaseStore = (slug: string): JourneyStore => {
  // Prevent ESLint unused-var issues for now until implementation
  void slug;

  return {
    async load(_req, _caseId) {
      // TODO: Implement database storage
      void _req;
      void _caseId;
      return { data: {}, version: 0 };
    },
    async save(_req, _caseId, version, _data) {
      // TODO: Implement database storage
      void _req;
      void _caseId;
      void _data;
      return { data: {}, version: version + 1 };
    },
    async generateReference(_req, journeySlug, caseId) {
      // TODO: Implement database storage
      const prefix = journeySlug === 'possession-claim' ? 'PCR' : 'REF';
      return `${prefix}-${caseId}`;
    },
  };
};
