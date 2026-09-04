/**
 * @jest-environment jsdom
 */

import * as path from 'path';

import { Environment, FileSystemLoader } from 'nunjucks';

const environment = new Environment(
  new FileSystemLoader([path.resolve('src/main/views'), path.resolve('node_modules/govuk-frontend/dist')]),
  { autoescape: true }
);

describe('free-form order fields', () => {
  it('renders the submitted wording and its GOV.UK error', () => {
    document.body.innerHTML = environment.render('make-order/tabs/_free-form.njk', {
      draftValue: () => 'Submitted wording',
      validationErrors: {
        'free-form-text': { text: 'Enter the order wording' },
      },
    });

    expect(document.querySelector<HTMLTextAreaElement>('#free-form-text')?.value).toBe('Submitted wording');
    expect(document.querySelector('#free-form-text')?.classList).toContain('govuk-textarea--error');
    expect(document.querySelector('#free-form-text-error')?.textContent).toContain('Enter the order wording');
  });
});
