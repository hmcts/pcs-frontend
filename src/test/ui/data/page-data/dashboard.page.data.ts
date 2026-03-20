import { address } from '../../utils/actions/custom-actions/fetchPINsAndValidateAccessCodeAPI.action';
import { createCaseApiData } from '../api-data';

export const dashboard = {
  mainHeader:
    address === ''
      ? `${createCaseApiData.createCasePayload.propertyAddress.AddressLine1}, ${createCaseApiData.createCasePayload.propertyAddress.PostTown}, ${createCaseApiData.createCasePayload.propertyAddress.PostCode}`
      : address,
  caseNumberParagraph: (): string => `Case number: ${process.env.CASE_FID}`,
};
