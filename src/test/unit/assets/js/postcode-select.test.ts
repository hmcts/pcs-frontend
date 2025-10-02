/**
 * @jest-environment jest-environment-jsdom
 */

import { initPostcodeSelection } from '../../../../main/assets/js/postcode-select';

describe('initPostcodeSelection', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <select id="selectedAddress">
        <option value="">Select...</option>
        <option value="1"
          data-line1="123 Test St"
          data-line2="Unit 4"
          data-town="Testville"
          data-county="Testshire"
          data-postcode="TE5 7ST"
        >123 Test St</option>
      </select>
      <input id="addressLine1" name="address[addressLine1]" />
      <input id="addressLine2" name="address[addressLine2]" />
      <input id="town" name="address[town]" />
      <input id="county" name="address[county]" />
      <input id="postcode" name="address[postcode]" />
      <details class="govuk-details"></details>
    `;
  });

  it('should populate address fields when an address is selected', () => {
    initPostcodeSelection();

    const select = document.getElementById('selectedAddress') as HTMLSelectElement;
    select.selectedIndex = 1;
    select.dispatchEvent(new Event('change'));

    expect((document.getElementById('addressLine1') as HTMLInputElement).value).toBe('123 Test St');
    expect((document.getElementById('addressLine2') as HTMLInputElement).value).toBe('Unit 4');
    expect((document.getElementById('town') as HTMLInputElement).value).toBe('Testville');
    expect((document.getElementById('county') as HTMLInputElement).value).toBe('Testshire');
    expect((document.getElementById('postcode') as HTMLInputElement).value).toBe('TE5 7ST');
    expect((document.querySelector('.govuk-details') as HTMLDetailsElement).open).toBe(true);
  });
});
