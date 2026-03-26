import { createCaseApiData } from '../api-data';
import { submitCaseApiDataWales } from '../api-data/submitCaseWales.api.data';

export const dashboard = {
  get mainHeader() {
    return process.env.WALES_POSTCODE === 'YES'
      ? `${submitCaseApiDataWales.submitCasePayload.propertyAddress.AddressLine1}, ${submitCaseApiDataWales.submitCasePayload.propertyAddress.PostTown}, ${submitCaseApiDataWales.submitCasePayload.propertyAddress.PostCode}`
      : `${createCaseApiData.createCasePayload.propertyAddress.AddressLine1}, ${createCaseApiData.createCasePayload.propertyAddress.PostTown}, ${createCaseApiData.createCasePayload.propertyAddress.PostCode}`;
  },
  caseNumberParagraph: (): string => `Case number: ${process.env.CASE_FID}`,
};
