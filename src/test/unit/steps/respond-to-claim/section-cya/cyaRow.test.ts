import fs from 'fs';
import path from 'path';

import type { Request } from 'express';
import type { TFunction } from 'i18next';

const LOCALES = path.resolve(__dirname, '../../../../../main/assets/locales');

type Bundle = Record<string, unknown>;

const camelize = (step: string) => step.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

const readBundle = (file: string): Bundle => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {});

const deepMerge = (base: Bundle, override: Bundle): Bundle =>
  Object.entries(override).reduce<Bundle>(
    (acc, [key, value]) => ({
      ...acc,
      [key]:
        value && typeof value === 'object' && acc[key] && typeof acc[key] === 'object'
          ? deepMerge(acc[key] as Bundle, value as Bundle)
          : value,
    }),
    base
  );

// Mirrors the runtime: the citizen file, with the legal rep file merged on top for a legal rep.
let lang = 'cy';
let legalRep = false;
jest.mock('@modules/steps', () => ({
  loadStepNamespaces: jest.fn(),
  getStepTranslations: (_req: Request, step: string, folder: string) => {
    const citizen = readBundle(path.join(LOCALES, lang, folder, `${camelize(step)}.json`));
    return legalRep
      ? deepMerge(citizen, readBundle(path.join(LOCALES, lang, folder, 'legalrep', `${camelize(step)}.json`)))
      : citizen;
  },
}));

import { YES_NO_QUESTION_STEPS, makeYesNoNotSure } from '../../../../../main/steps/respond-to-claim/section-cya/cyaRow';

const sectionT = ((key: string) => `section:${key}`) as unknown as TFunction;
const req = {} as Request;

describe('makeYesNoNotSure', () => {
  afterEach(() => {
    lang = 'cy';
    legalRep = false;
  });

  it.each([
    ['do-you-have-any-dependant-children', 'Oes', 'Nac oes'],
    ['repayments-made', 'Do', 'Naddo'],
    ['defendant-name-confirmation', 'Ie', 'Na'],
    ['correspondence-address', 'Ie', 'Na'],
    ['contact-preferences-telephone', 'Ydw', 'Nac ydw'],
    ['instalment-payments', 'Hoffwn', 'Na hoffwn'],
    ['exceptional-hardship', 'Byddwn', 'Na fyddwn'],
  ])('shows the question page’s Welsh answer for %s', (step, yes, no) => {
    const answer = makeYesNoNotSure(sectionT, false, req);
    expect(answer('YES', step)).toBe(yes);
    expect(answer('No', step)).toBe(no);
  });

  it.each([
    ['instalment-payments', 'Hoffai', 'Na hoffai'],
    ['tenancy-date-details', 'Ydy', 'Nac ydy'],
    ['counter-claim', 'Ydy', 'Nac ydy'],
    ['email-confirmation', 'Ydw', 'Nac ydw'],
  ])('uses the legal rep wording for %s', (step, yes, no) => {
    legalRep = true;
    const answer = makeYesNoNotSure(sectionT, true, req);
    expect(answer('YES', step)).toBe(yes);
    expect(answer('NO', step)).toBe(no);
  });

  it('matches every listed question page in English as Yes / No', () => {
    lang = 'en';
    for (legalRep of [false, true]) {
      const answer = makeYesNoNotSure(sectionT, legalRep, req);
      // Legal-rep-only pages (email confirmation) have no citizen file, so citizens never reach them.
      const steps = YES_NO_QUESTION_STEPS.filter(
        step => legalRep || fs.existsSync(path.join(LOCALES, 'en', 'respondToClaim', `${camelize(step)}.json`))
      );
      for (const step of steps) {
        expect([step, answer('YES', step), answer('NO', step)]).toEqual([step, 'Yes', 'No']);
      }
    }
  });

  it('keeps the section wording for not sure, unlisted steps and rows without a step', () => {
    const answer = makeYesNoNotSure(sectionT, false, req);
    expect(answer('NOT_SURE', 'do-you-have-any-dependant-children')).toBe('section:options.imNotSure');
    expect(answer('YES', 'written-terms')).toBe('section:options.yes');
    expect(answer('YES')).toBe('section:options.yes');
    expect(makeYesNoNotSure(sectionT)('NO', 'repayments-made')).toBe('section:options.no');
  });
});
