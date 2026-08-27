import * as path from 'path';

import * as nunjucks from 'nunjucks';

import type { FormFieldConfig } from '@modules/steps/formBuilder/formFieldConfig.interface';
import { buildSubFieldsHTML } from '@modules/steps/formBuilder/subFieldsRenderer';

/**
 * Renders components/subFields.njk for real (rather than mocking nunjucks) so the markup of the
 * conditional-reveal wrapper is asserted, not just the arguments passed to render().
 */
describe('subFields.njk conditional reveal wrapper', () => {
  const nunjucksEnv = nunjucks.configure([path.join(__dirname, '../../../../../main/views')], { autoescape: true });

  const subFields = (): Record<string, FormFieldConfig> =>
    ({
      loanPaymentsAmount: {
        name: 'regularExpenses.loanPaymentsAmount',
        type: 'text',
        component: {
          id: 'regularExpenses.loanPaymentsAmount',
          name: 'regularExpenses.loanPaymentsAmount',
          label: { text: 'Amount paid' },
        },
        componentType: 'input',
      },
      loanPaymentsFrequency: {
        name: 'regularExpenses.loanPaymentsFrequency',
        type: 'radio',
        component: {
          id: 'regularExpenses.loanPaymentsFrequency',
          name: 'regularExpenses.loanPaymentsFrequency',
          fieldset: {
            legend: { text: 'How often do you pay loan payments?', classes: 'govuk-visually-hidden' },
          },
          items: [
            { value: 'WEEKLY', text: 'Paid every week' },
            { value: 'MONTHLY', text: 'Paid every month' },
          ],
        },
        componentType: 'radios',
      },
    }) as unknown as Record<string, FormFieldConfig>;

  it('wraps the amount input and the radios in a fieldset with a visually hidden legend', () => {
    const html = buildSubFieldsHTML(subFields(), nunjucksEnv, 'Loan payment details');

    expect(html).toContain('<fieldset class="govuk-fieldset">');
    expect(html).toContain(
      '<legend class="govuk-fieldset__legend govuk-visually-hidden">Loan payment details</legend>'
    );
    expect(html).toContain('</fieldset>');

    // Both controls must sit inside the wrapper, so the group name applies to the amount input too.
    const wrapperStart = html.indexOf('<fieldset class="govuk-fieldset">');
    const wrapperEnd = html.lastIndexOf('</fieldset>');
    const inner = html.slice(wrapperStart, wrapperEnd);
    expect(inner).toContain('regularExpenses.loanPaymentsAmount');
    expect(inner).toContain('regularExpenses.loanPaymentsFrequency');
  });

  it('keeps the per-option radio legend inside the wrapper', () => {
    const html = buildSubFieldsHTML(subFields(), nunjucksEnv, 'Loan payment details');
    expect(html).toContain('How often do you pay loan payments?');
  });

  it('renders no wrapping fieldset when no legend is supplied', () => {
    const withLegend = buildSubFieldsHTML(subFields(), nunjucksEnv, 'Loan payment details');
    const withoutLegend = buildSubFieldsHTML(subFields(), nunjucksEnv);

    const countFieldsets = (html: string): number => (html.match(/<fieldset/g) || []).length;

    // The radios macro always renders its own fieldset; the wrapper adds exactly one more.
    expect(countFieldsets(withoutLegend)).toBe(1);
    expect(countFieldsets(withLegend)).toBe(2);
    expect(withoutLegend).not.toContain('Loan payment details');
    expect(withoutLegend).toContain('regularExpenses.loanPaymentsAmount');
  });

  it('escapes legend text', () => {
    const html = buildSubFieldsHTML(subFields(), nunjucksEnv, 'Fuel, parking & transport details');
    expect(html).toContain('Fuel, parking &amp; transport details');
  });
});
