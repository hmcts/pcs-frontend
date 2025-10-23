import * as path from 'path';

import express from 'express';
import * as nunjucks from 'nunjucks';

import { Nunjucks } from '../../../../main/modules/nunjucks';

describe('home.njk renders personal greeting', () => {
  let env: nunjucks.Environment;

  beforeAll(() => {
    const app = express();
    const nunjucksInstance = new Nunjucks(false);
    nunjucksInstance.enableFor(app);

    const viewsPath = path.join(__dirname, '../../../../main/views');
    env = nunjucks.configure(viewsPath, { autoescape: true });
  });

  it('renders "Hi from Amanda!"', () => {
    const html = env.render('home.njk', { apiResponse: 'Test response' });
    expect(html).toContain('<p>Hi from Amanda!</p>');
  });
});
