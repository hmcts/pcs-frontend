import type { Request } from 'express';

import { clearFormData, getFormData, setFormData } from '../../../../main/modules/steps';
import {
  clearApplicationId,
  getApplicationId,
  setApplicationId,
} from '../../../../main/steps/make-an-application/session';

function createRequest(session: Request['session'], caseReference: string): Request {
  return {
    session,
    params: { caseReference },
    res: {
      locals: {
        step: {
          name: 'choose-an-application',
          journey: 'makeAnApplication',
        },
        validatedCase: {
          id: caseReference,
        },
      },
    },
  } as unknown as Request;
}

describe('make-an-application session data', () => {
  it('keeps form answers and application identifiers separate for two cases', () => {
    const session = {} as Request['session'];
    const caseA = createRequest(session, '1111222233334444');
    const caseB = createRequest(session, '5555666677778888');

    setFormData(caseA, 'choose-an-application', { typeOfApplication: 'ADJOURN' });
    setFormData(caseA, 'what-order-do-you-want-the-court-to-make-and-why', {
      whatOrderWanted: 'Case A only',
    });
    setApplicationId(caseA, 'application-a');

    setFormData(caseB, 'choose-an-application', { typeOfApplication: 'SET_ASIDE' });
    setFormData(caseB, 'what-order-do-you-want-the-court-to-make-and-why', {
      whatOrderWanted: 'Case B only',
    });
    setApplicationId(caseB, 'application-b');

    expect(getFormData(caseA, 'choose-an-application')).toEqual({ typeOfApplication: 'ADJOURN' });
    expect(getFormData(caseA, 'what-order-do-you-want-the-court-to-make-and-why')).toEqual({
      whatOrderWanted: 'Case A only',
    });
    expect(getApplicationId(caseA)).toBe('application-a');

    expect(getFormData(caseB, 'choose-an-application')).toEqual({ typeOfApplication: 'SET_ASIDE' });
    expect(getFormData(caseB, 'what-order-do-you-want-the-court-to-make-and-why')).toEqual({
      whatOrderWanted: 'Case B only',
    });
    expect(getApplicationId(caseB)).toBe('application-b');
  });

  it('does not see answers stored under another journey for the same case', () => {
    const session = {
      formData: { uploadAdditionalDocuments: { '1111222233334444': { 'check-your-answers': { something: true } } } },
    } as unknown as Request['session'];
    const caseA = createRequest(session, '1111222233334444');

    expect(getFormData(caseA, 'check-your-answers')).toEqual({});
  });

  it('clears only the submitted case application journey', () => {
    const session = {} as Request['session'];
    const caseA = createRequest(session, '1111222233334444');
    const caseB = createRequest(session, '5555666677778888');

    setFormData(caseA, 'choose-an-application', { typeOfApplication: 'ADJOURN' });
    setApplicationId(caseA, 'application-a');
    setFormData(caseB, 'choose-an-application', { typeOfApplication: 'SET_ASIDE' });
    setApplicationId(caseB, 'application-b');

    clearFormData(caseA);
    clearApplicationId(caseA);

    expect(getFormData(caseA, 'choose-an-application')).toEqual({});
    expect(getApplicationId(caseA)).toBeUndefined();
    expect(getFormData(caseB, 'choose-an-application')).toEqual({ typeOfApplication: 'SET_ASIDE' });
    expect(getApplicationId(caseB)).toBe('application-b');
  });
});
