import type { Request } from 'express';
import i18next, { type TFunction } from 'i18next';

import cyChooseAnApplication from '../../../../../main/assets/locales/cy/makeAnApplication/chooseAnApplication.json';
import enChooseAnApplication from '../../../../../main/assets/locales/en/makeAnApplication/chooseAnApplication.json';
import { getTranslation, getTranslationErrors } from'../../../../../main/modules/steps/formBuilder/helpers';
import { step } from '../../../../../main/steps/make-an-application/choose-an-application';

import type { BuiltFormContent, FormBuilderConfig } from '@modules/steps/formBuilder/formFieldConfig.interface';

jest.mock('../../../../../main/modules/steps', () => ({
  ...jest.requireActual('../../../../../main/modules/steps'),
  createFormStep: jest.fn(config => config),
}));

const config = step as unknown as FormBuilderConfig;

function createReq(flag: boolean | undefined): Request {
  return {
    app: {
      locals: {
        launchDarklyClient: {
          variation: jest.fn(async (_key: string, _context: unknown, defaultValue: boolean) => flag ?? defaultValue),
        },
      },
    },
    session: {},
    res: { locals: { step: { journey: 'makeAnApplication' }, validatedCase: { id: '1234567890123456' } } },
  } as unknown as Request;
}

async function translatorFor(language: 'en' | 'cy'): Promise<TFunction> {
  const i18n = i18next.createInstance();
  await i18n.init({
    lng: language,
    fallbackLng: 'en',
    defaultNS: 'chooseAnApplication',
    resources: {
      en: { chooseAnApplication: enChooseAnApplication },
      cy: { chooseAnApplication: cyChooseAnApplication },
    },
  });
  return i18n.getFixedT(language);
}

async function pageText(language: 'en' | 'cy', flag: boolean | undefined): Promise<Record<string, unknown>> {
  const translator = await translatorFor(language);
  const extra = await config.extendGetContent!(createReq(flag), { fields: [] } as BuiltFormContent);
  const text: Record<string, unknown> = {};
  for (const [name, key] of Object.entries(config.translationKeys ?? {})) {
    text[name] = getTranslation(translator, key as string, undefined, extra as Record<string, unknown>);
  }
  return { ...text, ...extra };
}

async function errorText(language: 'en' | 'cy', flag: boolean | undefined): Promise<string | undefined> {
  const translator = await translatorFor(language);
  const extra = await config.extendGetContent!(createReq(flag), { fields: [] } as BuiltFormContent);
  return getTranslationErrors(translator, config.fields, undefined, extra as Record<string, unknown>).typeOfApplication;
}

describe('choose-an-application with defendant-general-applications-r-2 off', () => {
  it.each([false, undefined])('shows the original English page text when the flag is %s', async flag => {
    const page = await pageText('en', flag);

    expect(page.caption).toBe('Make an application');
    expect(page.pageTitle).toBe('Choose an application');
    expect(page.heading).toBe('Choose an application');
  });

  it('tells the defendant they must apply to suspend by post', async () => {
    const page = await pageText('en', false);

    expect(page.showPostOnlyNotice).toBe(true);
    expect(page.noticeText).toBe('You cannot apply to suspend (stop or delay) the eviction online.');
    expect(page.readTheGuidance).toContain('https://www.gov.uk/repossession/delay-eviction');
    expect(page.fillInTheForm).toContain('https://www.gov.uk/government/publications/form-n244-application-notice');
    expect(page.findYourLocalCourt).toContain('https://www.gov.uk/find-court-tribunal');
    expect(page.sendTheFormToTheCourt).toBe('send the completed form to the court, or deliver it by hand');
  });

  it('shows the original Welsh page text and apply-by-post notice', async () => {
    const page = await pageText('cy', false);

    expect(page.caption).toBe('Gwneud cais');
    expect(page.pageTitle).toBe('Dewis cais');
    expect(page.heading).toBe('Dewis cais');
    expect(page.showPostOnlyNotice).toBe(true);
    expect(page.noticeText).toBe('Ni allwch wneud cais i atal (stopio neu ohirio) y troi allan ar-lein.');
    expect(page.noticeTextByPost).toBe('Rhaid i chi wneud cais drwy’r post:');
    expect(page.readTheGuidance).toContain('Darllenwch y canllawiau');
    expect(page.fillInTheForm).toContain('Llenwch y ffurflen N244a');
    expect(page.findYourLocalCourt).toContain('Chwiliwch am fanylion eich llys lleol');
    expect(page.sendTheFormToTheCourt).toBe('Anfonwch y ffurflen wedi’i llenwi i’r llys, neu ei danfon â llaw');
  });

  it.each([
    ['en', 'Choose what you want to apply for'],
    ['cy', 'Dewiswch beth rydych eisiau gwneud cais amdano'],
  ] as const)('shows the original %s error when nothing is selected', async (language, expected) => {
    expect(await errorText(language, false)).toBe(expected);
  });
});

describe('choose-an-application with defendant-general-applications-r-2 on', () => {
  it('shows the R2 English page text without the apply-by-post notice', async () => {
    const page = await pageText('en', true);

    expect(page.caption).toBe('Stop or delay an eviction');
    expect(page.pageTitle).toBe('Choose your application');
    expect(page.heading).toBe('Choose your application');
    expect(page.showPostOnlyNotice).toBe(false);
  });

  it('shows the R2 English error when nothing is selected', async () => {
    expect(await errorText('en', true)).toBe('Please select an application');
  });
});

const R2_KEYS = [
  ['pageTitle_r2', 'Choose your application', 'cy Choose your application'],
  ['caption_r2', 'Stop or delay an eviction', 'cy Stop or delay an eviction'],
  ['heading_r2', 'Choose your application', 'cy Choose your application'],
];
const R2_ERROR_KEYS = [['typeOfApplication_r2', 'Please select an application', 'cy Please select an application']];

describe('choose-an-application Welsh with defendant-general-applications-r-2 on', () => {
  it.each(R2_KEYS)('has an English and a Welsh value for %s', (key, english, welsh) => {
    expect((enChooseAnApplication as Record<string, unknown>)[key]).toBe(english);
    expect((cyChooseAnApplication as Record<string, unknown>)[key]).toBe(welsh);
  });

  it.each(R2_ERROR_KEYS)('has an English and a Welsh error for %s', (key, english, welsh) => {
    expect((enChooseAnApplication.errors as Record<string, unknown>)[key]).toBe(english);
    expect((cyChooseAnApplication.errors as Record<string, unknown>)[key]).toBe(welsh);
  });

  it('shows the Welsh R2 page text without the apply-by-post notice', async () => {
    const page = await pageText('cy', true);

    expect(page.caption).toBe('cy Stop or delay an eviction');
    expect(page.pageTitle).toBe('cy Choose your application');
    expect(page.heading).toBe('cy Choose your application');
    expect(page.showPostOnlyNotice).toBe(false);
  });

  it('shows the Welsh R2 error when nothing is selected', async () => {
    expect(await errorText('cy', true)).toBe('cy Please select an application');
  });
});
