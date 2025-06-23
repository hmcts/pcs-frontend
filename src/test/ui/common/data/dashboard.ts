/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
export default {
  trialOrHearingScheduled: (deadline: string) => {
    return {
      title: 'Trial or hearing scheduled',
      content: `Your appointment is on ${deadline} at 11:30am in London. You need to pay £76.00 by ${deadline}. View the hearing notice.`,
    };
  },

  responseTimeElapsed: (noOfDays: string) => {
    return {
      title: 'Response time elapsed',
      content: `The ${noOfDays} day response time for the claimant Patricia Person has elapsed.`,
      nextSteps: 'Pay the claim fee',
    };
  },
  tasklist: () => {
    return {
      makeClaim: 'Make a claim / View claim',
      yourSupport: 'Your support (Reasonable adjustments)',
      equity: 'Equality and diversity - PCQs',
      viewInformation: 'View information about the claimant',
    };
  },
  payTheHearingFee: (deadline: string) => {
    return {
      title: 'Pay the hearing fee',
      deadline: `Deadline is 4:00 pm on ${deadline}`,
    };
  },
};
