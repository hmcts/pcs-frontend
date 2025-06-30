import type { CcdCase, CcdFormDataMap } from '../../interfaces/ccdCase.interface';

export function mapCaseDataToFormData(caseData: CcdCase | null): Partial<CcdFormDataMap> {
  if (!caseData?.id || !caseData.data) {
    return {};
  }

  const formData: Partial<CcdFormDataMap> = {};

  const { applicantForename, applicantSurname, propertyAddress } = caseData.data;

  if (applicantForename || applicantSurname) {
    formData['enter-user-details'] = {
      applicantForename: applicantForename || '',
      applicantSurname: applicantSurname || '',
    };
  }

  if (
    propertyAddress &&
    (propertyAddress.AddressLine1 ||
      propertyAddress.AddressLine2 ||
      propertyAddress.AddressLine3 ||
      propertyAddress.PostTown ||
      propertyAddress.County ||
      propertyAddress.PostCode ||
      propertyAddress.Country)
  ) {
    formData['enter-address'] = {
      addressLine1: propertyAddress.AddressLine1 || '',
      addressLine2: propertyAddress.AddressLine2 || '',
      addressLine3: propertyAddress.AddressLine3 || '',
      town: propertyAddress.PostTown || '',
      county: propertyAddress.County || '',
      postcode: propertyAddress.PostCode || '',
      country: propertyAddress.Country || '',
    };
  }

  return formData;
}
