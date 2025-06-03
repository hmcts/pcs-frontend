import type { CcdCase } from '../../interfaces/ccdCase.interface';

export function mapCaseDataToFormData(caseData: CcdCase | null): Record<string, any> {
  if (!caseData || !caseData.id || !caseData.data) {
    return {};
  }

  const formData: Record<string, any> = {};

  const { applicantForename, applicantSurname, applicantAddress } = caseData.data;

  if (applicantForename || applicantSurname) {
    formData['enter-user-details'] = {
      applicantForename: applicantForename || '',
      applicantSurname: applicantSurname || '',
    };
  }

  if (
    applicantAddress &&
    (
      applicantAddress.AddressLine1 ||
      applicantAddress.AddressLine2 ||
      applicantAddress.AddressLine3 ||
      applicantAddress.PostTown ||
      applicantAddress.County ||
      applicantAddress.PostCode ||
      applicantAddress.Country
    )
  ) {
    formData['enter-address'] = {
      addressLine1: applicantAddress.AddressLine1 || '',
      addressLine2: applicantAddress.AddressLine2 || '',
      addressLine3: applicantAddress.AddressLine3 || '',
      town: applicantAddress.PostTown || '',
      county: applicantAddress.County || '',
      postcode: applicantAddress.PostCode || '',
      country: applicantAddress.Country || '',
    };
  }

  return formData;
}
