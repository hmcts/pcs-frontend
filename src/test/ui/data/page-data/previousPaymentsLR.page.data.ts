import { getCurrentFormattedDate } from '../../utils/common/date.utils';

export const previousPaymentsLR = {
  getMainHeader: () => {
    return `Has the defendant paid any money to ${process.env.CLAIMANT_NAME} since ${getCurrentFormattedDate()}?`;
  },
  yesRadioOption: `Yes`,
  noRadioOption: `No`,
  giveDetailsHiddenTextLabel: `Give details about how much the defendant paid and when`,
  detailsTextInput: `Paid £1000 last year`,
  saveAndContinueButton: `Save and continue`,
};
