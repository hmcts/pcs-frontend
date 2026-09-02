/**
 * @jest-environment jsdom
 */

import * as path from 'path';

import { Environment, FileSystemLoader } from 'nunjucks';

type Draft = Record<string, string | string[] | undefined>;

const environment = new Environment(
  new FileSystemLoader([path.resolve('src/main/views'), path.resolve('node_modules/govuk-frontend/dist')]),
  { autoescape: true }
);

function renderSuspended(draft: Draft = {}): void {
  document.body.innerHTML = environment.render('make-order/tabs/_suspended.njk', {
    draftValue: (name: string) => draft[name],
    draftChecked: (name: string, value: string) => {
      const savedValue = draft[name];
      return Array.isArray(savedValue) ? savedValue.includes(value) : savedValue === value;
    },
    draftDate: (prefix: string) => ['day', 'month', 'year'].map(name => ({ name, value: draft[`${prefix}-${name}`] })),
    draftSelect: (items: Record<string, unknown>[], name: string, defaultValue?: string) =>
      items.map(item => ({ ...item, selected: item.value === (draft[name] ?? defaultValue) })),
  });
}

describe('suspended possession order fields', () => {
  it('renders the CaseMan sentence wording and options', () => {
    renderSuspended();

    const text = document.body.textContent?.replace(/\s+/g, ' ').trim();
    expect(text).toContain('Suspended on condition of payment of current rent plus arrears of');
    expect(text).toContain('to be paid by');
    expect(document.querySelector('#suspended-arrears')?.parentElement?.textContent).toContain('£');
    expect(text).toContain('Payment of');
    expect(text).toContain('Payments of');
    expect(text).toContain('with the first payment by');
    expect(text).toContain('Money judgment for the arrears above');
    expect(text).toContain('Money claim adjourned generally with liberty to restore');
    expect(text).toContain(
      'Any application for a warrant of eviction must be made and heard on notice to all parties unless the court orders otherwise'
    );
    expect(text).not.toContain('A single payment');
    expect(text).not.toContain('Instalment payments');
    expect(document.querySelector<HTMLSelectElement>('#suspended-instalment-frequency')?.value).toBe('monthly');
    expect(document.querySelector('#suspended-oneoff-amount')?.closest('[hidden]')).toBeNull();
    expect(document.querySelector('label[for="suspended-payment-terms"]')?.textContent).toContain('a one-off amount');
  });

  it('provides separate amount fields for same-terms costs', () => {
    document.body.innerHTML = environment.render('make-order/_costs.njk', {
      draftOrderType: 'SUSPENDED_POSSESSION',
      draftValue: (name: string) =>
        ({
          'costs-fixed-same-terms-amount': '125',
          'costs-summary-same-terms-amount': '175',
        })[name],
      draftChecked: (_name: string, value: string) => value === 'fixed-same-terms',
    });

    expect(document.querySelector<HTMLInputElement>('#costs-fixed-same-terms-amount')?.value).toBe('125');
    expect(document.querySelector<HTMLInputElement>('#costs-summary-same-terms-amount')?.value).toBe('175');
  });

  it('restores payment choices and only enables same terms for a money judgment', () => {
    renderSuspended({
      'suspended-payment-terms': ['one-off', 'instalments'],
      'suspended-options': 'money-judgment-arrears',
      'suspended-mj-same-terms': 'yes',
      'suspended-instalment-frequency': 'weekly',
    });

    expect(document.querySelector<HTMLInputElement>('input[value="one-off"]')?.checked).toBe(true);
    expect(document.querySelector<HTMLInputElement>('input[value="instalments"]')?.checked).toBe(true);
    expect(document.querySelector<HTMLSelectElement>('#suspended-instalment-frequency')?.value).toBe('weekly');
    expect(document.querySelector<HTMLInputElement>('#suspended-mj-same-terms')?.disabled).toBe(false);

    renderSuspended();
    expect(document.querySelector<HTMLInputElement>('#suspended-mj-same-terms')?.disabled).toBe(true);
  });
});
