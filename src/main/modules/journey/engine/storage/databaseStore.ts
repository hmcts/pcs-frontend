import { JourneyStore } from './journeyStore.interface';

export const databaseStore = (): JourneyStore => {
  return {
    async load() {
      // TODO: Implement database storage
      return { data: {}, version: 0 };
    },
    async save(_req, _caseId, version) {
      // TODO: Implement database storage
      return { data: {}, version: version + 1 };
    },
    async generateReference() {
      // TODO: Implement database storage
      return 'REF-0';
    },
  };
};
