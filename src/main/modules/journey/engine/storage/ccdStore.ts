// import { fetchCase, patchCase } from '../../../services/ccd';
import { Request } from 'express';

import { type JourneyStore } from './journeyStore.interface';

export const ccdStore: JourneyStore = {
  async load(req: Request, caseId: number) {
    // const { data, version } = await fetchCase(caseId);
    // return { data, version };
    /* eslint-disable-next-line no-console */
    console.log('Loading case', caseId);

    // TODO: Implement CCD store
    return { data: {}, version: 0 };
  },

  async save(req: Request, caseId: number, version: number, patch: Record<string, unknown>) {
    // merge locally then push
    // const current = (await fetchCase(caseId)).data;
    // return patchCase(caseId, { ...current, ...patch }, version);
    /* eslint-disable-next-line no-console */
    console.log('Saving case', caseId, version, patch);

    // TODO: Implement CCD store
    return { data: {}, version: 0 };
  },
};
