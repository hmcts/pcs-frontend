import escapeHtml from 'escape-html';
import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { formatIsoDate } from '../../utils';
import { type SummaryListRow, getValidatedCase, makeChange } from '../section-cya/cyaRow';
import type { RespondToClaimSectionId } from '../sections.config';

const SECTION_ID: RespondToClaimSectionId = 'personalDetails';

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

// GDS pattern: single value as text, multiple values as a bullet-less list
// rendered with class govuk-list (matches the existing make-an-application
// CYA escape-then-render approach). Inputs that may carry user-supplied
// content (email address, phone number) are escaped via escape-html.
function multiSelectValue(
  items: string[],
  userSuppliedItems: Set<string> = new Set()
): { text?: string; html?: string } {
  if (items.length === 0) {
    return { text: '' };
  }
  if (items.length === 1) {
    const item = items[0];
    return userSuppliedItems.has(item) ? { html: escapeHtml(item) } : { text: item };
  }
  const lis = items.map(item => `<li>${userSuppliedItems.has(item) ? escapeHtml(item) : item}</li>`).join('\n');
  return { html: `<ul class="govuk-list">\n${lis}\n</ul>` };
}

export function buildSectionCyaRows(req: Request, t: TFunction): SummaryListRow[] {
  const validatedCase = getValidatedCase(req);
  const caseRef = validatedCase?.id;
  if (!validatedCase || !caseRef) {
    return [];
  }

  // Use flattened getters from CcdCaseModel — single source of truth.
  const nameConfirmation = validatedCase.defendantResponsesDefendantNameConfirmation;
  const partyName = validatedCase.defendantContactDetailsPartyName;
  const claimDefendantName = validatedCase.claimantEnteredDefendantDetailsName;
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

  const change = makeChange(caseRef, SECTION_ID, t);

  const rows: SummaryListRow[] = [];

  // Branch 1: claim recorded the defendant name → user CONFIRMED it (yes/no).
  if (nameConfirmation && claimDefendantName) {
    rows.push({
      key: { text: t('rows.defendantNameConfirmation.label', { name: claimDefendantName }) },
      value: { text: t(`options.${nameConfirmation}`) },
      actions: {
        items: [change('defendant-name-confirmation', 'rows.defendantNameConfirmation.changeHidden')],
      },
    });
  } else if (partyName?.trim()) {
    // Branch 2: user CAPTURED their name via defendant-name-capture (showCondition: nameKnown !== 'YES').
    rows.push({
      key: { text: t('rows.defendantName.label') },
      value: { html: escapeHtml(partyName.trim()) },
      actions: { items: [change('defendant-name-capture', 'rows.defendantName.changeHidden')] },
    });
  }

  if (dateOfBirth) {
    rows.push({
      key: { text: t('rows.dateOfBirth.label') },
      value: { text: formatIsoDate(dateOfBirth) },
      actions: { items: [change('defendant-date-of-birth', 'rows.dateOfBirth.changeHidden')] },
    });
  }

  if (correspondenceAddressConfirmation) {
    const addressInQuestion = propertyAddress || partyAddress;
    const value: { text?: string; html?: string } =
      correspondenceAddressConfirmation === 'NO' && partyAddress
        ? { html: escapeHtml(partyAddress) }
        : { text: t(`options.${correspondenceAddressConfirmation}`) };
    rows.push({
      key: {
        text: addressInQuestion
          ? t('rows.correspondenceAddressConfirmation.label', { address: addressInQuestion })
          : t('rows.correspondenceAddressConfirmation.fallbackLabel'),
      },
      value,
      actions: {
        items: [change('correspondence-address', 'rows.correspondenceAddressConfirmation.changeHidden')],
      },
    });
  }

  // Email / Post — multi-select. Single selection renders as text;
  // multiple selections render as a govuk-list (GDS multi-select CYA pattern).
  if (contactByEmail || contactByPost) {
    const items: string[] = [];
    const userSupplied = new Set<string>();
    if (contactByEmail === 'YES') {
      const emailLabel = t('rows.contactByEmailOrPost.options.email');
      if (emailAddress?.trim()) {
        const item = `${emailLabel} (${emailAddress.trim()})`;
        items.push(item);
        userSupplied.add(item);
      } else {
        items.push(emailLabel);
      }
    }
    if (contactByPost === 'YES') {
      items.push(t('rows.contactByEmailOrPost.options.post'));
    }
    rows.push({
      key: { text: t('rows.contactByEmailOrPost.label') },
      value:
        items.length === 0
          ? { text: t('rows.contactByEmailOrPost.options.none') }
          : multiSelectValue(items, userSupplied),
      actions: {
        items: [change('contact-preferences-email-or-post', 'rows.contactByEmailOrPost.changeHidden')],
      },
    });
  }

  // Phone — value is the phone number when YES, otherwise the No answer.
  if (contactByPhone) {
    const value: { text?: string; html?: string } =
      contactByPhone === 'YES' && phoneNumber?.trim()
        ? { html: escapeHtml(phoneNumber.trim()) }
        : { text: t(`options.${contactByPhone}`) };
    rows.push({
      key: { text: t('rows.contactByPhone.label') },
      value,
      actions: {
        items: [change('contact-preferences-telephone', 'rows.contactByPhone.changeHidden')],
      },
    });
  }

  // Text — only when phone is YES (matches showCondition AND
  // the contact-preferences normaliser that drops contactByText
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
