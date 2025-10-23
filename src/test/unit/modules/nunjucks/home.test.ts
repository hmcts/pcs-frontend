import path from 'path';

import express from 'express';
import nunjucks from 'nunjucks';

import { Nunjucks } from '../../../../main/modules/nunjucks';

describe('home.njk renders personal greeting', () => {
  let env: nunjucks.Environment;

  beforeAll(() => {
    const app = express();

    const nunjucksInstance = new Nunjucks(false);
    nunjucksInstance.enableFor(app);

    env = nunjucks.configure([
      path.join(__dirname, '../../../../main/views'),
      path.join(__dirname, '../../../../..', 'node_modules/govuk-frontend/govuk'),
    ], {
      autoescape: true,
      express: app,
    });
  });

  it('renders "Hi from Amanda!"', () => {
    const html = env.render('home.njk', { apiResponse: 'Test response' });
    expect(html).toContain('<p>Hi from Amanda!</p>');
  });
});
