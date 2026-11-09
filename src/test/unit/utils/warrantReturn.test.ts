import { CcdCaseData } from '@services/ccdCase.interface';
import {
  EvictionOutcome,
  EvictionSuccessfulReturnName,
  EvictionUnsuccessfulReturnName,
  InterimReturnName,
  WarrantReturnType,
  formatClaimants,
  formatDefendants,
  isAdditionalDetailsMandatory,
  isAdditionalDetailsMandatoryEvictionUnsuccessful,
  isAdditionalDetailsMandatoryInterim,
} from '@utils/warrantReturn';

describe('warrantReturn', () => {
  describe('formatDefendants', () => {
    it('should return an empty string when allDefendants is undefined', () => {
      const ccdCase = {} as CcdCaseData;

      expect(formatDefendants(ccdCase)).toBe('');
    });

    it('should format known defendants as a list', () => {
      const ccdCase = {
        allDefendants: [
          {
            value: {
              nameKnown: 'YES',
              firstName: 'John',
              lastName: 'Smith',
            },
          },
          {
            value: {
              nameKnown: 'YES',
              firstName: 'Jane',
              lastName: 'Doe',
            },
          },
        ],
      } as CcdCaseData;

      expect(formatDefendants(ccdCase)).toBe('<ul class="govuk-list"><li>John Smith</li><li>Jane Doe</li></ul>');
    });

    it('should include only "person(s) unknown" when all defendants are unknown', () => {
      const ccdCase = {
        allDefendants: [
          {
            value: {
              nameKnown: 'NO',
            },
          },
          {
            value: {
              nameKnown: 'NO',
            },
          },
        ],
      } as CcdCaseData;

      expect(formatDefendants(ccdCase)).toBe('<ul class="govuk-list"><li>person(s) unknown</li></ul>');
    });

    it('should format known defendants and include a single unknown defendants entry', () => {
      const ccdCase = {
        allDefendants: [
          {
            value: {
              nameKnown: 'YES',
              firstName: 'John',
              lastName: 'Smith',
            },
          },
          {
            value: {
              nameKnown: false,
            },
          },
          {
            value: {
              nameKnown: 'YES',
              firstName: 'Jane',
              lastName: 'Doe',
            },
          },
          {
            value: {
              nameKnown: 'NO',
            },
          },
        ],
      } as unknown as CcdCaseData;

      expect(formatDefendants(ccdCase)).toBe(
        '<ul class="govuk-list"><li>John Smith</li><li>Jane Doe</li><li>person(s) unknown</li></ul>'
      );
    });
  });

  describe('formatClaimants', () => {
    it('should return an empty string when allClaimants is undefined', () => {
      const ccdCase = {} as CcdCaseData;

      expect(formatClaimants(ccdCase)).toBe('');
    });

    it('should format an individual claimant', () => {
      const ccdCase = {
        allClaimants: [
          {
            value: {
              firstName: 'John',
              lastName: 'Smith',
            },
          },
        ],
      } as CcdCaseData;

      expect(formatClaimants(ccdCase)).toBe('<ul class="govuk-list"><li>John Smith</li></ul>');
    });

    it('should format an organisation claimant', () => {
      const ccdCase = {
        allClaimants: [
          {
            value: {
              orgName: 'ABC Housing Association',
            },
          },
        ],
      } as CcdCaseData;

      expect(formatClaimants(ccdCase)).toBe('<ul class="govuk-list"><li>ABC Housing Association</li></ul>');
    });

    it('should format both individual and organisation claimants', () => {
      const ccdCase = {
        allClaimants: [
          {
            value: {
              firstName: 'John',
              lastName: 'Smith',
            },
          },
          {
            value: {
              orgName: 'ABC Housing Association',
            },
          },
          {
            value: {
              firstName: 'Jane',
              lastName: 'Doe',
            },
          },
        ],
      } as CcdCaseData;

      expect(formatClaimants(ccdCase)).toBe(
        '<ul class="govuk-list"><li>John Smith</li><li>ABC Housing Association</li><li>Jane Doe</li></ul>'
      );
    });
  });

  describe('isAdditionalDetailsMandatory', () => {
    const none = {
      returnType: '',
      finalOutcome: '',
      evictionSuccessfulReturnName: '',
      evictionUnsuccessfulReturnName: '',
      interimReturnName: '',
    };

    it.each([
      ['nothing is chosen', none, true],
      ['a final return has no outcome', { ...none, returnType: WarrantReturnType.FINAL }, true],
      [
        'a successful eviction has no return name',
        { ...none, returnType: WarrantReturnType.FINAL, finalOutcome: EvictionOutcome.SUCCESSFUL },
        true,
      ],
      [
        'the eviction was successful',
        {
          ...none,
          returnType: WarrantReturnType.FINAL,
          finalOutcome: EvictionOutcome.SUCCESSFUL,
          evictionSuccessfulReturnName: EvictionSuccessfulReturnName.EVICTION_SUCCESSFUL,
        },
        true,
      ],
      [
        'an unsuccessful eviction has no return name',
        { ...none, returnType: WarrantReturnType.FINAL, finalOutcome: EvictionOutcome.UNSUCCESSFUL },
        true,
      ],
      [
        'an unsuccessful eviction has a return name that needs details',
        {
          ...none,
          returnType: WarrantReturnType.FINAL,
          finalOutcome: EvictionOutcome.UNSUCCESSFUL,
          evictionUnsuccessfulReturnName: EvictionUnsuccessfulReturnName.WARRANT_WITHDRAWN,
        },
        true,
      ],
      [
        'a cancelled eviction has a return name that does not need details',
        {
          ...none,
          returnType: WarrantReturnType.FINAL,
          finalOutcome: EvictionOutcome.CANCELLED,
          evictionUnsuccessfulReturnName: EvictionUnsuccessfulReturnName.WARRANT_EXPIRED,
        },
        false,
      ],
      ['an interim return has no return name', { ...none, returnType: WarrantReturnType.INTERIM }, true],
      [
        'an interim return has a return name that needs details',
        { ...none, returnType: WarrantReturnType.INTERIM, interimReturnName: InterimReturnName.REOPEN_WARRANT },
        true,
      ],
      [
        'an interim return has a return name that does not need details',
        { ...none, returnType: WarrantReturnType.INTERIM, interimReturnName: InterimReturnName.CROWDS_OR_PROTESTS },
        false,
      ],
    ])('when %s, mandatory is %s', (_, choices, expected) => {
      expect(isAdditionalDetailsMandatory(choices)).toBe(expected);
    });
  });

  describe('isAdditionalDetailsMandatoryEvictionUnsuccessful', () => {
    it.each([
      EvictionUnsuccessfulReturnName.WARRANT_WITHDRAWN,
      EvictionUnsuccessfulReturnName.UNABLE_TO_GAIN_ACCESS,
      EvictionUnsuccessfulReturnName.NO_ANIMAL_HANDLER,
      EvictionUnsuccessfulReturnName.NO_REPLY_TO_ADDITIONAL_INFORMATION_REQUEST,
      EvictionUnsuccessfulReturnName.EVICTION_UNSUCCESSFUL_OTHER,
    ])('should return true for %s', returnName => {
      expect(isAdditionalDetailsMandatoryEvictionUnsuccessful(returnName)).toBe(true);
    });

    it.each([
      EvictionUnsuccessfulReturnName.WARRANT_SUSPENDED,
      EvictionUnsuccessfulReturnName.POSSESSION_ORDER_SET_ASIDE,
      EvictionUnsuccessfulReturnName.EVICTION_NOT_CONFIRMED,
      EvictionUnsuccessfulReturnName.NO_LOCKSMITH,
      EvictionUnsuccessfulReturnName.NO_CLAIMANT_OR_AGENT,
      EvictionUnsuccessfulReturnName.WARRANT_EXPIRED,
      EvictionUnsuccessfulReturnName.WARRANT_ISSUED_IN_ERROR,
    ])('should return false for %s', returnName => {
      expect(isAdditionalDetailsMandatoryEvictionUnsuccessful(returnName)).toBe(false);
    });
  });

  describe('isAdditionalDetailsMandatoryInterim', () => {
    it.each([
      InterimReturnName.ADDITIONAL_INFORMATION_REQUEST,
      InterimReturnName.NO_ANIMAL_HANDLER,
      InterimReturnName.SAFEGUARDING_OR_VULNERABILITY_CONCERNS,
      InterimReturnName.OTHER_INTERIM_RETURN,
      InterimReturnName.REOPEN_WARRANT,
    ])('should return true for %s', returnName => {
      expect(isAdditionalDetailsMandatoryInterim(returnName)).toBe(true);
    });

    it.each([
      InterimReturnName.APPLICATION_UNSUCCESSFUL,
      InterimReturnName.NO_POLICE_PRESENCE,
      InterimReturnName.CHILDREN_UNATTENDED,
      InterimReturnName.CROWDS_OR_PROTESTS,
      InterimReturnName.OBSTRUCTION_BY_DEFENDANTS,
      InterimReturnName.DEFENDANT_STATES_IN_BREATHING_SPACE,
      InterimReturnName.CLAIMANT_ADVISED_DEFENDANT_BREATHING_SPACE,
    ])('should return false for %s', returnName => {
      expect(isAdditionalDetailsMandatoryInterim(returnName)).toBe(false);
    });
  });
});
