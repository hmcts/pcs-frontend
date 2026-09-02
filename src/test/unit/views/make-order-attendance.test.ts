/**
 * @jest-environment jsdom
 */

import * as path from 'path';

import { Environment, FileSystemLoader } from 'nunjucks';

const environment = new Environment(
  new FileSystemLoader([path.resolve('src/main/views'), path.resolve('node_modules/govuk-frontend/dist')]),
  { autoescape: true }
);

describe('make order attendance fields', () => {
  it('gives each attendance row a stable fact-navigation target', () => {
    document.body.innerHTML = environment.render('make-order/_attendance.njk', {
      attendanceParties: [
        { id: 'claimant-1', label: 'First claimant', type: 'claimant' },
        { id: 'defendant-1', label: 'First defendant', type: 'defendant' },
      ],
      draft: {},
    });

    expect(document.querySelector('#claimant-1-attendance input[name="claimant-1-attendance"]')).not.toBeNull();
    expect(document.querySelector('#defendant-1-attendance input[name="defendant-1-attendance"]')).not.toBeNull();
  });
});
