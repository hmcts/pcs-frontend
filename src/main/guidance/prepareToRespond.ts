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

/** The first usable string, so `?lang=cy&lang=en` and a missing value behave as they do in the i18n module. */
const firstString = (value: unknown): string | undefined => {
  const candidate = Array.isArray(value) ? value[0] : value;
  return typeof candidate === 'string' && candidate.trim() !== '' ? candidate.toLowerCase().trim() : undefined;
};

/**
 * The guide is mounted before the i18n middleware, so it resolves the language itself, in that middleware's order:
 * the query string, then the `lang` cookie the rest of the service caches the choice in. Without the cookie, someone
 * who chose Welsh elsewhere in the service would arrive here in English.
 */
function guideLanguage(queryLang: unknown, cookieLang: unknown): AllowedLang {
  const requested = firstString(queryLang) ?? firstString(cookieLang);
  return requested === 'cy' ? 'cy' : 'en';
}

export function prepareToRespondPage(queryLang: unknown, cookieLang?: unknown): Record<string, unknown> {
  const lang = guideLanguage(queryLang, cookieLang);
  const t: TFunction = i18next.getFixedT(lang, [NAMESPACE, 'common']);

  const sections = GUIDE_SECTIONS.map(({ key }, index) => ({
    heading: t('stepHeading', { number: index + 1, title: t(`sections.${key}.title`) }),
    content: t(`sections.${key}.content`, { returnObjects: true }) as ContentBlock[],
  }));

  return {
    t,
    lang,
    htmlLang: lang,
    showLanguageToggle: true,
    respondOnlineUrl: RESPOND_ONLINE_PATH,
    sectionCount: t('sectionCount', { number: sections.length }),
    sections,
  };
}
