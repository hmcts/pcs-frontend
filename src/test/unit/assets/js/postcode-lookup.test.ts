/**
 * @jest-environment jest-environment-jsdom
 */

import { initPostcodeLookup } from '../../../../main/assets/js/postcode-lookup';
import { initPostcodeSelection } from '../../../../main/assets/js/postcode-select';

const flushPromises = () => new Promise<void>(resolve => setTimeout(resolve, 0));

// Helper to set the global fetch without using `any`
const setFetch = (value: unknown) => {
  Object.defineProperty(globalThis, 'fetch', {
    value,
    writable: true,
    configurable: true,
  });
};

describe('initPostcodeLookup', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
    setFetch(undefined);
    // Reset the global flag
    (global as { postcodeLookupDelegatedBound?: boolean }).postcodeLookupDelegatedBound = false;

    // Mock scrollIntoView for jsdom
    Element.prototype.scrollIntoView = jest.fn();
  });

  const buildComponent = (prefix = 'address') => `
    <div data-address-component data-name-prefix="${prefix}">
      <div id="${prefix}-postcode-form-group" class="govuk-form-group">
        <input id="${prefix}-lookupPostcode" name="${prefix}[lookupPostcode]" />
        <p class="govuk-error-message govuk-!-display-none" id="${prefix}-lookup-postcode-error">
          <span class="govuk-visually-hidden">Error:</span> Enter a postcode
        </p>
      </div>
      <button id="${prefix}-findAddressBtn" type="button">Find</button>
      <div id="${prefix}-selectedAddress-form-group" class="govuk-form-group">
        <div id="${prefix}-addressSelectContainer" hidden>
          <select id="${prefix}-selectedAddress" name="${prefix}[selectedAddress]">
            <option value="">Initial</option>
          </select>
          <p class="govuk-error-message govuk-!-display-none" id="${prefix}-selectedAddress-error">
            <span class="govuk-visually-hidden">Error:</span> Select an address
          </p>
        </div>
      </div>
      <p class="govuk-error-message govuk-!-display-none" id="${prefix}-postcode-error">
        <span class="govuk-visually-hidden">Error:</span> No addresses found
      </p>
      <details id="${prefix}-enterManuallyDetails">
        <summary>Enter manually</summary>
      </details>
      <div id="${prefix}-addressForm" class="govuk-visually-hidden">
        <input id="${prefix}-addressLine1" name="${prefix}[addressLine1]" />
        <input id="${prefix}-addressLine2" name="${prefix}[addressLine2]" />
        <input id="${prefix}-town" name="${prefix}[town]" />
        <input id="${prefix}-county" name="${prefix}[county]" />
        <input id="${prefix}-postcode" name="${prefix}[postcode]" />
      </div>
      <input type="hidden" id="${prefix}-addressesFoundFlag" name="${prefix}[addressesFoundFlag]" value="" />
    </div>
  `;

  const buildErrorSummary = () => `
    <div class="govuk-error-summary" hidden>
      <h2 class="govuk-error-summary__title">There is a problem</h2>
      <div class="govuk-error-summary__body">
        <ul class="govuk-error-summary__list"></ul>
      </div>
    </div>
  `;

  describe('Initialization', () => {
    it('does nothing when no containers present', () => {
      expect(() => initPostcodeLookup()).not.toThrow();
    });

    it('hides error messages on initialization', () => {
      document.body.innerHTML = buildComponent();
      const lookupError = document.getElementById('address-lookup-postcode-error') as HTMLParagraphElement;
      const postcodeError = document.getElementById('address-postcode-error') as HTMLParagraphElement;

      // Make errors visible before init
      lookupError.classList.remove('govuk-!-display-none');
      postcodeError.classList.remove('govuk-!-display-none');

      initPostcodeLookup();

      expect(lookupError.classList.contains('govuk-!-display-none')).toBe(true);
      expect(postcodeError.classList.contains('govuk-!-display-none')).toBe(true);
    });

    it('prevents duplicate event delegation binding', () => {
      document.body.innerHTML = buildComponent('home') + buildComponent('work');

      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      initPostcodeLookup();
      const firstCallCount = addEventListenerSpy.mock.calls.length;

      initPostcodeLookup();
      const secondCallCount = addEventListenerSpy.mock.calls.length;

      expect(secondCallCount).toBe(firstCallCount);
    });
  });

  describe('Postcode lookup - success scenarios', () => {
    it('performs lookup and populates select with results', async () => {
      document.body.innerHTML = buildComponent();

      const addresses = [
        {
          fullAddress: '10 Downing Street, London, SW1A 2AA',
          addressLine1: '10 Downing Street',
          addressLine2: '',
          town: 'London',
          county: 'Greater London',
          postcode: 'SW1A 2AA',
        },
        {
          fullAddress: '11 Downing Street, London, SW1A 2AB',
          addressLine1: '11 Downing Street',
          addressLine2: '',
          town: 'London',
          county: 'Greater London',
          postcode: 'SW1A 2AB',
        },
      ];

      setFetch(
        jest.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ addresses }),
        })
      );

      initPostcodeLookup();

      const input = document.getElementById('address-lookupPostcode') as HTMLInputElement;
      const button = document.getElementById('address-findAddressBtn') as HTMLButtonElement;
      const select = document.getElementById('address-selectedAddress') as HTMLSelectElement;
      const selectContainer = document.getElementById('address-addressSelectContainer') as HTMLDivElement;
      const addressesFoundFlag = document.getElementById('address-addressesFoundFlag') as HTMLInputElement;

      const focusSpy = jest.spyOn(select, 'focus');

      input.value = 'SW1A 2AA';
      button.click();

      await flushPromises();

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('/api/postcode-lookup?postcode=SW1A%202AA');
      expect((global.fetch as jest.Mock).mock.calls[0][1]).toMatchObject({
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      });

      // First option is the summary ("n addresses found") + 2 address options
      expect(select.options).toHaveLength(3);
      expect(select.options[0].textContent).toBe('2 addresses found');
      expect(select.options[1].textContent).toBe('10 Downing Street, London, SW1A 2AA');
      expect(select.options[1].dataset.line1).toBe('10 Downing Street');
      expect(select.hidden).toBe(false);
      expect(selectContainer.hidden).toBe(false);
      expect(focusSpy).toHaveBeenCalled();
      expect(button.disabled).toBe(false);
      expect(addressesFoundFlag.value).toBe('true');
    });

    it('handles single address found (singular text)', async () => {
      document.body.innerHTML = buildComponent();

      const addresses = [
        {
          fullAddress: '10 Downing Street, London, SW1A 2AA',
          addressLine1: '10 Downing Street',
          addressLine2: '',
          town: 'London',
          county: 'Greater London',
          postcode: 'SW1A 2AA',
        },
      ];

      setFetch(
        jest.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ addresses }),
        })
      );

      initPostcodeLookup();

      const input = document.getElementById('address-lookupPostcode') as HTMLInputElement;
      const button = document.getElementById('address-findAddressBtn') as HTMLButtonElement;
      const select = document.getElementById('address-selectedAddress') as HTMLSelectElement;
      const addressesFoundFlag = document.getElementById('address-addressesFoundFlag') as HTMLInputElement;

      input.value = 'SW1A 2AA';
      button.click();
      await flushPromises();

      expect(select.options[0].textContent).toBe('1 address found');
      expect(addressesFoundFlag.value).toBe('true');
    });

    it('keeps "Enter manually" details visible when addresses are found', async () => {
      document.body.innerHTML = buildComponent();

      const addresses = [
        {
          fullAddress: '10 Downing Street, London, SW1A 2AA',
          addressLine1: '10 Downing Street',
          addressLine2: '',
          town: 'London',
          county: 'Greater London',
          postcode: 'SW1A 2AA',
        },
      ];

      setFetch(
        jest.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ addresses }),
        })
      );

      initPostcodeLookup();

      const input = document.getElementById('address-lookupPostcode') as HTMLInputElement;
      const button = document.getElementById('address-findAddressBtn') as HTMLButtonElement;
      const enterManuallyDetails = document.getElementById('address-enterManuallyDetails') as HTMLDetailsElement;

      // Hide details initially
      enterManuallyDetails.style.display = 'none';

      input.value = 'SW1A 2AA';
      button.click();
      await flushPromises();

      expect(enterManuallyDetails.style.display).toBe('');
    });

    it('supports custom namePrefix per component container', async () => {
      document.body.innerHTML = buildComponent('homeAddress');

      setFetch(
        jest.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ addresses: [] }),
        })
      );

      initPostcodeLookup();

      const input = document.getElementById('homeAddress-lookupPostcode') as HTMLInputElement;
      const button = document.getElementById('homeAddress-findAddressBtn') as HTMLButtonElement;
      const select = document.getElementById('homeAddress-selectedAddress') as HTMLSelectElement;
      const selectContainer = document.getElementById('homeAddress-addressSelectContainer') as HTMLDivElement;

      input.value = 'AB1 2CD';
      button.click();
      await flushPromises();

      expect(global.fetch).toHaveBeenCalledWith('/api/postcode-lookup?postcode=AB1%202CD', expect.any(Object));
      expect(select.hidden).toBe(false);
      expect(selectContainer.hidden).toBe(false);
    });
  });

  describe('Postcode lookup - blank field validation', () => {
    it('shows error when postcode field is empty', async () => {
      document.body.innerHTML = buildComponent();
      setFetch(jest.fn());

      initPostcodeLookup();

      const input = document.getElementById('address-lookupPostcode') as HTMLInputElement;
      const button = document.getElementById('address-findAddressBtn') as HTMLButtonElement;
      const lookupError = document.getElementById('address-lookup-postcode-error') as HTMLParagraphElement;
      const postcodeFormGroup = document.getElementById('address-postcode-form-group') as HTMLDivElement;

      input.value = '';
      button.click();

      await flushPromises();

      expect(global.fetch).not.toHaveBeenCalled();
      expect(lookupError.classList.contains('govuk-!-display-none')).toBe(false);
      expect(input.classList.contains('govuk-input--error')).toBe(true);
      expect(postcodeFormGroup.classList.contains('govuk-form-group--error')).toBe(true);
      expect(button.disabled).toBe(false);
    });

    it('shows error when postcode field contains only whitespace', async () => {
      document.body.innerHTML = buildComponent();
      setFetch(jest.fn());

      initPostcodeLookup();

      const input = document.getElementById('address-lookupPostcode') as HTMLInputElement;
      const button = document.getElementById('address-findAddressBtn') as HTMLButtonElement;
      const lookupError = document.getElementById('address-lookup-postcode-error') as HTMLParagraphElement;

      input.value = '   ';
      button.click();

      await flushPromises();

      expect(global.fetch).not.toHaveBeenCalled();
      expect(lookupError.classList.contains('govuk-!-display-none')).toBe(false);
      expect(input.classList.contains('govuk-input--error')).toBe(true);
    });

    it('clears lookup error on input event', () => {
      document.body.innerHTML = buildComponent();

      initPostcodeLookup();

      const input = document.getElementById('address-lookupPostcode') as HTMLInputElement;
      const button = document.getElementById('address-findAddressBtn') as HTMLButtonElement;
      const lookupError = document.getElementById('address-lookup-postcode-error') as HTMLParagraphElement;

      // Trigger blank field error first
      input.value = '';
      button.click();

      expect(input.classList.contains('govuk-input--error')).toBe(true);
      expect(lookupError.classList.contains('govuk-!-display-none')).toBe(false);

      // Now test that input event clears the error
      input.value = 'SW1A';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      expect(input.classList.contains('govuk-input--error')).toBe(false);
      expect(lookupError.classList.contains('govuk-!-display-none')).toBe(true);
    });

    it('hides blank field error before performing lookup', async () => {
      document.body.innerHTML = buildComponent();

      const addresses = [
        {
          fullAddress: '10 Downing Street, London, SW1A 2AA',
          addressLine1: '10 Downing Street',
          addressLine2: '',
          town: 'London',
          county: 'Greater London',
          postcode: 'SW1A 2AA',
        },
      ];

      setFetch(
        jest.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ addresses }),
        })
      );

      initPostcodeLookup();

      const input = document.getElementById('address-lookupPostcode') as HTMLInputElement;
      const button = document.getElementById('address-findAddressBtn') as HTMLButtonElement;
      const lookupError = document.getElementById('address-lookup-postcode-error') as HTMLParagraphElement;
      const postcodeFormGroup = document.getElementById('address-postcode-form-group') as HTMLDivElement;

      // Trigger blank field error first
      input.value = '';
      button.click();
      await flushPromises();

      expect(lookupError.classList.contains('govuk-!-display-none')).toBe(false);
      expect(postcodeFormGroup.classList.contains('govuk-form-group--error')).toBe(true);

      // Now enter a postcode and lookup again (with addresses found)
      input.value = 'SW1A 2AA';
      button.click();
      await flushPromises();

      expect(lookupError.classList.contains('govuk-!-display-none')).toBe(true);
      expect(input.classList.contains('govuk-input--error')).toBe(false);
      expect(postcodeFormGroup.classList.contains('govuk-form-group--error')).toBe(false);
    });
  });

  describe('Postcode lookup - no addresses found', () => {
    it('shows error and empty dropdown when no addresses found', async () => {
      document.body.innerHTML = buildComponent();

      setFetch(
        jest.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ addresses: [] }),
        })
      );

      initPostcodeLookup();

      const input = document.getElementById('address-lookupPostcode') as HTMLInputElement;
      const button = document.getElementById('address-findAddressBtn') as HTMLButtonElement;
      const select = document.getElementById('address-selectedAddress') as HTMLSelectElement;
      const selectContainer = document.getElementById('address-addressSelectContainer') as HTMLDivElement;
      const postcodeError = document.getElementById('address-postcode-error') as HTMLParagraphElement;
      const enterManuallyDetails = document.getElementById('address-enterManuallyDetails') as HTMLDetailsElement;
      const addressesFoundFlag = document.getElementById('address-addressesFoundFlag') as HTMLInputElement;

      input.value = 'SW1A 1AA';
      button.click();

      await flushPromises();

      expect(select.options).toHaveLength(1);
      expect(select.options[0].textContent).toBe('No addresses found');
      expect(select.options[0].disabled).toBe(true);
      expect(select.hidden).toBe(false);
      expect(selectContainer.hidden).toBe(false);
      expect(postcodeError.classList.contains('govuk-!-display-none')).toBe(false);
      expect(input.classList.contains('govuk-input--error')).toBe(true);
      expect(enterManuallyDetails.open).toBe(true);
      expect(enterManuallyDetails.style.display).toBe('');
      expect(addressesFoundFlag.value).toBe('false');
      expect(button.disabled).toBe(false);
    });

    it('shows error when lookup fails with network error', async () => {
      document.body.innerHTML = buildComponent();

      setFetch(
        jest.fn().mockResolvedValue({
          ok: false,
          json: async () => ({ error: 'fail' }),
        })
      );

      initPostcodeLookup();

      const input = document.getElementById('address-lookupPostcode') as HTMLInputElement;
      const button = document.getElementById('address-findAddressBtn') as HTMLButtonElement;
      const select = document.getElementById('address-selectedAddress') as HTMLSelectElement;
      const selectContainer = document.getElementById('address-addressSelectContainer') as HTMLDivElement;
      const postcodeError = document.getElementById('address-postcode-error') as HTMLParagraphElement;

      input.value = 'SW1A 1AA';
      button.click();

      await flushPromises();

      expect(select.options).toHaveLength(1);
      expect(select.options[0].textContent).toBe('No addresses found');
      expect(select.hidden).toBe(false);
      expect(selectContainer.hidden).toBe(false);
      expect(postcodeError.classList.contains('govuk-!-display-none')).toBe(false);
      expect(button.disabled).toBe(false);
    });

    it('shows error when fetch throws exception', async () => {
      document.body.innerHTML = buildComponent();

      setFetch(jest.fn().mockRejectedValue(new Error('Network error')));

      initPostcodeLookup();

      const input = document.getElementById('address-lookupPostcode') as HTMLInputElement;
      const button = document.getElementById('address-findAddressBtn') as HTMLButtonElement;
      const postcodeError = document.getElementById('address-postcode-error') as HTMLParagraphElement;

      input.value = 'SW1A 1AA';
      button.click();

      await flushPromises();

      expect(postcodeError.classList.contains('govuk-!-display-none')).toBe(false);
      expect(input.classList.contains('govuk-input--error')).toBe(true);
      expect(button.disabled).toBe(false);
    });
  });

  describe('Error summary integration', () => {
    it('adds blank field error to error summary', async () => {
      document.body.innerHTML = buildErrorSummary() + buildComponent();

      initPostcodeLookup();

      const input = document.getElementById('address-lookupPostcode') as HTMLInputElement;
      const button = document.getElementById('address-findAddressBtn') as HTMLButtonElement;
      const errorSummary = document.querySelector('.govuk-error-summary') as HTMLDivElement;
      const errorList = document.querySelector('.govuk-error-summary__list') as HTMLUListElement;

      input.value = '';
      button.click();

      await flushPromises();

      expect(errorSummary.hidden).toBe(false);
      const errorItem = errorList.querySelector('li[data-error-id="address-lookup-postcode-error"]');
      expect(errorItem).toBeTruthy();
      expect(errorItem?.textContent).toContain('Enter a postcode');
      const link = errorItem?.querySelector('a');
      expect(link?.getAttribute('href')).toBe('#address-lookupPostcode');
    });

    it('removes blank field error from error summary on input', () => {
      document.body.innerHTML = buildErrorSummary() + buildComponent();

      initPostcodeLookup();

      const input = document.getElementById('address-lookupPostcode') as HTMLInputElement;
      const button = document.getElementById('address-findAddressBtn') as HTMLButtonElement;
      const errorList = document.querySelector('.govuk-error-summary__list') as HTMLUListElement;

      // Trigger blank field error
      input.value = '';
      button.click();

      let errorItem = errorList.querySelector('li[data-error-id="address-lookup-postcode-error"]');
      expect(errorItem).toBeTruthy();

      // Type in input
      input.value = 'SW1A';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      errorItem = errorList.querySelector('li[data-error-id="address-lookup-postcode-error"]');
      expect(errorItem).toBeNull();
    });

    it('adds no addresses found error to error summary', async () => {
      document.body.innerHTML = buildErrorSummary() + buildComponent();

      setFetch(
        jest.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ addresses: [] }),
        })
      );

      initPostcodeLookup();

      const input = document.getElementById('address-lookupPostcode') as HTMLInputElement;
      const button = document.getElementById('address-findAddressBtn') as HTMLButtonElement;
      const errorSummary = document.querySelector('.govuk-error-summary') as HTMLDivElement;
      const errorList = document.querySelector('.govuk-error-summary__list') as HTMLUListElement;

      input.value = 'SW1A 2AA';
      button.click();

      await flushPromises();

      expect(errorSummary.hidden).toBe(false);
      const errorItem = errorList.querySelector('li[data-error-id="address-postcode-error"]');
      expect(errorItem).toBeTruthy();
      expect(errorItem?.textContent).toContain('No addresses found');
    });

    it('removes no addresses found error when performing new lookup', async () => {
      document.body.innerHTML = buildErrorSummary() + buildComponent();

      // First lookup returns no addresses
      setFetch(
        jest.fn().mockResolvedValueOnce({
          ok: true,
          json: async () => ({ addresses: [] }),
        })
      );

      initPostcodeLookup();

      const input = document.getElementById('address-lookupPostcode') as HTMLInputElement;
      const button = document.getElementById('address-findAddressBtn') as HTMLButtonElement;
      const errorList = document.querySelector('.govuk-error-summary__list') as HTMLUListElement;

      input.value = 'SW1A 2AA';
      button.click();
      await flushPromises();

      let errorItem = errorList.querySelector('li[data-error-id="address-postcode-error"]');
      expect(errorItem).toBeTruthy();

      // Second lookup returns addresses
      setFetch(
        jest.fn().mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            addresses: [
              {
                fullAddress: '10 Downing Street',
                addressLine1: '10 Downing Street',
                addressLine2: '',
                town: 'London',
                county: '',
                postcode: 'SW1A 2AA',
              },
            ],
          }),
        })
      );

      input.value = 'SW1A 2AA';
      button.click();
      await flushPromises();

      errorItem = errorList.querySelector('li[data-error-id="address-postcode-error"]');
      expect(errorItem).toBeNull();
    });

    it('hides error summary when no errors remain', async () => {
      document.body.innerHTML = buildErrorSummary() + buildComponent();

      initPostcodeLookup();

      const input = document.getElementById('address-lookupPostcode') as HTMLInputElement;
      const button = document.getElementById('address-findAddressBtn') as HTMLButtonElement;
      const errorSummary = document.querySelector('.govuk-error-summary') as HTMLDivElement;
      const errorList = document.querySelector('.govuk-error-summary__list') as HTMLUListElement;

      // Trigger blank field error
      input.value = '';
      button.click();

      expect(errorSummary.hidden).toBe(false);
      expect(errorList.querySelectorAll('li')).toHaveLength(1);

      // Clear error
      input.value = 'SW1A';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      expect(errorList.querySelectorAll('li')).toHaveLength(0);
      expect(errorSummary.hidden).toBe(true);
    });

    it('does not duplicate errors in error summary', async () => {
      document.body.innerHTML = buildErrorSummary() + buildComponent();

      initPostcodeLookup();

      const input = document.getElementById('address-lookupPostcode') as HTMLInputElement;
      const button = document.getElementById('address-findAddressBtn') as HTMLButtonElement;
      const errorList = document.querySelector('.govuk-error-summary__list') as HTMLUListElement;

      // Trigger blank field error twice
      input.value = '';
      button.click();
      await flushPromises();

      input.value = '';
      button.click();
      await flushPromises();

      const errorItems = errorList.querySelectorAll('li[data-error-id="address-lookup-postcode-error"]');
      expect(errorItems).toHaveLength(1);
    });

    it('focuses error summary when blank field error occurs', async () => {
      document.body.innerHTML = buildErrorSummary() + buildComponent();

      initPostcodeLookup();

      const input = document.getElementById('address-lookupPostcode') as HTMLInputElement;
      const button = document.getElementById('address-findAddressBtn') as HTMLButtonElement;
      const errorSummary = document.querySelector('.govuk-error-summary') as HTMLDivElement;

      const focusSpy = jest.spyOn(errorSummary, 'focus');

      input.value = '';
      button.click();

      await flushPromises();

      expect(focusSpy).toHaveBeenCalled();
    });
  });

  describe('Address selection', () => {
    it('populates fields and opens enterManually details on selection change', () => {
      document.body.innerHTML = buildComponent();
      initPostcodeLookup();

      const select = document.getElementById('address-selectedAddress') as HTMLSelectElement;
      const enterManuallyDetails = document.getElementById('address-enterManuallyDetails') as HTMLDetailsElement;
      const line1 = document.getElementById('address-addressLine1') as HTMLInputElement;
      const line1FocusSpy = jest.spyOn(line1, 'focus');

      // Replace options with a selected entry
      while (select.options.length) {
        select.remove(0);
      }
      const opt = document.createElement('option');
      opt.value = '0';
      opt.textContent = '1 Main St';
      opt.dataset.line1 = '1 Main St';
      opt.dataset.line2 = 'Area';
      opt.dataset.town = 'Townsville';
      opt.dataset.county = 'Countyshire';
      opt.dataset.postcode = 'AB1 2CD';
      select.appendChild(opt);

      enterManuallyDetails.open = false;
      select.selectedIndex = 0;
      select.dispatchEvent(new Event('change', { bubbles: true }));

      expect(line1.value).toBe('1 Main St');
      expect((document.getElementById('address-addressLine2') as HTMLInputElement).value).toBe('Area');
      expect((document.getElementById('address-town') as HTMLInputElement).value).toBe('Townsville');
      expect((document.getElementById('address-county') as HTMLInputElement).value).toBe('Countyshire');
      expect((document.getElementById('address-postcode') as HTMLInputElement).value).toBe('AB1 2CD');
      expect(enterManuallyDetails.open).toBe(true);
      expect(line1FocusSpy).toHaveBeenCalled();
    });

    it('handles selection change with no value selected', () => {
      document.body.innerHTML = buildComponent();
      initPostcodeLookup();

      const select = document.getElementById('address-selectedAddress') as HTMLSelectElement;
      const line1 = document.getElementById('address-addressLine1') as HTMLInputElement;

      expect(() => {
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }).not.toThrow();

      expect(line1.value).toBe('');
    });

    it('handles selection change with empty value', () => {
      document.body.innerHTML = buildComponent();
      initPostcodeLookup();

      const select = document.getElementById('address-selectedAddress') as HTMLSelectElement;
      const line1 = document.getElementById('address-addressLine1') as HTMLInputElement;

      // Replace options with an option that has empty value
      while (select.options.length) {
        select.remove(0);
      }
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No selection';
      select.appendChild(opt);

      expect(() => {
        select.selectedIndex = 0;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }).not.toThrow();

      expect(line1.value).toBe('');
    });

    it('clears dropdown error on selection change', () => {
      document.body.innerHTML = buildComponent();
      initPostcodeLookup();

      const select = document.getElementById('address-selectedAddress') as HTMLSelectElement;
      const selectError = document.getElementById('address-selectedAddress-error') as HTMLParagraphElement;
      const selectFormGroup = document.getElementById('address-selectedAddress-form-group') as HTMLDivElement;

      // Manually add error state
      selectError.classList.remove('govuk-!-display-none');
      select.classList.add('govuk-select--error');
      selectFormGroup.classList.add('govuk-form-group--error');

      // Replace options with a selected entry
      while (select.options.length) {
        select.remove(0);
      }
      const opt = document.createElement('option');
      opt.value = '0';
      opt.textContent = '1 Main St';
      opt.dataset.line1 = '1 Main St';
      select.appendChild(opt);

      select.selectedIndex = 0;
      select.dispatchEvent(new Event('change', { bubbles: true }));

      expect(selectError.classList.contains('govuk-!-display-none')).toBe(true);
      expect(select.classList.contains('govuk-select--error')).toBe(false);
      expect(selectFormGroup.classList.contains('govuk-form-group--error')).toBe(false);
    });

    it('removes dropdown error from error summary on selection', () => {
      document.body.innerHTML = buildErrorSummary() + buildComponent();
      initPostcodeLookup();

      const select = document.getElementById('address-selectedAddress') as HTMLSelectElement;
      const errorList = document.querySelector('.govuk-error-summary__list') as HTMLUListElement;

      // Manually add error to summary
      const li = document.createElement('li');
      li.setAttribute('data-error-id', 'address-selectedAddress-error');
      const link = document.createElement('a');
      link.href = '#address-selectedAddress';
      link.textContent = 'Select an address';
      li.appendChild(link);
      errorList.appendChild(li);

      // Replace options with a selected entry
      while (select.options.length) {
        select.remove(0);
      }
      const opt = document.createElement('option');
      opt.value = '0';
      opt.textContent = '1 Main St';
      opt.dataset.line1 = '1 Main St';
      select.appendChild(opt);

      select.selectedIndex = 0;
      select.dispatchEvent(new Event('change', { bubbles: true }));

      const errorItem = errorList.querySelector('li[data-error-id="address-selectedAddress-error"]');
      expect(errorItem).toBeNull();
    });
  });

  describe('Form submission validation', () => {
    it('prevents submission when addresses found but none selected', () => {
      const formHtml = `
        <form id="testForm">
          ${buildErrorSummary()}
          ${buildComponent()}
          <button type="submit">Submit</button>
        </form>
      `;
      document.body.innerHTML = formHtml;

      initPostcodeLookup();

      const form = document.getElementById('testForm') as HTMLFormElement;
      const select = document.getElementById('address-selectedAddress') as HTMLSelectElement;
      const selectContainer = document.getElementById('address-addressSelectContainer') as HTMLDivElement;
      const addressesFoundFlag = document.getElementById('address-addressesFoundFlag') as HTMLInputElement;
      const selectError = document.getElementById('address-selectedAddress-error') as HTMLParagraphElement;
      const selectFormGroup = document.getElementById('address-selectedAddress-form-group') as HTMLDivElement;
      const errorSummary = document.querySelector('.govuk-error-summary') as HTMLDivElement;

      // Simulate addresses found scenario
      addressesFoundFlag.value = 'true';
      selectContainer.hidden = false;
      select.hidden = false;
      select.innerHTML = '<option value="">2 addresses found</option><option value="0">Address 1</option>';

      const preventDefaultSpy = jest.fn();
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      Object.defineProperty(submitEvent, 'preventDefault', { value: preventDefaultSpy });

      form.dispatchEvent(submitEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(selectError.classList.contains('govuk-!-display-none')).toBe(false);
      expect(select.classList.contains('govuk-select--error')).toBe(true);
      expect(selectFormGroup.classList.contains('govuk-form-group--error')).toBe(true);
      expect(errorSummary.hidden).toBe(false);

      const errorList = document.querySelector('.govuk-error-summary__list') as HTMLUListElement;
      const errorItem = errorList.querySelector('li[data-error-id="address-selectedAddress-error"]');
      expect(errorItem).toBeTruthy();
    });

    it('allows submission when address is selected', () => {
      const formHtml = `
        <form id="testForm">
          ${buildComponent()}
          <button type="submit">Submit</button>
        </form>
      `;
      document.body.innerHTML = formHtml;

      initPostcodeLookup();

      const form = document.getElementById('testForm') as HTMLFormElement;
      const select = document.getElementById('address-selectedAddress') as HTMLSelectElement;
      const selectContainer = document.getElementById('address-addressSelectContainer') as HTMLDivElement;
      const addressesFoundFlag = document.getElementById('address-addressesFoundFlag') as HTMLInputElement;

      // Simulate addresses found and one selected
      addressesFoundFlag.value = 'true';
      selectContainer.hidden = false;
      select.hidden = false;
      select.innerHTML = '<option value="">2 addresses found</option><option value="0">Address 1</option>';
      select.selectedIndex = 1;

      const preventDefaultSpy = jest.fn();
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      Object.defineProperty(submitEvent, 'preventDefault', { value: preventDefaultSpy });

      form.dispatchEvent(submitEvent);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it('allows submission when no addresses found (manual entry)', () => {
      const formHtml = `
        <form id="testForm">
          ${buildComponent()}
          <button type="submit">Submit</button>
        </form>
      `;
      document.body.innerHTML = formHtml;

      initPostcodeLookup();

      const form = document.getElementById('testForm') as HTMLFormElement;
      const select = document.getElementById('address-selectedAddress') as HTMLSelectElement;
      const selectContainer = document.getElementById('address-addressSelectContainer') as HTMLDivElement;
      const addressesFoundFlag = document.getElementById('address-addressesFoundFlag') as HTMLInputElement;

      // Simulate no addresses found scenario
      addressesFoundFlag.value = 'false';
      selectContainer.hidden = false;
      select.hidden = false;
      select.innerHTML = '<option value="">No addresses found</option>';

      const preventDefaultSpy = jest.fn();
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      Object.defineProperty(submitEvent, 'preventDefault', { value: preventDefaultSpy });

      form.dispatchEvent(submitEvent);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it('allows submission when dropdown is hidden', () => {
      const formHtml = `
        <form id="testForm">
          ${buildComponent()}
          <button type="submit">Submit</button>
        </form>
      `;
      document.body.innerHTML = formHtml;

      initPostcodeLookup();

      const form = document.getElementById('testForm') as HTMLFormElement;
      const selectContainer = document.getElementById('address-addressSelectContainer') as HTMLDivElement;
      const addressesFoundFlag = document.getElementById('address-addressesFoundFlag') as HTMLInputElement;

      // Dropdown hidden (no lookup performed yet)
      addressesFoundFlag.value = '';
      selectContainer.hidden = true;

      const preventDefaultSpy = jest.fn();
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      Object.defineProperty(submitEvent, 'preventDefault', { value: preventDefaultSpy });

      form.dispatchEvent(submitEvent);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it('validates multiple address components in same form', () => {
      const formHtml = `
        <form id="testForm">
          ${buildErrorSummary()}
          ${buildComponent('home')}
          ${buildComponent('work')}
          <button type="submit">Submit</button>
        </form>
      `;
      document.body.innerHTML = formHtml;

      initPostcodeLookup();

      const form = document.getElementById('testForm') as HTMLFormElement;

      // Set up home address (found, not selected)
      const homeSelect = document.getElementById('home-selectedAddress') as HTMLSelectElement;
      const homeSelectContainer = document.getElementById('home-addressSelectContainer') as HTMLDivElement;
      const homeFlag = document.getElementById('home-addressesFoundFlag') as HTMLInputElement;
      homeFlag.value = 'true';
      homeSelectContainer.hidden = false;
      homeSelect.hidden = false;
      homeSelect.innerHTML = '<option value="">2 addresses found</option><option value="0">Address 1</option>';

      // Set up work address (found, not selected)
      const workSelect = document.getElementById('work-selectedAddress') as HTMLSelectElement;
      const workSelectContainer = document.getElementById('work-addressSelectContainer') as HTMLDivElement;
      const workFlag = document.getElementById('work-addressesFoundFlag') as HTMLInputElement;
      workFlag.value = 'true';
      workSelectContainer.hidden = false;
      workSelect.hidden = false;
      workSelect.innerHTML = '<option value="">1 address found</option><option value="0">Work Address</option>';

      const preventDefaultSpy = jest.fn();
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      Object.defineProperty(submitEvent, 'preventDefault', { value: preventDefaultSpy });

      form.dispatchEvent(submitEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();

      // Note: The implementation returns after the first validation error,
      // so only the first error is added to the summary
      const errorList = document.querySelector('.govuk-error-summary__list') as HTMLUListElement;
      expect(errorList.querySelector('li[data-error-id="home-selectedAddress-error"]')).toBeTruthy();
    });

    it('focuses and scrolls to error summary on validation failure', () => {
      const formHtml = `
        <form id="testForm">
          ${buildErrorSummary()}
          ${buildComponent()}
          <button type="submit">Submit</button>
        </form>
      `;
      document.body.innerHTML = formHtml;

      initPostcodeLookup();

      const form = document.getElementById('testForm') as HTMLFormElement;
      const select = document.getElementById('address-selectedAddress') as HTMLSelectElement;
      const selectContainer = document.getElementById('address-addressSelectContainer') as HTMLDivElement;
      const addressesFoundFlag = document.getElementById('address-addressesFoundFlag') as HTMLInputElement;
      const errorSummary = document.querySelector('.govuk-error-summary') as HTMLDivElement;

      addressesFoundFlag.value = 'true';
      selectContainer.hidden = false;
      select.hidden = false;
      select.innerHTML = '<option value="">2 addresses found</option><option value="0">Address 1</option>';

      const focusSpy = jest.spyOn(errorSummary, 'focus');
      const scrollSpy = jest.spyOn(errorSummary, 'scrollIntoView');

      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      form.dispatchEvent(submitEvent);

      expect(focusSpy).toHaveBeenCalled();
      expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    });
  });

  describe('Multiple containers with event delegation', () => {
    it('handles click events for multiple containers', async () => {
      document.body.innerHTML = buildComponent('home') + buildComponent('work');

      setFetch(
        jest.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ addresses: [] }),
        })
      );

      initPostcodeLookup();

      const homeInput = document.getElementById('home-lookupPostcode') as HTMLInputElement;
      const homeButton = document.getElementById('home-findAddressBtn') as HTMLButtonElement;
      const homeSelect = document.getElementById('home-selectedAddress') as HTMLSelectElement;

      homeInput.value = 'SW1A 2AA';
      homeButton.click();
      await flushPromises();

      expect(global.fetch).toHaveBeenCalledWith('/api/postcode-lookup?postcode=SW1A%202AA', expect.any(Object));
      expect(homeSelect.hidden).toBe(false);

      const workInput = document.getElementById('work-lookupPostcode') as HTMLInputElement;
      const workButton = document.getElementById('work-findAddressBtn') as HTMLButtonElement;
      const workSelect = document.getElementById('work-selectedAddress') as HTMLSelectElement;

      workInput.value = 'AB1 2CD';
      workButton.click();
      await flushPromises();

      expect(global.fetch).toHaveBeenCalledWith('/api/postcode-lookup?postcode=AB1%202CD', expect.any(Object));
      expect(workSelect.hidden).toBe(false);
    });

    it('handles click events on non-matching elements', () => {
      document.body.innerHTML = buildComponent('home') + '<button id="other-button">Other Button</button>';

      setFetch(jest.fn());
      initPostcodeLookup();

      const otherButton = document.getElementById('other-button') as HTMLButtonElement;
      expect(() => otherButton.click()).not.toThrow();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('handles missing container in event delegation for click', () => {
      document.body.innerHTML = '<button id="orphan-findAddressBtn" type="button">Find</button>';

      setFetch(jest.fn());
      initPostcodeLookup();

      const orphanButton = document.getElementById('orphan-findAddressBtn') as HTMLButtonElement;
      expect(() => orphanButton.click()).not.toThrow();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('handles missing elements in event delegation for click', () => {
      document.body.innerHTML = `
        <div data-address-component data-name-prefix="incomplete">
          <button id="incomplete-findAddressBtn" type="button">Find</button>
        </div>
      `;

      setFetch(jest.fn());
      initPostcodeLookup();

      const button = document.getElementById('incomplete-findAddressBtn') as HTMLButtonElement;
      expect(() => button.click()).not.toThrow();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('handles input events for multiple containers', () => {
      document.body.innerHTML = buildComponent('home') + buildComponent('work');

      initPostcodeLookup();

      const homeInput = document.getElementById('home-lookupPostcode') as HTMLInputElement;
      const homeError = document.getElementById('home-lookup-postcode-error') as HTMLParagraphElement;

      // Show error first
      homeError.classList.remove('govuk-!-display-none');
      homeInput.classList.add('govuk-input--error');

      homeInput.dispatchEvent(new Event('input', { bubbles: true }));

      expect(homeInput.classList.contains('govuk-input--error')).toBe(false);
      expect(homeError.classList.contains('govuk-!-display-none')).toBe(true);
    });

    it('handles input events on non-matching elements', () => {
      document.body.innerHTML = buildComponent('home') + '<input id="other-input" />';

      initPostcodeLookup();

      const otherInput = document.getElementById('other-input') as HTMLInputElement;
      expect(() => {
        otherInput.dispatchEvent(new Event('input', { bubbles: true }));
      }).not.toThrow();
    });

    it('handles input event with missing container', () => {
      document.body.innerHTML = buildComponent('home') + '<input id="orphan-lookupPostcode" />';

      initPostcodeLookup();

      const orphanInput = document.getElementById('orphan-lookupPostcode') as HTMLInputElement;
      expect(() => {
        orphanInput.dispatchEvent(new Event('input', { bubbles: true }));
      }).not.toThrow();
    });

    it('handles change events for multiple containers', () => {
      document.body.innerHTML = buildComponent('home') + buildComponent('work');

      initPostcodeLookup();

      const homeSelect = document.getElementById('home-selectedAddress') as HTMLSelectElement;
      const homeLine1 = document.getElementById('home-addressLine1') as HTMLInputElement;

      // Add an address option
      const opt = document.createElement('option');
      opt.value = '0';
      opt.textContent = '123 Main St';
      opt.dataset.line1 = '123 Main St';
      homeSelect.appendChild(opt);

      homeSelect.selectedIndex = 1;
      homeSelect.dispatchEvent(new Event('change', { bubbles: true }));

      expect(homeLine1.value).toBe('123 Main St');
    });

    it('handles change events on non-matching elements', () => {
      document.body.innerHTML = buildComponent('home') + '<select id="other-select"><option>Other</option></select>';

      initPostcodeLookup();

      const otherSelect = document.getElementById('other-select') as HTMLSelectElement;
      expect(() => {
        otherSelect.dispatchEvent(new Event('change'));
      }).not.toThrow();
    });

    it('handles change event with missing container', () => {
      document.body.innerHTML =
        buildComponent('home') + '<select id="orphan-selectedAddress"><option>Orphan</option></select>';

      initPostcodeLookup();

      const orphanSelect = document.getElementById('orphan-selectedAddress') as HTMLSelectElement;
      expect(() => {
        orphanSelect.dispatchEvent(new Event('change'));
      }).not.toThrow();
    });
  });

  describe('Edge cases and graceful degradation', () => {
    it('handles missing select container gracefully', async () => {
      document.body.innerHTML = `
        <div data-address-component>
          <input id="address-lookupPostcode" />
          <button id="address-findAddressBtn" type="button">Find</button>
          <select id="address-selectedAddress">
            <option value="">Initial</option>
          </select>
          <p class="govuk-error-message govuk-!-display-none" id="address-postcode-error">Error</p>
          <input type="hidden" id="address-addressesFoundFlag" value="" />
        </div>
      `;

      setFetch(
        jest.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ addresses: [] }),
        })
      );

      expect(() => initPostcodeLookup()).not.toThrow();

      const input = document.getElementById('address-lookupPostcode') as HTMLInputElement;
      const button = document.getElementById('address-findAddressBtn') as HTMLButtonElement;
      const select = document.getElementById('address-selectedAddress') as HTMLSelectElement;

      input.value = 'SW1A 2AA';
      button.click();
      await flushPromises();

      expect(select.hidden).toBe(false);
    });

    it('handles missing address fields gracefully during selection', () => {
      document.body.innerHTML = `
        <div data-address-component>
          <select id="address-selectedAddress">
            <option value="">Initial</option>
          </select>
          <details id="address-enterManuallyDetails"></details>
        </div>
      `;

      initPostcodeLookup();

      const select = document.getElementById('address-selectedAddress') as HTMLSelectElement;

      const opt = document.createElement('option');
      opt.value = '0';
      opt.textContent = '1 Main St';
      opt.dataset.line1 = '1 Main St';
      select.appendChild(opt);

      expect(() => {
        select.selectedIndex = 1;
        select.dispatchEvent(new Event('change'));
      }).not.toThrow();
    });

    it('handles missing enterManually details gracefully', () => {
      document.body.innerHTML = `
        <div data-address-component>
          <select id="address-selectedAddress">
            <option value="">Initial</option>
          </select>
          <input id="address-addressLine1" />
        </div>
      `;

      initPostcodeLookup();

      const select = document.getElementById('address-selectedAddress') as HTMLSelectElement;

      const opt = document.createElement('option');
      opt.value = '0';
      opt.textContent = '1 Main St';
      opt.dataset.line1 = '1 Main St';
      select.appendChild(opt);

      expect(() => {
        select.selectedIndex = 1;
        select.dispatchEvent(new Event('change'));
      }).not.toThrow();
    });

    it('handles missing error messages gracefully', async () => {
      document.body.innerHTML = `
        <div data-address-component>
          <input id="address-lookupPostcode" />
          <button id="address-findAddressBtn" type="button">Find</button>
          <select id="address-selectedAddress"></select>
          <input type="hidden" id="address-addressesFoundFlag" value="" />
        </div>
      `;

      setFetch(
        jest.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ addresses: [] }),
        })
      );

      expect(() => initPostcodeLookup()).not.toThrow();

      const input = document.getElementById('address-lookupPostcode') as HTMLInputElement;
      const button = document.getElementById('address-findAddressBtn') as HTMLButtonElement;

      input.value = 'SW1A 2AA';
      expect(() => button.click()).not.toThrow();
      await flushPromises();
    });

    it('supports data-address-fields container', () => {
      document.body.innerHTML = `
        <div data-address-component>
          <input id="address-lookupPostcode" />
          <button id="address-findAddressBtn" type="button">Find</button>
          <select id="address-selectedAddress">
            <option value="">Initial</option>
          </select>
          <details id="address-enterManuallyDetails"></details>
          <div data-address-fields>
            <input id="address-addressLine1" />
          </div>
        </div>
      `;

      initPostcodeLookup();

      const select = document.getElementById('address-selectedAddress') as HTMLSelectElement;
      const line1 = document.getElementById('address-addressLine1') as HTMLInputElement;

      const opt = document.createElement('option');
      opt.value = '0';
      opt.textContent = '1 Main St';
      opt.dataset.line1 = '1 Main St';
      select.appendChild(opt);

      select.selectedIndex = 1;
      select.dispatchEvent(new Event('change', { bubbles: true }));

      expect(line1.value).toBe('1 Main St');
    });

    it('handles missing form group gracefully', async () => {
      document.body.innerHTML = `
        <div data-address-component>
          <input id="address-lookupPostcode" />
          <button id="address-findAddressBtn" type="button">Find</button>
          <select id="address-selectedAddress"></select>
          <p class="govuk-error-message govuk-!-display-none" id="address-lookup-postcode-error">Error</p>
        </div>
      `;

      initPostcodeLookup();

      const input = document.getElementById('address-lookupPostcode') as HTMLInputElement;
      const button = document.getElementById('address-findAddressBtn') as HTMLButtonElement;

      input.value = '';
      expect(() => button.click()).not.toThrow();
      await flushPromises();
    });

    it('handles missing addressesFoundFlag gracefully', async () => {
      document.body.innerHTML = `
        <div data-address-component>
          <input id="address-lookupPostcode" />
          <button id="address-findAddressBtn" type="button">Find</button>
          <select id="address-selectedAddress"></select>
          <p class="govuk-error-message govuk-!-display-none" id="address-postcode-error">Error</p>
        </div>
      `;

      setFetch(
        jest.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ addresses: [] }),
        })
      );

      initPostcodeLookup();

      const input = document.getElementById('address-lookupPostcode') as HTMLInputElement;
      const button = document.getElementById('address-findAddressBtn') as HTMLButtonElement;

      input.value = 'SW1A 2AA';
      expect(() => button.click()).not.toThrow();
      await flushPromises();
    });
  });
});

