import { address } from '../../utils/actions/custom-actions/fetchPINsAndValidateAccessCodeAPI.action';

export const dashboard = {
  mainHeader: `${address}`,
  caseNumberParagraph: (): string => `Case number: ${process.env.CASE_FID}`,
};
