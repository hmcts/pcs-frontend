import { address } from '../../utils/actions/custom-actions/fetchPINsAndValidateAccessCodeAPI.action';

export const taskList = {
  get mainHeader(): string {
    return `${address}?`;
  },
  backLink: `Back`,
  checkBeforeYouStartHeading: `1. Check before you start`,
  readInformationAboutLink: `Read information about responding and free legal advice`,
  confirmDetailsLink: `Confirm your details and contact preferences`,
};
