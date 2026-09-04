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

function renderAdjournment(draft: Draft = {}): void {
  document.body.innerHTML = environment.render('make-order/tabs/_adjournment.njk', {
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

describe('adjournment order fields', () => {
  it('uses the reference defaults without selecting an adjournment type', () => {
    renderAdjournment();

    expect(document.querySelector<HTMLInputElement>('input[name="adj-type"]:checked')).toBeNull();
    expect(document.querySelector<HTMLInputElement>('input[name="adj-when"][value="next-list"]')?.checked).toBe(true);
    expect(document.querySelector<HTMLSelectElement>('#adj-time-estimate-unit')?.value).toBe('minutes');
    expect(document.querySelector<HTMLInputElement>('input[name="adj-format"][value="in-person"]')?.checked).toBe(true);
    expect(document.querySelector('#adj-hearing-date #adj-hearing-date-day')).not.toBeNull();
    expect(document.querySelector('#adj-time-estimate-group #adj-time-estimate-unit')).not.toBeNull();
    expect(document.querySelector('#adj-format-group input[name="adj-format"]')).not.toBeNull();
    expect(document.querySelector<HTMLSelectElement>('#adj-gen-current-rent-plus-frequency')?.value).toBe('monthly');
    expect(document.querySelector<HTMLSelectElement>('#adj-gen-payments-frequency')?.value).toBe('monthly');
  });

  it('restores saved choices and values', () => {
    renderAdjournment({
      'adj-type': 'further-hearing',
      'adj-when': 'specific',
      'adj-hearing-date-day': '21',
      'adj-time-estimate-unit': 'hours',
      'adj-format': ['video', 'telephone'],
      'adj-gen-current-rent-plus-frequency': 'weekly',
    });

    expect(document.querySelector<HTMLInputElement>('input[name="adj-type"][value="further-hearing"]')?.checked).toBe(
      true
    );
    expect(document.querySelector<HTMLInputElement>('input[name="adj-when"][value="specific"]')?.checked).toBe(true);
    expect(document.querySelector<HTMLInputElement>('#adj-hearing-date-day')?.value).toBe('21');
    expect(document.querySelector<HTMLSelectElement>('#adj-time-estimate-unit')?.value).toBe('hours');
    expect(document.querySelector<HTMLInputElement>('input[name="adj-format"][value="in-person"]')?.checked).toBe(
      false
    );
    expect(document.querySelector<HTMLInputElement>('input[name="adj-format"][value="video"]')?.checked).toBe(true);
    expect(document.querySelector<HTMLSelectElement>('#adj-gen-current-rent-plus-frequency')?.value).toBe('weekly');
  });
});
