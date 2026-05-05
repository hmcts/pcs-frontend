jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
}));

import { step } from '../../../../main/steps/respond-to-claim/counter-claim-about';

describe('respond-to-claim counter-claim-about', () => {
  it('is registered as the counter-claim-about step', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((step as any).stepName).toBe('counter-claim-about');
  });

  it('belongs to the respondToClaim journey', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((step as any).journeyFolder).toBe('respondToClaim');
  });

  it('has no form fields', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((step as any).fields).toEqual([]);
  });
});
