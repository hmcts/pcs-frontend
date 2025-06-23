import { JourneyStore } from './journeyStore.interface';

export const redisStore = (): JourneyStore => {
  return {
    async load() {
      // TODO: Implement Redis storage
      return { data: {}, version: 0 };
    },
    async save(_req, _caseId, version) {
      // TODO: Implement Redis storage
      return { data: {}, version: version + 1 };
    },
    async generateReference() {
      // TODO: Implement Redis storage
      return 'REF-0';
    },
  };
};