describe('initPostcodeSelection', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  it('does nothing when no address select element present', () => {
    expect(() => initPostcodeSelection()).not.toThrow();
  });

  it('focuses address select when lookup=1 in URL', () => {
    // Provide a safe test-only href without touching window.location
    const originalHref = (window as { __testHref?: string }).__testHref;
    (window as { __testHref?: string }).__testHref = 'http://localhost:3000/test?lookup=1';

    document.body.innerHTML = `
      <select id="selectedAddress">
        <option value="">Select address</option>
      </select>
    `;

    const select = document.getElementById('selectedAddress') as HTMLSelectElement;
    const focusSpy = jest.spyOn(select, 'focus');

    initPostcodeSelection();

    expect(focusSpy).toHaveBeenCalled();

    // Restore test href
    (window as { __testHref?: string }).__testHref = originalHref;
  });

  it('does not focus when lookup parameter is not 1', () => {
    // Provide a safe test-only href without touching window.location
    const originalHref = (window as { __testHref?: string }).__testHref;
    (window as { __testHref?: string }).__testHref = 'http://localhost:3000/test?lookup=0';

    document.body.innerHTML = `
      <select id="selectedAddress">
        <option value="">Select address</option>
      </select>
    `;

    const select = document.getElementById('selectedAddress') as HTMLSelectElement;
    const focusSpy = jest.spyOn(select, 'focus');

    initPostcodeSelection();

    expect(focusSpy).not.toHaveBeenCalled();

    // Restore test href
    (window as { __testHref?: string }).__testHref = originalHref;
  });

  it('does not focus when no lookup parameter', () => {
    // Provide a safe test-only href without touching window.location
    const originalHref = (window as { __testHref?: string }).__testHref;
    (window as { __testHref?: string }).__testHref = 'http://localhost:3000/test';

    document.body.innerHTML = `
      <select id="selectedAddress">
        <option value="">Select address</option>
      </select>
    `;

    const select = document.getElementById('selectedAddress') as HTMLSelectElement;
    const focusSpy = jest.spyOn(select, 'focus');

    initPostcodeSelection();

    expect(focusSpy).not.toHaveBeenCalled();

    // Restore test href
    (window as { __testHref?: string }).__testHref = originalHref;
  });

  it('handles address selection change with all fields present', () => {
    document.body.innerHTML = `
      <select id="selectedAddress">
        <option value="">Select address</option>
      </select>
      <input id="addressLine1" name="address[addressLine1]" />
      <input id="addressLine2" name="address[addressLine2]" />
      <input id="town" name="address[town]" />
      <input id="county" name="address[county]" />
      <input id="postcode" name="address[postcode]" />
      <div class="govuk-details"></div>
    `;

    initPostcodeSelection();

    const select = document.getElementById('selectedAddress') as HTMLSelectElement;
    const addressLine1 = document.getElementById('addressLine1') as HTMLInputElement;
    const addressLine2 = document.getElementById('addressLine2') as HTMLInputElement;
    const town = document.getElementById('town') as HTMLInputElement;
    const county = document.getElementById('county') as HTMLInputElement;
    const postcode = document.getElementById('postcode') as HTMLInputElement;
    const details = document.querySelector('.govuk-details') as HTMLDetailsElement;

    // Replace options with a selected entry
    while (select.options.length) {
      select.remove(0);
    }
    const opt = document.createElement('option');
    opt.value = '0';
    opt.textContent = '1 Main St';
    opt.dataset.line1 = '1 Main St';
    opt.dataset.line2 = 'Area';
    opt.dataset.line3 = 'Locality';
    opt.dataset.town = 'Townsville';
    opt.dataset.county = 'Countyshire';
    opt.dataset.postcode = 'AB1 2CD';
    select.appendChild(opt);

    expect(details.hasAttribute('open')).toBe(false);
    select.selectedIndex = 0;
    select.dispatchEvent(new Event('change'));

    expect(addressLine1.value).toBe('1 Main St');
    expect(addressLine2.value).toBe('Area');
    expect(town.value).toBe('Townsville');
    expect(county.value).toBe('Countyshire');
    expect(postcode.value).toBe('AB1 2CD');
    expect(details.open).toBe(true);
  });

  it('handles address selection change with missing fields', () => {
    document.body.innerHTML = `
      <select id="selectedAddress">
        <option value="">Select address</option>
      </select>
      <input id="addressLine1" />
    `;

    initPostcodeSelection();

    const select = document.getElementById('selectedAddress') as HTMLSelectElement;

    // Replace options with a selected entry
    while (select.options.length) {
      select.remove(0);
    }
    const opt = document.createElement('option');
    opt.value = '0';
    opt.textContent = '1 Main St';
    opt.dataset.line1 = '1 Main St';
    select.appendChild(opt);

    expect(() => {
      select.selectedIndex = 0;
      select.dispatchEvent(new Event('change'));
    }).not.toThrow();
  });

  it('handles selection change with no value selected', () => {
    document.body.innerHTML = `
      <select id="selectedAddress">
        <option value="">Select address</option>
      </select>
      <input id="addressLine1" />
    `;

    initPostcodeSelection();

    const select = document.getElementById('selectedAddress') as HTMLSelectElement;
    const addressLine1 = document.getElementById('addressLine1') as HTMLInputElement;

    // Don't change selectedIndex, keep it at 0 (initial option with empty value)
    expect(() => {
      select.dispatchEvent(new Event('change'));
    }).not.toThrow();

    // Values should remain unchanged
    expect(addressLine1.value).toBe('');
  });

  it('handles selection change with empty value', () => {
    document.body.innerHTML = `
      <select id="selectedAddress">
        <option value="">Select address</option>
      </select>
      <input id="addressLine1" />
    `;

    initPostcodeSelection();

    const select = document.getElementById('selectedAddress') as HTMLSelectElement;
    const addressLine1 = document.getElementById('addressLine1') as HTMLInputElement;

    // Replace options with an option that has empty value
    while (select.options.length) {
      select.remove(0);
    }
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No selection';
    select.appendChild(opt);

    expect(() => {
      select.selectedIndex = 0;
      select.dispatchEvent(new Event('change'));
    }).not.toThrow();

    // Values should remain unchanged
    expect(addressLine1.value).toBe('');
  });

  it('handles details element that is already open', () => {
    document.body.innerHTML = `
      <select id="selectedAddress">
        <option value="">Select address</option>
      </select>
      <input id="addressLine1" />
      <div class="govuk-details" open></div>
    `;

    initPostcodeSelection();

    const select = document.getElementById('selectedAddress') as HTMLSelectElement;
    const details = document.querySelector('.govuk-details') as HTMLDetailsElement;

    // Replace options with a selected entry
    while (select.options.length) {
      select.remove(0);
    }
    const opt = document.createElement('option');
    opt.value = '0';
    opt.textContent = '1 Main St';
    opt.dataset.line1 = '1 Main St';
    select.appendChild(opt);

    expect(details.hasAttribute('open')).toBe(true);
    select.selectedIndex = 0;
    select.dispatchEvent(new Event('change'));

    expect(details.open).toBe(true);
  });
});
