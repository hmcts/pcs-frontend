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
          data-line3="Test Estate"
          data-town="Testville"
          data-county="Testshire"
          data-postcode="TE5 7ST"
        >123 Test St</option>
      </select>
      <input id="addressLine1" />
      <input id="addressLine2" />
      <input id="addressLine3" />
      <input id="town" />
      <input id="county" />
      <input id="postcode" />
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
    expect((document.getElementById('addressLine3') as HTMLInputElement).value).toBe('Test Estate');
    expect((document.getElementById('town') as HTMLInputElement).value).toBe('Testville');
    expect((document.getElementById('county') as HTMLInputElement).value).toBe('Testshire');
    expect((document.getElementById('postcode') as HTMLInputElement).value).toBe('TE5 7ST');
    expect((document.querySelector('.govuk-details') as HTMLDetailsElement).open).toBe(true);
  });
});
