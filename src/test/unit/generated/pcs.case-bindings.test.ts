import { caseBindings } from '../../../main/generated/ccd/PCS';

describe('PCS generated case bindings', () => {
  it('captures the createPossessionClaim runtime contract', () => {
    expect(caseBindings.caseTypeId).toBe('PCS');
    expect(caseBindings.events.createPossessionClaim.fieldNamespace).toBe('claim.create');
    expect(caseBindings.events.createPossessionClaim.fields).toEqual(
      expect.arrayContaining(['feeAmount', 'legislativeCountry', 'propertyAddress'])
    );
    expect(caseBindings.events.createPossessionClaim.pages).toEqual(
      expect.arrayContaining(['enterPropertyAddress', 'startTheService'])
    );
  });

  it('captures the submitDefendantResponse runtime contract with a terse namespace', () => {
    expect(caseBindings.events.submitDefendantResponse.fieldNamespace).toBe('resp.def');
    expect(caseBindings.events.submitDefendantResponse.fields).toEqual(
      expect.arrayContaining(['correspondenceAddress', 'submitDraftAnswers'])
    );
  });
});
