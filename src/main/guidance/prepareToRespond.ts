import i18next, { type TFunction } from 'i18next';

import type { RespondToClaimSectionId } from '../steps/respond-to-claim/sections.config';

import type { AllowedLang } from '@modules/i18n';

/** The address printed on defendants' letters and linked from the service: keep it stable. */
export const PREPARE_TO_RESPOND_PATH = '/guidance/respond-to-a-possession-claim';

export const NAMESPACE = 'prepareToRespond';

/** Where the guide sends people when they are ready to respond: signing in, then their claim number and access code. */
const RESPOND_ONLINE_PATH = '/access-your-case';

type ContentBlock = { text: string } | { items: string[] };

/**
 * The guide's sections in the order it shows them, with the respond-to-claim sections each describes. The guide
 * groups topics for people preparing, so this is not one-to-one with the journey: it is a pointer for whoever
 * changes those sections to check the guide's wording still holds.
 */
export const GUIDE_SECTIONS = [
  { key: 'yourDetails', describes: ['personalDetails'] },
  { key: 'tenancy', describes: ['disputeAndTenancy'] },
  { key: 'payments', describes: ['payments'] },
  { key: 'household', describes: ['situationAndCircumstances'] },
  { key: 'incomeAndExpenses', describes: ['incomeAndExpenditure', 'uploadFiles'] },
  { key: 'disputing', describes: ['disputeAndTenancy'] },
  { key: 'counterclaim', describes: ['disputeAndTenancy'] },
  { key: 'support', describes: ['yourSupport'] },
  { key: 'checkYourAnswers', describes: ['checkYourAnswersAndSubmit'] },
] as const satisfies readonly { key: string; describes: readonly RespondToClaimSectionId[] }[];

/**
 * Welsh is offered once the Welsh Language Unit's translation has replaced every "cy" placeholder in the cy locale
 * (see localeParity.test.ts); until then the guide is English only, rather than a mix of the two.
 */
export function welshAvailable(): boolean {
  const welsh = i18next.getResourceBundle('cy', NAMESPACE);
  return Boolean(welsh) && !hasPlaceholder(i18next.getResourceBundle('en', NAMESPACE), welsh);
}

function hasPlaceholder(english: unknown, welsh: unknown): boolean {
  if (typeof english === 'string') {
    return welsh === `cy${english}`;
  }
  return Object.entries(english as object).some(([key, value]) =>
    hasPlaceholder(value, (welsh as Record<string, unknown> | undefined)?.[key])
  );
}

function language(requested: unknown): AllowedLang {
  return requested === 'cy' && welshAvailable() ? 'cy' : 'en';
}

export function prepareToRespondPage(requestedLang: unknown): Record<string, unknown> {
  const lang = language(requestedLang);
  const t: TFunction = i18next.getFixedT(lang, [NAMESPACE, 'common']);

  const sections = GUIDE_SECTIONS.map(({ key }, index) => ({
    heading: t('stepHeading', { number: index + 1, title: t(`sections.${key}.title`) }),
    content: t(`sections.${key}.content`, { returnObjects: true }) as ContentBlock[],
  }));

  return {
    t,
    lang,
    htmlLang: lang,
    showLanguageToggle: welshAvailable(),
    respondOnlineUrl: RESPOND_ONLINE_PATH,
    sectionCount: t('sectionCount', { count: sections.length }),
    sections,
  };
}
