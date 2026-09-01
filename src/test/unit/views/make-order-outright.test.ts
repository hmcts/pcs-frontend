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

function renderOutright(draft: Draft = {}): void {
  document.body.innerHTML = environment.render('make-order/tabs/_outright.njk', {
    draftValue: (name: string) => draft[name],
    draftChecked: (name: string, value: string) => {
      const savedValue = draft[name];
      return Array.isArray(savedValue) ? savedValue.includes(value) : savedValue === value;
    },
    draftDate: (prefix: string) => ['day', 'month', 'year'].map(name => ({ name, value: draft[`${prefix}-${name}`] })),
    draftSelect: (items: Record<string, unknown>[], name: string) =>
      items.map(item => ({ ...item, selected: item.value === draft[name] })),
  });
}

function checkbox(name: string, value: string): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>(`input[name="${name}"][value="${value}"]`);
  expect(input).not.toBeNull();
  return input!;
}

function controlledPanel(input: HTMLInputElement): HTMLElement {
  const panelId = input.dataset.ariaControls;
  expect(panelId).toBeTruthy();
  const panel = document.getElementById(panelId!);
  expect(panel).not.toBeNull();
  return panel!;
}

describe('outright possession money judgment', () => {
  it('renders the target hierarchy as nested conditional choices', () => {
    renderOutright();

    const moneyJudgment = checkbox('outright-options', 'money-judgment');
    const arrears = checkbox('outright-mj-sections', 'arrears');
    const paymentPlan = checkbox('outright-mj-sections', 'payment-plan');
    const lumpPayment = checkbox('outright-mj-plan', 'lump');
    const balance = checkbox('outright-mj-balance', 'yes');
    const instalments = checkbox('outright-mj-plan', 'instalments');

    expect(controlledPanel(moneyJudgment).contains(arrears)).toBe(true);
    expect(controlledPanel(moneyJudgment).contains(paymentPlan)).toBe(true);
    expect(controlledPanel(arrears).contains(document.getElementById('outright-mj-arrears'))).toBe(true);
    expect(controlledPanel(paymentPlan).contains(lumpPayment)).toBe(true);
    expect(controlledPanel(paymentPlan).contains(instalments)).toBe(true);
    expect(controlledPanel(lumpPayment).contains(balance)).toBe(true);
    expect(controlledPanel(balance).contains(document.getElementById('outright-mj-balance-date'))).toBe(true);
    expect(controlledPanel(instalments).contains(document.getElementById('outright-mj-inst-date'))).toBe(true);
  });

  it('defaults instalment frequency to monthly', () => {
    renderOutright();

    expect(document.querySelector<HTMLSelectElement>('#outright-mj-inst-freq')?.value).toBe('monthly');
  });

  it('does not restore unchecked sections from stale child values', () => {
    renderOutright({
      'outright-options': 'money-judgment',
      'outright-mj-arrears': '1000',
      'outright-mj-plan': ['lump', 'instalments'],
      'outright-mj-balance-date-day': '30',
    });

    expect(checkbox('outright-mj-sections', 'arrears').checked).toBe(false);
    expect(checkbox('outright-mj-sections', 'payment-plan').checked).toBe(false);
    expect(checkbox('outright-mj-balance', 'yes').checked).toBe(false);
  });
});
