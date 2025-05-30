import { CcdCase } from '../../types/global';

export const ccdService = {
  async getCase(userId: string): Promise<CcdCase | null> {
    console.log('getCase userId => ', userId);
    // TODO: Implement real CCD lookup logic
    return null;
  },

  async createCase(userId: string): Promise<CcdCase> {
    // TODO: Implement real CCD case creation
    console.log('createCase userId => ', userId);
    return {
      id: 'test',
      data: {
        applicantForename: 'test1',
        applicantSurname: 'test2',
        applicantAddress: {
          AddressLine1: 'test',
          AddressLine2: 'test',
          AddressLine3: 'test',
          PostTown: 'test',
          County: 'test',
          PostCode: 'test',
          Country: 'test',
        }
      },
    };
  }
};
