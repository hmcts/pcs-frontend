import type { Request } from 'express';
import type { TFunction } from 'i18next';

import type { CcdCaseModel } from '@services/ccdCaseData.model';

const SECTION_ID = 'personalDetails';

export type SummaryListRow = {
  key: { text: string };
  value: { text: string };
  actions: { items: { href: string; text: string; visuallyHiddenText: string }[] };
};

type Address = {
  AddressLine1?: string;
  AddressLine2?: string;
  AddressLine3?: string;
  PostTown?: string;
  County?: string;
  PostCode?: string;
  Country?: string;
};

function formatAddress(addr?: Address): string {
  if (!addr) {
    return '';
  }
  return [addr.AddressLine1, addr.AddressLine2, addr.AddressLine3, addr.PostTown, addr.County, addr.PostCode]
    .filter((s): s is string => Boolean(s && s.trim()))
    .join(', ');
}

function formatDob(iso?: string): string {
  if (!iso) {
    return '';
  }
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) {
    return iso;
  }
  return `${parseInt(day, 10)} ${parseInt(month, 10)} ${year}`;
}

export function buildSectionCyaRows(req: Request, t: TFunction): SummaryListRow[] {
  const validatedCase = req.res?.locals.validatedCase as CcdCaseModel | undefined;
  const caseRef = (validatedCase as unknown as { id?: string })?.id;
  if (!validatedCase || !caseRef) {
    return [];
  }

  // Use flattened getters from CcdCaseModel — single source of truth.
  const nameConfirmation = validatedCase.defendantResponsesDefendantNameConfirmation;
  const partyName = validatedCase.defendantContactDetailsPartyName;
  const claimDefendantName = validatedCase.claimantEnteredDefendantDetailsName;
  const claimNameKnown = validatedCase.claimantEnteredDefendantDetailsNameKnown;
  const dateOfBirth = validatedCase.defendantResponsesDateOfBirth;

  // correspondenceAddressConfirmation has no flattened getter — read from the deep path.
  const correspondenceAddressConfirmation = validatedCase.defendantResponses?.correspondenceAddressConfirmation;
  const propertyAddress = formatAddress(validatedCase.propertyAddress as Address | undefined);
  const partyAddress = formatAddress(validatedCase.defendantContactDetailsPartyAddress as Address | undefined);

  const contactByEmail = validatedCase.defendantResponsesContactByEmail;
  const contactByPost = validatedCase.defendantResponsesContactByPost;
  const contactByPhone = validatedCase.defendantResponsesContactByPhone;
  const contactByText = validatedCase.defendantResponsesContactByText;
  const phoneNumber = validatedCase.defendantContactDetailsPartyPhoneNumber;
  const emailAddress = validatedCase.defendantContactDetailsPartyEmailAddress;

  const change = (stepSlug: string, hiddenKey: string) => ({
    href: `/case/${caseRef}/respond-to-claim/${stepSlug}?edit=${SECTION_ID}`,
    text: t('change'),
    visuallyHiddenText: t(hiddenKey),
  });

  const rows: SummaryListRow[] = [];

  // Branch 1: claim recorded the defendant name → user CONFIRMED it (yes/no)
  if (nameConfirmation && claimDefendantName) {
    rows.push({
      key: { text: t('rows.defendantNameConfirmation.label', { name: claimDefendantName }) },
      value: { text: t(`options.${nameConfirmation}`) },
      actions: {
        items: [change('defendant-name-confirmation', 'rows.defendantNameConfirmation.changeHidden')],
      },
    });
  } else if (claimNameKnown === 'NO' && partyName?.trim()) {
    // Branch 2: claim's defendant name was unknown → user CAPTURED their name
    rows.push({
      key: { text: t('rows.defendantName.label') },
      value: { text: partyName.trim() },
      actions: { items: [change('defendant-name-capture', 'rows.defendantName.changeHidden')] },
    });
  }

  if (dateOfBirth) {
    rows.push({
      key: { text: t('rows.dateOfBirth.label') },
      value: { text: formatDob(dateOfBirth) },
      actions: { items: [change('defendant-date-of-birth', 'rows.dateOfBirth.changeHidden')] },
    });
  }

  if (correspondenceAddressConfirmation) {
    // Question shows the address being confirmed (the existing/property address).
    // If user said NO and provided a corrected address, show that as the value;
    // otherwise show the YES/NO answer.
    const addressInQuestion = propertyAddress || partyAddress;
    const value =
      correspondenceAddressConfirmation === 'NO' && partyAddress
        ? partyAddress
        : t(`options.${correspondenceAddressConfirmation}`);
    rows.push({
      key: {
        text: addressInQuestion
          ? t('rows.correspondenceAddressConfirmation.label', { address: addressInQuestion })
          : t('rows.correspondenceAddressConfirmation.fallbackLabel'),
      },
      value: { text: value },
      actions: {
        items: [change('correspondence-address', 'rows.correspondenceAddressConfirmation.changeHidden')],
      },
    });
  }

  // Email / Post — single combined row showing the methods chosen.
  if (contactByEmail || contactByPost) {
    const methods: string[] = [];
    if (contactByEmail === 'YES') {
      methods.push(
        emailAddress
          ? `${t('rows.contactByEmailOrPost.options.email')} (${emailAddress})`
          : t('rows.contactByEmailOrPost.options.email')
      );
    }
    if (contactByPost === 'YES') {
      methods.push(t('rows.contactByEmailOrPost.options.post'));
    }
    rows.push({
      key: { text: t('rows.contactByEmailOrPost.label') },
      value: { text: methods.length ? methods.join(', ') : t('rows.contactByEmailOrPost.options.none') },
      actions: {
        items: [change('contact-preferences-email-or-post', 'rows.contactByEmailOrPost.changeHidden')],
      },
    });
  }

  // Phone — its own row. Value is the number when YES, otherwise the No answer.
  if (contactByPhone) {
    const value = contactByPhone === 'YES' && phoneNumber?.trim() ? phoneNumber.trim() : t(`options.${contactByPhone}`);
    rows.push({
      key: { text: t('rows.contactByPhone.label') },
      value: { text: value },
      actions: {
        items: [change('contact-preferences-telephone', 'rows.contactByPhone.changeHidden')],
      },
    });
  }

  // Text — only displayed when phone is YES (matches contact-preferences-text-message
  // showCondition AND the contact-preferences normaliser, which drops contactByText
  // when contactByPhone !== 'YES').
  if (contactByPhone === 'YES' && contactByText) {
    rows.push({
      key: { text: t('rows.contactByText.label') },
      value: { text: t(`options.${contactByText}`) },
      actions: {
        items: [change('contact-preferences-text-message', 'rows.contactByText.changeHidden')],
      },
    });
  }

  return rows;
}
