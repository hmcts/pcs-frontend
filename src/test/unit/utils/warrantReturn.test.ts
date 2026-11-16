/**
 * @jest-environment jsdom
 */
import { CcdCaseData } from '@services/ccdCase.interface';
import {
  EvictionOutcome,
  EvictionSuccessfulReturnName,
  EvictionUnsuccessfulReturnName,
  InterimReturnName,
  WarrantReturnType,
  formatClaimants,
  formatDefendants,
  initWarrantReturn,
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
    const empty = {
      returnType: '',
      finalOutcome: '',
      evictionSuccessfulReturnName: '',
      evictionUnsuccessfulReturnName: '',
      interimReturnName: '',
    };

    it.each([
      ['nothing is chosen', empty, true],
      ['a final return has no outcome', { ...empty, returnType: WarrantReturnType.FINAL }, true],
      [
        'a successful eviction with no return name',
        { ...empty, returnType: WarrantReturnType.FINAL, finalOutcome: EvictionOutcome.SUCCESSFUL },
        true,
      ],
      [
        'the eviction was successful',
        {
          ...empty,
          returnType: WarrantReturnType.FINAL,
          finalOutcome: EvictionOutcome.SUCCESSFUL,
          evictionSuccessfulReturnName: EvictionSuccessfulReturnName.EVICTION_SUCCESSFUL,
        },
        true,
      ],
      [
        'an unsuccessful eviction with no return name',
        { ...empty, returnType: WarrantReturnType.FINAL, finalOutcome: EvictionOutcome.UNSUCCESSFUL },
        true,
      ],
      [
        'an unsuccessful eviction with a return name that needs details',
        {
          ...empty,
          returnType: WarrantReturnType.FINAL,
          finalOutcome: EvictionOutcome.UNSUCCESSFUL,
          evictionUnsuccessfulReturnName: EvictionUnsuccessfulReturnName.WARRANT_WITHDRAWN,
        },
        true,
      ],
      [
        'a cancelled eviction with a return name that does not need details',
        {
          ...empty,
          returnType: WarrantReturnType.FINAL,
          finalOutcome: EvictionOutcome.CANCELLED,
          evictionUnsuccessfulReturnName: EvictionUnsuccessfulReturnName.WARRANT_EXPIRED,
        },
        false,
      ],
      ['an interim return with no return name', { ...empty, returnType: WarrantReturnType.INTERIM }, true],
      [
        'an interim return with a return name that needs details',
        { ...empty, returnType: WarrantReturnType.INTERIM, interimReturnName: InterimReturnName.REOPEN_WARRANT },
        true,
      ],
      [
        'an interim return with a return name that does not need details',
        { ...empty, returnType: WarrantReturnType.INTERIM, interimReturnName: InterimReturnName.CROWDS_OR_PROTESTS },
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
      EvictionUnsuccessfulReturnName.WARRANT_ISSUED_IN_ERROR,
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

  describe('initWarrantReturn', () => {
    const HIDDEN = 'govuk-!-display-none';
    const SECTIONS = ['final-outcome-section', 'eviction-successful', 'eviction-unsuccessful-cancelled', 'interim'];
    const DATE_PARTS = ['day', 'month', 'year', 'hour', 'minute'];

    const options = (values: string[], selected = ''): string =>
      ['', ...values]
        .map(value => `<option value="${value}"${value === selected ? ' selected' : ''}></option>`)
        .join('');

    type Selected = Partial<Record<'returnType' | 'finalOutcome' | 'successful' | 'unsuccessful' | 'interim', string>>;

    function renderPage(selected: Selected = {}, dateValue = ''): void {
      document.body.innerHTML = `
        <select id="return-type">${options(Object.values(WarrantReturnType), selected.returnType)}</select>
        <div id="final-outcome-section" class="govuk-checkboxes__conditional ${HIDDEN}">
          <select id="final-outcome">${options(Object.values(EvictionOutcome), selected.finalOutcome)}</select>
          <div id="eviction-successful" class="govuk-checkboxes__conditional ${HIDDEN}">
            <select id="eviction-successful-return-name">
              ${options(Object.values(EvictionSuccessfulReturnName), selected.successful)}
            </select>
            ${DATE_PARTS.map(part => `<input id="eviction-date-${part}" value="${dateValue}">`).join('')}
          </div>
          <div id="eviction-unsuccessful-cancelled" class="govuk-checkboxes__conditional ${HIDDEN}">
            <select id="eviction-unsuccessful-return-name">
              ${options(Object.values(EvictionUnsuccessfulReturnName), selected.unsuccessful)}
            </select>
          </div>
        </div>
        <div id="interim" class="govuk-checkboxes__conditional ${HIDDEN}">
          <select id="interim-return-name">${options(Object.values(InterimReturnName), selected.interim)}</select>
        </div>
        <label id="additional-details-label">Additional details</label>
      `;
    }

    const select = (id: string): HTMLSelectElement => document.querySelector<HTMLSelectElement>(`select#${id}`)!;

    function choose(id: string, value: string): void {
      select(id).value = value;
      select(id).dispatchEvent(new Event('change'));
    }

    const visibleSections = (): string[] =>
      SECTIONS.filter(id => !document.getElementById(id)!.classList.contains(HIDDEN));

    const label = (): string | null => document.getElementById('additional-details-label')!.textContent;

    const dateValues = (): string[] =>
      DATE_PARTS.map(part => document.querySelector<HTMLInputElement>(`#eviction-date-${part}`)!.value);

    afterEach(() => {
      document.body.innerHTML = '';
    });

    it('does nothing on a page without the return select', () => {
      document.body.innerHTML = '<label id="additional-details-label">Unchanged</label>';

      expect(() => initWarrantReturn()).not.toThrow();
      expect(label()).toBe('Unchanged');
    });

    it('hides every section and shows additional details as mandatory before anything is chosen', () => {
      renderPage();
      initWarrantReturn();

      expect(visibleSections()).toEqual([]);
      expect(label()).toBe('Additional details');
    });

    it.each([
      ['a final return', { returnType: WarrantReturnType.FINAL }, ['final-outcome-section']],
      [
        'a successful eviction',
        { returnType: WarrantReturnType.FINAL, finalOutcome: EvictionOutcome.SUCCESSFUL },
        ['final-outcome-section', 'eviction-successful'],
      ],
      [
        'an unsuccessful eviction',
        { returnType: WarrantReturnType.FINAL, finalOutcome: EvictionOutcome.UNSUCCESSFUL },
        ['final-outcome-section', 'eviction-unsuccessful-cancelled'],
      ],
      [
        'a cancelled eviction',
        { returnType: WarrantReturnType.FINAL, finalOutcome: EvictionOutcome.CANCELLED },
        ['final-outcome-section', 'eviction-unsuccessful-cancelled'],
      ],
      ['an interim return', { returnType: WarrantReturnType.INTERIM }, ['interim']],
    ])('shows the sections for %s as it is chosen', (_name, selected: Selected, sections) => {
      renderPage();
      initWarrantReturn();

      choose('return-type', selected.returnType!);
      if (selected.finalOutcome) {
        choose('final-outcome', selected.finalOutcome);
      }

      expect(visibleSections()).toEqual(sections);
    });

    it('shows the sections for answers already on the page when it loads', () => {
      renderPage(
        {
          returnType: WarrantReturnType.FINAL,
          finalOutcome: EvictionOutcome.SUCCESSFUL,
          successful: EvictionSuccessfulReturnName.EVICTION_SUCCESSFUL,
        },
        '1'
      );
      initWarrantReturn();

      expect(visibleSections()).toEqual(['final-outcome-section', 'eviction-successful']);
      expect(select('eviction-successful-return-name').value).toBe(EvictionSuccessfulReturnName.EVICTION_SUCCESSFUL);
      expect(dateValues()).toEqual(['1', '1', '1', '1', '1']);
    });

    it('clears the answers in sections it hides when the return changes', () => {
      renderPage(
        {
          returnType: WarrantReturnType.FINAL,
          finalOutcome: EvictionOutcome.SUCCESSFUL,
          successful: EvictionSuccessfulReturnName.EVICTION_SUCCESSFUL,
        },
        '1'
      );
      initWarrantReturn();

      choose('return-type', WarrantReturnType.INTERIM);

      expect(visibleSections()).toEqual(['interim']);
      expect(select('final-outcome').value).toBe('');
      expect(select('eviction-successful-return-name').value).toBe('');
      expect(dateValues()).toEqual(['1', '1', '1', '1', '1']);
    });

    it('clears the return name when the final outcome changes', () => {
      renderPage(
        {
          returnType: WarrantReturnType.FINAL,
          finalOutcome: EvictionOutcome.SUCCESSFUL,
          successful: EvictionSuccessfulReturnName.EVICTION_SUCCESSFUL,
        },
        '1'
      );
      initWarrantReturn();

      choose('final-outcome', EvictionOutcome.CANCELLED);

      expect(visibleSections()).toEqual(['final-outcome-section', 'eviction-unsuccessful-cancelled']);
      expect(select('eviction-successful-return-name').value).toBe('');
      expect(dateValues()).toEqual(['1', '1', '1', '1', '1']);
    });

    it('clears the interim return name when the return changes to final', () => {
      renderPage({ returnType: WarrantReturnType.INTERIM, interim: InterimReturnName.REOPEN_WARRANT });
      initWarrantReturn();

      choose('return-type', WarrantReturnType.FINAL);

      expect(visibleSections()).toEqual(['final-outcome-section']);
      expect(select('interim-return-name').value).toBe('');
    });

    it('keeps sections hidden and answers clear when the return is unselected', () => {
      renderPage({ returnType: WarrantReturnType.FINAL, finalOutcome: EvictionOutcome.UNSUCCESSFUL });
      initWarrantReturn();

      choose('eviction-unsuccessful-return-name', EvictionUnsuccessfulReturnName.WARRANT_EXPIRED);
      choose('return-type', '');

      expect(visibleSections()).toEqual([]);
      expect(select('final-outcome').value).toBe('');
      expect(select('eviction-unsuccessful-return-name').value).toBe('');
    });

    it.each([
      ['a final return with no outcome', [['return-type', WarrantReturnType.FINAL]], 'Additional details'],
      [
        'a successful eviction',
        [
          ['return-type', WarrantReturnType.FINAL],
          ['final-outcome', EvictionOutcome.SUCCESSFUL],
          ['eviction-successful-return-name', EvictionSuccessfulReturnName.EVICTION_SUCCESSFUL],
        ],
        'Additional details',
      ],
      [
        'an unsuccessful return name that requires additional details',
        [
          ['return-type', WarrantReturnType.FINAL],
          ['final-outcome', EvictionOutcome.UNSUCCESSFUL],
          ['eviction-unsuccessful-return-name', EvictionUnsuccessfulReturnName.WARRANT_WITHDRAWN],
        ],
        'Additional details',
      ],
      [
        'a cancelled return name that does not require additional details',
        [
          ['return-type', WarrantReturnType.FINAL],
          ['final-outcome', EvictionOutcome.CANCELLED],
          ['eviction-unsuccessful-return-name', EvictionUnsuccessfulReturnName.WARRANT_EXPIRED],
        ],
        'Additional details (Optional)',
      ],
      [
        'an interim return name that requires additional details',
        [
          ['return-type', WarrantReturnType.INTERIM],
          ['interim-return-name', InterimReturnName.REOPEN_WARRANT],
        ],
        'Additional details',
      ],
      [
        'an interim return name that does not require additional details',
        [
          ['return-type', WarrantReturnType.INTERIM],
          ['interim-return-name', InterimReturnName.CROWDS_OR_PROTESTS],
        ],
        'Additional details (Optional)',
      ],
    ])('labels additional details for %s', (_name, choices, expected) => {
      renderPage();
      initWarrantReturn();

      for (const [id, value] of choices) {
        choose(id, value);
      }

      expect(label()).toBe(expected);
    });

    it('shows additional details as mandatory again when an optional return name is cleared by a change', () => {
      renderPage();
      initWarrantReturn();

      choose('return-type', WarrantReturnType.INTERIM);
      choose('interim-return-name', InterimReturnName.CROWDS_OR_PROTESTS);
      expect(label()).toBe('Additional details (Optional)');

      choose('return-type', WarrantReturnType.FINAL);
      expect(label()).toBe('Additional details');
    });
  });
});
