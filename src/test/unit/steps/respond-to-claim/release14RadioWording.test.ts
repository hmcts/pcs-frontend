import type { TFunction } from 'i18next';
import type { Environment } from 'nunjucks';

import { buildFormContent } from '@modules/steps/formBuilder/formContent';
import type { FormFieldConfig } from '@modules/steps/formBuilder/formFieldConfig.interface';

const copy: Record<string, string> = {
  frequencyQuestion: 'How often do you pay towards your priority debts?',
  previousFrequencyQuestion: 'Paid every:',
  'frequency.week': 'Paid every week',
  'frequency.month': 'Paid every month',
  'previousFrequency.week': 'Week',
  'previousFrequency.month': 'Month',
  'frequencyLegend.loanPayments': 'How often do you pay loan payments?',
  'subFields.amount': 'Amount paid',
  'subFields.frequency': 'Paid every:',
  'subFieldsLegend.loanPayments': 'Loan payment details',
  'buttons.saveAndContinue': 'Save and continue',
  'buttons.continue': 'Continue',
  'buttons.saveForLater': 'Save for later',
};

const fields: FormFieldConfig[] = [
  {
    name: 'priorityDebtTotal',
    type: 'text',
    translationKey: { label: 'totalQuestion' },
  },
  {
    name: 'priorityDebtContributionFrequency',
    type: 'radio',
    legendClasses: 'govuk-visually-hidden',
    translationKey: { label: 'frequencyQuestion' },
    options: [
      { value: 'weekly', translationKey: 'frequency.week' },
      { value: 'monthly', translationKey: 'frequency.month' },
    ],
  },
  {
    name: 'regularExpenses',
    type: 'checkbox',
    legendClasses: 'govuk-fieldset__legend--m',
    translationKey: { label: 'expenseQuestion' },
    options: [
      {
        value: 'loanPayments',
        subFieldsLegendKey: 'subFieldsLegend.loanPayments',
        subFields: {
          loanPaymentsAmount: {
            name: 'loanPaymentsAmount',
            type: 'text',
            translationKey: { label: 'subFields.amount' },
          },
          loanPaymentsFrequency: {
            name: 'loanPaymentsFrequency',
            type: 'radio',
            legendClasses: 'govuk-visually-hidden',
            translationKey: { label: 'frequencyLegend.loanPayments' },
            options: [
              { value: 'WEEKLY', translationKey: 'frequency.week' },
              { value: 'MONTHLY', translationKey: 'frequency.month' },
            ],
          },
        },
      },
    ],
  },
];

function legend(field: FormFieldConfig) {
  const component = field.component as {
    fieldset?: { legend?: { text?: string; classes?: string } };
    items?: { text?: string; conditional?: { html?: string } }[];
  };
  return component;
}

describe('release 1.4 radio wording', () => {
  const t = ((key: string) => copy[key] ?? key) as unknown as TFunction;
  let render: jest.Mock;

  beforeEach(() => {
    render = jest.fn(() => '<div></div>');
  });

  function content(release14On: boolean) {
    return buildFormContent(
      fields,
      t,
      {},
      {},
      undefined,
      { render } as unknown as Environment,
      release14On ? undefined : { release14RadioWording: false }
    );
  }

  it('uses the new wording when release 1.4 is on', () => {
    const [, debt, expenses] = content(true).fields;

    expect(legend(debt).fieldset?.legend).toMatchObject({
      text: 'How often do you pay towards your priority debts?',
      classes: 'govuk-visually-hidden',
    });
    expect(legend(debt).items?.map(item => item.text)).toEqual(['Paid every week', 'Paid every month']);
    expect(render).toHaveBeenCalledWith(
      'components/subFields.njk',
      expect.objectContaining({ legend: 'Loan payment details' })
    );
    expect(legend(expenses).fieldset?.legend?.classes).toBe('govuk-fieldset__legend--m');
  });

  it('uses the previous wording when release 1.4 is off', () => {
    const [, debt, expenses] = content(false).fields;
    const revealed = legend(expenses).items?.[0]?.conditional?.html;

    expect(legend(debt).fieldset?.legend).toMatchObject({ text: 'Paid every:', classes: '' });
    expect(legend(debt).items?.map(item => item.text)).toEqual(['Week', 'Month']);
    expect(render).toHaveBeenCalledWith('components/subFields.njk', expect.objectContaining({ legend: undefined }));
    expect(revealed).toBe('<div></div>');
    expect(legend(expenses).fieldset?.legend?.classes).toBe('govuk-fieldset__legend--m');
  });
});
