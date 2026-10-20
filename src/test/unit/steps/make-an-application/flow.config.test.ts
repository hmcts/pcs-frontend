import type { Request } from 'express';

import { getNextStep, getPreviousStep } from '../../../../main/modules/steps/flow';
import { setFormData } from '../../../../main/modules/steps/formBuilder/helpers';
import { flowConfig } from '../../../../main/steps/make-an-application/flow.config';

function createReq(): Request {
  return {
    session: {},
    params: {
      caseReference: '1111222233334444',
    },
    res: {
      locals: {
        step: {
          journey: 'makeAnApplication',
        },
        validatedCase: {
          id: '1111222233334444',
        },
      },
    },
  } as unknown as Request;
}

describe('make-an-application flow config', () => {
  it('routes suspend applications through the suspend start page and then help with fees', async () => {
    const req = createReq();
    setFormData(req, 'choose-an-application', { typeOfApplication: 'SUSPEND' });

    await expect(getNextStep(req, 'choose-an-application', flowConfig, {})).resolves.toBe(
      'apply-to-stop-or-delay-the-eviction'
    );
    await expect(getNextStep(req, 'apply-to-stop-or-delay-the-eviction', flowConfig, {})).resolves.toBe(
      'do-you-need-help-paying-the-fee'
    );
  });

  it('skips consent and notice pages for suspend applications when help with fees is not needed', async () => {
    const req = createReq();
    setFormData(req, 'choose-an-application', { typeOfApplication: 'SUSPEND' });
    setFormData(req, 'do-you-need-help-paying-the-fee', { helpWithFeesNeeded: 'no' });

    await expect(getNextStep(req, 'do-you-need-help-paying-the-fee', flowConfig, {})).resolves.toBe(
      'what-order-do-you-want-the-court-to-make-and-why'
    );
  });

  it('skips consent and notice pages for suspend applications after a help with fees reference', async () => {
    const req = createReq();
    setFormData(req, 'choose-an-application', { typeOfApplication: 'SUSPEND' });
    setFormData(req, 'do-you-need-help-paying-the-fee', { helpWithFeesNeeded: 'yes' });
    setFormData(req, 'have-you-already-applied-for-help-with-fees', {
      alreadyAppliedForHwf: 'yes',
      'alreadyAppliedForHwf.hwfReference': 'HWF-123-456',
    });

    await expect(getNextStep(req, 'have-you-already-applied-for-help-with-fees', flowConfig, {})).resolves.toBe(
      'what-order-do-you-want-the-court-to-make-and-why'
    );
  });

  it('keeps consent and notice pages for non-suspend applications', async () => {
    const req = createReq();
    setFormData(req, 'choose-an-application', { typeOfApplication: 'SET_ASIDE' });
    setFormData(req, 'do-you-need-help-paying-the-fee', { helpWithFeesNeeded: 'no' });

    await expect(getNextStep(req, 'do-you-need-help-paying-the-fee', flowConfig, {})).resolves.toBe(
      'have-the-other-parties-agreed-to-this-application'
    );
  });

  it('uses help with fees as the previous visible page for suspend order details', async () => {
    const req = createReq();
    setFormData(req, 'choose-an-application', { typeOfApplication: 'SUSPEND' });
    setFormData(req, 'do-you-need-help-paying-the-fee', { helpWithFeesNeeded: 'no' });

    await expect(
      getPreviousStep(req, 'what-order-do-you-want-the-court-to-make-and-why', flowConfig, {})
    ).resolves.toBe('do-you-need-help-paying-the-fee');
  });
});
