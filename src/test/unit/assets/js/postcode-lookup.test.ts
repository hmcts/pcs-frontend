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
  });

  const buildComponent = (prefix = 'address') => `
    <div data-address-component data-name-prefix="${prefix}">
      <input id="${prefix}-lookupPostcode" name="${prefix}[lookupPostcode]" />
      <button id="${prefix}-findAddressBtn" type="button">Find</button>
      <div id="${prefix}-addressSelectContainer" hidden>
        <select id="${prefix}-selectedAddress" name="${prefix}[selectedAddress]">
          <option value="">Initial</option>
        </select>
      </div>
      <details id="${prefix}-enterManuallyDetails"></details>
      <div id="${prefix}-addressForm" class="govuk-visually-hidden">
        <input id="${prefix}-addressLine1" name="${prefix}[addressLine1]" />
        <input id="${prefix}-addressLine2" name="${prefix}[addressLine2]" />
        <input id="${prefix}-town" name="${prefix}[town]" />
        <input id="${prefix}-county" name="${prefix}[county]" />
        <input id="${prefix}-postcode" name="${prefix}[postcode]" />
      </div>
    </div>
  `;

  it('does nothing when no containers present', () => {
    expect(() => initPostcodeLookup()).not.toThrow();
  });

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
  });

  it('shows fallback when lookup fails', async () => {
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

    input.value = 'SW1A 1AA';
    button.click();

    await flushPromises();

    expect(select.options).toHaveLength(1);
    expect(select.options[0].textContent).toBe('No addresses found');
    expect(select.hidden).toBe(false);
    expect(selectContainer.hidden).toBe(false);
    expect(button.disabled).toBe(false);
  });

  it('does not call fetch for empty postcode', async () => {
    document.body.innerHTML = buildComponent();
    setFetch(jest.fn());

    initPostcodeLookup();

    const input = document.getElementById('address-lookupPostcode') as HTMLInputElement;
    const button = document.getElementById('address-findAddressBtn') as HTMLButtonElement;
    const select = document.getElementById('address-selectedAddress') as HTMLSelectElement;

    input.value = '   ';
    button.click();

    await flushPromises();

    expect(global.fetch).not.toHaveBeenCalled();
    // Ensure the initial option remains unchanged
    expect(select.options).toHaveLength(1);
    expect(button.disabled).toBe(false);
  });

  it('populates fields and shows addressForm on selection change (via postcode-select)', () => {
    document.body.innerHTML = buildComponent();
    initPostcodeLookup();
    initPostcodeSelection();

    const select = document.getElementById('address-selectedAddress') as HTMLSelectElement;
    const addressForm = document.getElementById('address-addressForm') as HTMLDivElement;
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
    opt.dataset.line3 = 'Locality';
    opt.dataset.town = 'Townsville';
    opt.dataset.county = 'Countyshire';
    opt.dataset.postcode = 'AB1 2CD';
    select.appendChild(opt);

    expect(addressForm.classList.contains('govuk-visually-hidden')).toBe(true);
    select.selectedIndex = 0;
    select.dispatchEvent(new Event('change'));

    expect(line1.value).toBe('1 Main St');
    expect((document.getElementById('address-addressLine2') as HTMLInputElement).value).toBe('Area');
    expect((document.getElementById('address-town') as HTMLInputElement).value).toBe('Townsville');
    expect((document.getElementById('address-county') as HTMLInputElement).value).toBe('Countyshire');
    expect((document.getElementById('address-postcode') as HTMLInputElement).value).toBe('AB1 2CD');
    expect(addressForm.classList.contains('govuk-visually-hidden')).toBe(false);
    expect(enterManuallyDetails.style.display).toBe('none');
    expect(line1FocusSpy).toHaveBeenCalled();
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

    input.value = 'SW1A 2AA';
    button.click();
    await flushPromises();

    expect(select.options[0].textContent).toBe('1 address found');
  });

  it('handles missing select container gracefully', async () => {
    document.body.innerHTML = `
      <div data-address-component>
        <input id="address-lookupPostcode" />
        <button id="address-findAddressBtn" type="button">Find</button>
        <select id="address-selectedAddress">
          <option value="">Initial</option>
        </select>
        <details></details>
        <input id="address-addressLine1" name="address[addressLine1]" />
        <input id="address-addressLine2" name="address[addressLine2]" />
        <input id="address-town" name="address[town]" />
        <input id="address-county" name="address[county]" />
        <input id="address-postcode" name="address[postcode]" />
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

  it('handles missing address fields gracefully', () => {
    document.body.innerHTML = `
      <div data-address-component>
        <input id="address-lookupPostcode" />
        <button id="address-findAddressBtn" type="button">Find</button>
        <select id="address-selectedAddress">
          <option value="">Initial</option>
        </select>
        <details></details>
      </div>
    `;

    initPostcodeLookup();
    initPostcodeSelection();

    const select = document.getElementById('address-selectedAddress') as HTMLSelectElement;

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

    expect(() => {
      select.selectedIndex = 0;
      select.dispatchEvent(new Event('change'));
    }).not.toThrow();
  });

  it('handles addressForm visibility on selection with new structure', () => {
    document.body.innerHTML = `
      <div data-address-component>
        <input id="address-lookupPostcode" />
        <button id="address-findAddressBtn" type="button">Find</button>
        <select id="address-selectedAddress">
          <option value="">Initial</option>
        </select>
        <details id="address-enterManuallyDetails"></details>
        <div id="address-addressForm" class="govuk-visually-hidden">
          <input id="address-addressLine1" />
        </div>
      </div>
    `;

    initPostcodeLookup();
    initPostcodeSelection();

    const select = document.getElementById('address-selectedAddress') as HTMLSelectElement;
    const addressForm = document.getElementById('address-addressForm') as HTMLDivElement;
    const enterManuallyDetails = document.getElementById('address-enterManuallyDetails') as HTMLDetailsElement;

    // Replace options with a selected entry
    while (select.options.length) {
      select.remove(0);
    }
    const opt = document.createElement('option');
    opt.value = '0';
    opt.textContent = '1 Main St';
    opt.dataset.line1 = '1 Main St';
    select.appendChild(opt);

    // Check that addressForm is initially hidden
    expect(addressForm.classList.contains('govuk-visually-hidden')).toBe(true);
    select.selectedIndex = 0;
    select.dispatchEvent(new Event('change'));

    // The addressForm should now be visible and enterManuallyDetails hidden
    expect(addressForm.classList.contains('govuk-visually-hidden')).toBe(false);
    expect(enterManuallyDetails.style.display).toBe('none');
  });

  it('handles selection change with no value selected', () => {
    document.body.innerHTML = buildComponent();
    initPostcodeLookup();
    initPostcodeSelection();

    const select = document.getElementById('address-selectedAddress') as HTMLSelectElement;
    const line1 = document.getElementById('address-addressLine1') as HTMLInputElement;

    // Don't change selectedIndex, keep it at 0 (initial option with empty value)
    expect(() => {
      select.dispatchEvent(new Event('change'));
    }).not.toThrow();

    // Values should remain unchanged
    expect(line1.value).toBe('');
  });

  it('handles selection change with empty value', () => {
    document.body.innerHTML = buildComponent();
    initPostcodeLookup();
    initPostcodeSelection();

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
      select.dispatchEvent(new Event('change'));
    }).not.toThrow();

    // Values should remain unchanged
    expect(line1.value).toBe('');
  });

  describe('multiple container scenarios (event delegation)', () => {
    beforeEach(() => {
      // Reset the global flag
      (global as { postcodeLookupDelegatedBound?: boolean }).postcodeLookupDelegatedBound = false;
    });

    it('uses event delegation for multiple containers', async () => {
      document.body.innerHTML = `
        <div data-address-component data-name-prefix="home">
          <input id="home-lookupPostcode" />
          <button id="home-findAddressBtn" type="button">Find</button>
          <select id="home-selectedAddress">
            <option value="">Initial</option>
          </select>
          <div id="home-addressSelectContainer" hidden></div>
        </div>
        <div data-address-component data-name-prefix="work">
          <input id="work-lookupPostcode" />
          <button id="work-findAddressBtn" type="button">Find</button>
          <select id="work-selectedAddress">
            <option value="">Initial</option>
          </select>
          <div id="work-addressSelectContainer" hidden></div>
        </div>
      `;

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
    });

    it('prevents duplicate event delegation binding', () => {
      document.body.innerHTML = `
        <div data-address-component data-name-prefix="home">
          <input id="home-lookupPostcode" />
          <button id="home-findAddressBtn" type="button">Find</button>
          <select id="home-selectedAddress">
            <option value="">Initial</option>
          </select>
        </div>
        <div data-address-component data-name-prefix="work">
          <input id="work-lookupPostcode" />
          <button id="work-findAddressBtn" type="button">Find</button>
          <select id="work-selectedAddress">
            <option value="">Initial</option>
          </select>
        </div>
      `;

      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      initPostcodeLookup();
      const firstCallCount = addEventListenerSpy.mock.calls.length;

      initPostcodeLookup();
      const secondCallCount = addEventListenerSpy.mock.calls.length;

      expect(secondCallCount).toBe(firstCallCount);
    });

    it('handles click events on non-matching elements', () => {
      document.body.innerHTML = `
        <div data-address-component data-name-prefix="home">
          <input id="home-lookupPostcode" />
          <button id="home-findAddressBtn" type="button">Find</button>
          <select id="home-selectedAddress">
            <option value="">Initial</option>
          </select>
        </div>
        <div data-address-component data-name-prefix="work">
          <input id="work-lookupPostcode" />
          <button id="work-findAddressBtn" type="button">Find</button>
          <select id="work-selectedAddress">
            <option value="">Initial</option>
          </select>
        </div>
        <button id="other-button">Other Button</button>
      `;

      setFetch(jest.fn());
      initPostcodeLookup();

      const otherButton = document.getElementById('other-button') as HTMLButtonElement;
      expect(() => otherButton.click()).not.toThrow();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('handles change events on non-matching elements', () => {
      document.body.innerHTML = `
        <div data-address-component data-name-prefix="home">
          <input id="home-lookupPostcode" />
          <button id="home-findAddressBtn" type="button">Find</button>
          <select id="home-selectedAddress">
            <option value="">Initial</option>
          </select>
        </div>
        <div data-address-component data-name-prefix="work">
          <input id="work-lookupPostcode" />
          <button id="work-findAddressBtn" type="button">Find</button>
          <select id="work-selectedAddress">
            <option value="">Initial</option>
          </select>
        </div>
        <select id="other-select">
          <option value="">Other</option>
        </select>
      `;

      initPostcodeLookup();

      const otherSelect = document.getElementById('other-select') as HTMLSelectElement;
      expect(() => {
        otherSelect.dispatchEvent(new Event('change'));
      }).not.toThrow();
    });

    it('handles missing container in event delegation', () => {
      document.body.innerHTML = `
        <button id="orphan-findAddressBtn" type="button">Find</button>
      `;

      setFetch(jest.fn());
      initPostcodeLookup();

      const orphanButton = document.getElementById('orphan-findAddressBtn') as HTMLButtonElement;
      expect(() => orphanButton.click()).not.toThrow();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('handles missing elements in event delegation', () => {
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

    it('handles input events to clear lookup error via event delegation', () => {
      document.body.innerHTML = `
        <div data-address-component data-name-prefix="home">
          <input id="home-lookupPostcode" class="govuk-input--error" />
          <button id="home-findAddressBtn" type="button">Find</button>
          <p class="govuk-error-message" id="home-lookup-postcode-error">Error message</p>
          <select id="home-selectedAddress">
            <option value="">Initial</option>
          </select>
        </div>
        <div data-address-component data-name-prefix="work">
          <input id="work-lookupPostcode" />
          <button id="work-findAddressBtn" type="button">Find</button>
          <select id="work-selectedAddress">
            <option value="">Initial</option>
          </select>
        </div>
      `;

      initPostcodeLookup();

      const homeInput = document.getElementById('home-lookupPostcode') as HTMLInputElement;
      const homeError = document.getElementById('home-lookup-postcode-error') as HTMLParagraphElement;

      expect(homeInput.classList.contains('govuk-input--error')).toBe(true);
      expect(homeError.classList.contains('govuk-visually-hidden')).toBe(false);

      homeInput.dispatchEvent(new Event('input', { bubbles: true }));

      expect(homeInput.classList.contains('govuk-input--error')).toBe(false);
      expect(homeError.classList.contains('govuk-visually-hidden')).toBe(true);
    });

    it('handles input events on non-matching elements via event delegation', () => {
      document.body.innerHTML = `
        <div data-address-component data-name-prefix="home">
          <input id="home-lookupPostcode" class="govuk-input--error" />
          <button id="home-findAddressBtn" type="button">Find</button>
          <p class="govuk-error-message" id="home-lookup-postcode-error">Error message</p>
          <select id="home-selectedAddress">
            <option value="">Initial</option>
          </select>
        </div>
        <div data-address-component data-name-prefix="work">
          <input id="work-lookupPostcode" />
          <button id="work-findAddressBtn" type="button">Find</button>
          <select id="work-selectedAddress">
            <option value="">Initial</option>
          </select>
        </div>
        <input id="other-input" />
      `;

      initPostcodeLookup();

      const otherInput = document.getElementById('other-input') as HTMLInputElement;
      expect(() => {
        otherInput.dispatchEvent(new Event('input', { bubbles: true }));
      }).not.toThrow();
    });

    it('handles input event with missing container via event delegation', () => {
      document.body.innerHTML = `
        <div data-address-component data-name-prefix="home">
          <input id="home-lookupPostcode" />
          <button id="home-findAddressBtn" type="button">Find</button>
          <select id="home-selectedAddress">
            <option value="">Initial</option>
          </select>
        </div>
        <div data-address-component data-name-prefix="work">
          <input id="work-lookupPostcode" />
          <button id="work-findAddressBtn" type="button">Find</button>
          <select id="work-selectedAddress">
            <option value="">Initial</option>
          </select>
        </div>
        <input id="orphan-lookupPostcode" />
      `;

      initPostcodeLookup();

      const orphanInput = document.getElementById('orphan-lookupPostcode') as HTMLInputElement;
      expect(() => {
        orphanInput.dispatchEvent(new Event('input', { bubbles: true }));
      }).not.toThrow();
    });

    it('handles change events to populate address fields via event delegation', () => {
      document.body.innerHTML = `
        <div data-address-component data-name-prefix="home">
          <input id="home-lookupPostcode" />
          <button id="home-findAddressBtn" type="button">Find</button>
          <select id="home-selectedAddress">
            <option value="">Initial</option>
          </select>
          <details id="home-enterManuallyDetails"></details>
          <div id="home-addressForm" class="govuk-visually-hidden">
            <input id="home-addressLine1" />
            <input id="home-addressLine2" />
            <input id="home-town" />
            <input id="home-county" />
            <input id="home-postcode" />
          </div>
        </div>
        <div data-address-component data-name-prefix="work">
          <input id="work-lookupPostcode" />
          <button id="work-findAddressBtn" type="button">Find</button>
          <select id="work-selectedAddress">
            <option value="">Initial</option>
          </select>
        </div>
      `;

      initPostcodeLookup();

      const homeSelect = document.getElementById('home-selectedAddress') as HTMLSelectElement;
      const homeAddressForm = document.getElementById('home-addressForm') as HTMLDivElement;
      const homeEnterManuallyDetails = document.getElementById('home-enterManuallyDetails') as HTMLDetailsElement;
      const homeLine1 = document.getElementById('home-addressLine1') as HTMLInputElement;
      const homeLine1FocusSpy = jest.spyOn(homeLine1, 'focus');

      // Add an address option
      const opt = document.createElement('option');
      opt.value = '0';
      opt.textContent = '123 Main St';
      opt.dataset.line1 = '123 Main St';
      opt.dataset.line2 = 'Suite 100';
      opt.dataset.town = 'London';
      opt.dataset.county = 'Greater London';
      opt.dataset.postcode = 'SW1A 1AA';
      homeSelect.appendChild(opt);

      expect(homeAddressForm.classList.contains('govuk-visually-hidden')).toBe(true);

      homeSelect.selectedIndex = 1;
      homeSelect.dispatchEvent(new Event('change', { bubbles: true }));

      expect(homeLine1.value).toBe('123 Main St');
      expect((document.getElementById('home-addressLine2') as HTMLInputElement).value).toBe('Suite 100');
      expect((document.getElementById('home-town') as HTMLInputElement).value).toBe('London');
      expect((document.getElementById('home-county') as HTMLInputElement).value).toBe('Greater London');
      expect((document.getElementById('home-postcode') as HTMLInputElement).value).toBe('SW1A 1AA');
      expect(homeAddressForm.classList.contains('govuk-visually-hidden')).toBe(false);
      expect(homeEnterManuallyDetails.style.display).toBe('none');
      expect(homeLine1FocusSpy).toHaveBeenCalled();
    });

    it('handles change event with empty value via event delegation', () => {
      document.body.innerHTML = `
        <div data-address-component data-name-prefix="home">
          <input id="home-lookupPostcode" />
          <button id="home-findAddressBtn" type="button">Find</button>
          <select id="home-selectedAddress">
            <option value="">Select an address</option>
          </select>
          <div id="home-addressForm" class="govuk-visually-hidden">
            <input id="home-addressLine1" />
          </div>
        </div>
        <div data-address-component data-name-prefix="work">
          <input id="work-lookupPostcode" />
          <button id="work-findAddressBtn" type="button">Find</button>
          <select id="work-selectedAddress">
            <option value="">Initial</option>
          </select>
        </div>
      `;

      initPostcodeLookup();

      const homeSelect = document.getElementById('home-selectedAddress') as HTMLSelectElement;
      const homeLine1 = document.getElementById('home-addressLine1') as HTMLInputElement;

      expect(() => {
        homeSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }).not.toThrow();

      expect(homeLine1.value).toBe('');
    });

    it('handles toggle events to show address form via event delegation', () => {
      document.body.innerHTML = `
        <div data-address-component data-name-prefix="home">
          <input id="home-lookupPostcode" />
          <button id="home-findAddressBtn" type="button">Find</button>
          <select id="home-selectedAddress">
            <option value="">Initial</option>
          </select>
          <details id="home-enterManuallyDetails">
            <summary>Enter manually</summary>
          </details>
          <div id="home-addressForm" class="govuk-visually-hidden">
            <input id="home-addressLine1" />
          </div>
        </div>
        <div data-address-component data-name-prefix="work">
          <input id="work-lookupPostcode" />
          <button id="work-findAddressBtn" type="button">Find</button>
          <select id="work-selectedAddress">
            <option value="">Initial</option>
          </select>
        </div>
      `;

      initPostcodeLookup();

      const homeDetails = document.getElementById('home-enterManuallyDetails') as HTMLDetailsElement;
      const homeAddressForm = document.getElementById('home-addressForm') as HTMLDivElement;

      expect(homeAddressForm.classList.contains('govuk-visually-hidden')).toBe(true);

      homeDetails.open = true;
      homeDetails.dispatchEvent(new Event('toggle', { bubbles: true }));

      expect(homeAddressForm.classList.contains('govuk-visually-hidden')).toBe(false);
    });

    it('handles toggle event when Details is closed via event delegation', () => {
      document.body.innerHTML = `
        <div data-address-component data-name-prefix="home">
          <input id="home-lookupPostcode" />
          <button id="home-findAddressBtn" type="button">Find</button>
          <select id="home-selectedAddress">
            <option value="">Initial</option>
          </select>
          <details id="home-enterManuallyDetails" open>
            <summary>Enter manually</summary>
          </details>
          <div id="home-addressForm">
            <input id="home-addressLine1" />
          </div>
        </div>
        <div data-address-component data-name-prefix="work">
          <input id="work-lookupPostcode" />
          <button id="work-findAddressBtn" type="button">Find</button>
          <select id="work-selectedAddress">
            <option value="">Initial</option>
          </select>
        </div>
      `;

      initPostcodeLookup();

      const homeDetails = document.getElementById('home-enterManuallyDetails') as HTMLDetailsElement;
      const homeAddressForm = document.getElementById('home-addressForm') as HTMLDivElement;

      homeDetails.open = false;
      homeDetails.dispatchEvent(new Event('toggle', { bubbles: true }));

      // Should not add govuk-visually-hidden when closing
      expect(homeAddressForm.classList.contains('govuk-visually-hidden')).toBe(false);
    });

    it('handles toggle events on non-matching elements via event delegation', () => {
      document.body.innerHTML = `
        <div data-address-component data-name-prefix="home">
          <input id="home-lookupPostcode" />
          <button id="home-findAddressBtn" type="button">Find</button>
          <select id="home-selectedAddress">
            <option value="">Initial</option>
          </select>
          <details id="home-enterManuallyDetails">
            <summary>Enter manually</summary>
          </details>
        </div>
        <div data-address-component data-name-prefix="work">
          <input id="work-lookupPostcode" />
          <button id="work-findAddressBtn" type="button">Find</button>
          <select id="work-selectedAddress">
            <option value="">Initial</option>
          </select>
        </div>
        <details id="other-details">
          <summary>Other</summary>
        </details>
      `;

      initPostcodeLookup();

      const otherDetails = document.getElementById('other-details') as HTMLDetailsElement;
      expect(() => {
        otherDetails.open = true;
        otherDetails.dispatchEvent(new Event('toggle', { bubbles: true }));
      }).not.toThrow();
    });

    it('handles toggle event with missing container via event delegation', () => {
      document.body.innerHTML = `
        <div data-address-component data-name-prefix="home">
          <input id="home-lookupPostcode" />
          <button id="home-findAddressBtn" type="button">Find</button>
          <select id="home-selectedAddress">
            <option value="">Initial</option>
          </select>
        </div>
        <div data-address-component data-name-prefix="work">
          <input id="work-lookupPostcode" />
          <button id="work-findAddressBtn" type="button">Find</button>
          <select id="work-selectedAddress">
            <option value="">Initial</option>
          </select>
        </div>
        <details id="orphan-enterManuallyDetails">
          <summary>Orphan</summary>
        </details>
      `;

      initPostcodeLookup();

      const orphanDetails = document.getElementById('orphan-enterManuallyDetails') as HTMLDetailsElement;
      expect(() => {
        orphanDetails.open = true;
        orphanDetails.dispatchEvent(new Event('toggle', { bubbles: true }));
      }).not.toThrow();
    });

    it('handles toggle event with missing addressForm via event delegation', () => {
      document.body.innerHTML = `
        <div data-address-component data-name-prefix="home">
          <input id="home-lookupPostcode" />
          <button id="home-findAddressBtn" type="button">Find</button>
          <select id="home-selectedAddress">
            <option value="">Initial</option>
          </select>
          <details id="home-enterManuallyDetails">
            <summary>Enter manually</summary>
          </details>
        </div>
        <div data-address-component data-name-prefix="work">
          <input id="work-lookupPostcode" />
          <button id="work-findAddressBtn" type="button">Find</button>
          <select id="work-selectedAddress">
            <option value="">Initial</option>
          </select>
        </div>
      `;

      initPostcodeLookup();

      const homeDetails = document.getElementById('home-enterManuallyDetails') as HTMLDetailsElement;
      expect(() => {
        homeDetails.open = true;
        homeDetails.dispatchEvent(new Event('toggle', { bubbles: true }));
      }).not.toThrow();
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
