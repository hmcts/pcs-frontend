import * as path from 'path';

import * as nunjucks from 'nunjucks';

import type { FormFieldConfig } from '@modules/steps/formBuilder/formFieldConfig.interface';
import { buildSubFieldsHTML } from '@modules/steps/formBuilder/subFieldsRenderer';

describe('subFields.njk conditional reveal wrapper', () => {
  const nunjucksEnv = nunjucks.configure([path.join(__dirname, '../../../../../main/views')], { autoescape: true });

  const subFields: Record<string, FormFieldConfig> = {
    loanPaymentsAmount: {
      name: 'regularExpenses.loanPaymentsAmount',
      type: 'text',
      component: { id: 'regularExpenses.loanPaymentsAmount', name: 'regularExpenses.loanPaymentsAmount', label: { text: 'Amount paid' } },
      componentType: 'input',
    },
    loanPaymentsFrequency: {
      name: 'regularExpenses.loanPaymentsFrequency',
      type: 'radio',
      component: {
        id: 'regularExpenses.loanPaymentsFrequency',
        name: 'regularExpenses.loanPaymentsFrequency',
        fieldset: { legend: { text: 'How often do you pay loan payments?', classes: 'govuk-visually-hidden' } },
        items: [
          { value: 'WEEKLY', text: 'Paid every week' },
          { value: 'MONTHLY', text: 'Paid every month' },
        ],
      },
      componentType: 'radios',
    },
  } as unknown as Record<string, FormFieldConfig>;

  it('wraps subfields in a fieldset with visually hidden legend when legend is provided', () => {
    const html = buildSubFieldsHTML(subFields, nunjucksEnv, 'Loan payment details');

    expect(html).toContain('<legend class="govuk-fieldset__legend govuk-visually-hidden">Loan payment details</legend>');
    expect(html).toContain('regularExpenses.loanPaymentsAmount');
    expect(html).toContain('regularExpenses.loanPaymentsFrequency');
    expect(html).toContain('How often do you pay loan payments?');
  });

  it('renders no wrapper fieldset when no legend is supplied', () => {
    const withLegend = buildSubFieldsHTML(subFields, nunjucksEnv, 'Loan payment details');
    const withoutLegend = buildSubFieldsHTML(subFields, nunjucksEnv);

    expect(withLegend.match(/<fieldset/g) || []).toHaveLength(2);
    expect(withoutLegend.match(/<fieldset/g) || []).toHaveLength(1);
    expect(withoutLegend).not.toContain('Loan payment details');
  });

  it('escapes legend text', () => {
    const html = buildSubFieldsHTML(subFields, nunjucksEnv, 'Fuel & transport');
    expect(html).toContain('Fuel &amp; transport');
  });
});
