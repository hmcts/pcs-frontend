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
      <input id="${prefix}-lookupPostcode" />
      <button id="${prefix}-findAddressBtn" type="button">Find</button>
      <div id="${prefix}-addressSelectContainer" hidden>
        <select id="${prefix}-selectedAddress">
          <option value="">Initial</option>
        </select>
      </div>
      <details></details>
      <input id="${prefix}-addressLine1" />
      <input id="${prefix}-addressLine2" />
      <input id="${prefix}-addressLine3" />
      <input id="${prefix}-town" />
      <input id="${prefix}-county" />
      <input id="${prefix}-postcode" />
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
        addressLine3: '',
        town: 'London',
        county: 'Greater London',
        postcode: 'SW1A 2AA',
      },
      {
        fullAddress: '11 Downing Street, London, SW1A 2AB',
        addressLine1: '11 Downing Street',
        addressLine2: '',
        addressLine3: '',
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

  it('populates fields and opens details on selection change (via postcode-select)', () => {
    document.body.innerHTML = buildComponent();
    initPostcodeLookup();
    initPostcodeSelection();

    const select = document.getElementById('address-selectedAddress') as HTMLSelectElement;
    const details = document.querySelector('details') as HTMLDetailsElement;
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

    expect(details.open).toBe(false);
    select.selectedIndex = 0;
    select.dispatchEvent(new Event('change'));

    expect(line1.value).toBe('1 Main St');
    expect((document.getElementById('address-addressLine2') as HTMLInputElement).value).toBe('Area');
    expect((document.getElementById('address-addressLine3') as HTMLInputElement).value).toBe('Locality');
    expect((document.getElementById('address-town') as HTMLInputElement).value).toBe('Townsville');
    expect((document.getElementById('address-county') as HTMLInputElement).value).toBe('Countyshire');
    expect((document.getElementById('address-postcode') as HTMLInputElement).value).toBe('AB1 2CD');
    expect(details.open).toBe(true);
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
});
