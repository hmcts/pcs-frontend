import { mapCaseDataToFormData } from '../../../../main/app/utils/sessionCaseMapper';
import { CcdCase } from '../../../../main/interfaces/ccdCase.interface';

describe('mapCaseDataToFormData', () => {
  it('should return empty object if caseData is null', () => {
    const result = mapCaseDataToFormData(null);
    expect(result).toEqual({});
  });

  it('should return empty object if caseData has no id or data', () => {
    const result = mapCaseDataToFormData({ id: '', data: undefined } as unknown as CcdCase);
    expect(result).toEqual({});
  });

  it('should map applicant details correctly', () => {
    const caseData: CcdCase = {
      id: '1234',
      data: {
        applicantForename: 'John',
        applicantSurname: 'Doe',
      },
    };

    const result = mapCaseDataToFormData(caseData);

    expect(result).toEqual({
      'enter-user-details': {
        applicantForename: 'John',
        applicantSurname: 'Doe',
      },
    });
  });

  it('should map address details correctly', () => {
    const caseData: CcdCase = {
      id: '1234',
      data: {
        propertyAddress: {
          AddressLine1: '123 Street',
          AddressLine2: 'Apt 4',
          AddressLine3: '',
          PostTown: 'Townsville',
          County: 'Countyshire',
          PostCode: 'AB12 3CD',
          Country: 'UK',
        },
      },
    };

    const result = mapCaseDataToFormData(caseData);

    expect(result).toEqual({
      'enter-address': {
        addressLine1: '123 Street',
        addressLine2: 'Apt 4',
        addressLine3: '',
        town: 'Townsville',
        county: 'Countyshire',
        postcode: 'AB12 3CD',
        country: 'UK',
      },
    });
  });

  it('should map both user and address details together', () => {
    const caseData: CcdCase = {
      id: '1234',
      data: {
        applicantForename: 'Alice',
        applicantSurname: 'Smith',
        propertyAddress: {
          AddressLine1: '456 Lane',
          AddressLine2: '',
          AddressLine3: 'Building 7',
          PostTown: 'London',
          County: '',
          PostCode: 'E1 6AN',
          Country: 'UK',
        },
      },
    };

    const result = mapCaseDataToFormData(caseData);

    expect(result).toEqual({
      'enter-user-details': {
        applicantForename: 'Alice',
        applicantSurname: 'Smith',
      },
      'enter-address': {
        addressLine1: '456 Lane',
        addressLine2: '',
        addressLine3: 'Building 7',
        town: 'London',
        county: '',
        postcode: 'E1 6AN',
        country: 'UK',
      },
    });
  });
});
