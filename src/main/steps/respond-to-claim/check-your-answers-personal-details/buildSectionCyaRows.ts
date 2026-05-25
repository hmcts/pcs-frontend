import escapeHtml from 'escape-html';
import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { formatIsoDate, normalizeYesNoValue } from '../../utils';
import { formatCcdAddressLines } from '../../utils/ccdAddress';
import {
  type BaseRowContext,
  type SummaryListRow,
  createRowContext,
  groupQuestionAndDetail,
  isYes,
  multiSelectValue,
  pushYesNoRow,
} from '../section-cya/cyaRow';
import type { RespondToClaimSectionId } from '../sections.config';

const SECTION_ID: RespondToClaimSectionId = 'personalDetails';

type RowContext = BaseRowContext;

export function buildSectionCyaRows(req: Request, t: TFunction): SummaryListRow[] {
  const ctx = createRowContext(req, SECTION_ID, t);
  if (!ctx) {
    return [];
  }

  addNameRow(ctx);
  addDateOfBirthRow(ctx);
  addCorrespondenceAddressRow(ctx);
  addContactByEmailOrPostRow(ctx);
  addContactByPhoneRow(ctx);
  addContactByTextRow(ctx);

  return ctx.rows;
}

function addNameRow({ rows, validatedCase, t, change, yesNoNotSure }: RowContext): void {
  const nameConfirmation = validatedCase.defendantResponsesDefendantNameConfirmation;
  const claimDefendantName = validatedCase.claimantEnteredDefendantDetailsName;
  if (nameConfirmation && claimDefendantName) {
    // Branch 1: claim recorded the defendant name — user confirmed (Y/N).
    // When "No", the corrected name is rendered as a separate follow-up row so each
    // answer keeps its own Change link (matches disputeClaim + disputeClaimDetails).
    const questionRow: SummaryListRow = {
      key: { text: t('rows.defendantNameConfirmation.label', { name: claimDefendantName }) },
      value: { text: yesNoNotSure(nameConfirmation) },
      actions: { items: [change('defendant-name-confirmation', 'rows.defendantNameConfirmation.changeHidden')] },
    };
    rows.push(questionRow);

    if (normalizeYesNoValue(nameConfirmation) === 'YES') {
      return;
    }
    const correctedName = validatedCase.defendantContactDetailsPartyName?.trim();
    if (!correctedName) {
      return;
    }
    const detailRow: SummaryListRow = {
      key: { text: t('rows.defendantName.label') },
      value: { html: escapeHtml(correctedName) },
      actions: { items: [change('defendant-name-confirmation', 'rows.defendantName.changeHidden')] },
    };
    groupQuestionAndDetail(questionRow, detailRow);
    rows.push(detailRow);
    return;
  }
  // Branch 2: name captured via defendant-name-capture (shown when nameKnown !== 'YES').
  const partyName = validatedCase.defendantContactDetailsPartyName?.trim();
  if (!partyName) {
    return;
  }
  rows.push({
    key: { text: t('rows.defendantName.label') },
    value: { html: escapeHtml(partyName) },
    actions: { items: [change('defendant-name-capture', 'rows.defendantName.changeHidden')] },
  });
}

function addDateOfBirthRow({ rows, validatedCase, t, change }: RowContext): void {
  // DOB page has no showCondition and the field is optional, so always render the row.
  const dateOfBirth = validatedCase.defendantResponsesDateOfBirth;
  rows.push({
    key: { text: t('rows.dateOfBirth.label') },
    value: { text: dateOfBirth ? formatIsoDate(dateOfBirth) : t('noAnswerProvided') },
    actions: { items: [change('defendant-date-of-birth', 'rows.dateOfBirth.changeHidden')] },
  });
}

function addCorrespondenceAddressRow({ rows, validatedCase, t, change }: RowContext): void {
  // On a confirmed "Yes" the step clears party.address, so show the claimant-recorded
  // address; on "No" or a typed-in one, show the defendant party's.
  const addressConfirmed =
    normalizeYesNoValue(validatedCase.defendantResponses?.correspondenceAddressConfirmation) === 'YES';

  const address = addressConfirmed
    ? validatedCase.claimantEnteredDefendantDetails?.address
    : validatedCase.defendantContactDetailsPartyAddress;

  const lines = formatCcdAddressLines(address);
  if (lines.length === 0) {
    return;
  }
  rows.push({
    key: { text: t('rows.correspondenceAddressConfirmation.fallbackLabel') },
    value: { html: lines.map(escapeHtml).join('<br>') },
    actions: { items: [change('correspondence-address', 'rows.correspondenceAddressConfirmation.changeHidden')] },
  });
}

function addContactByEmailOrPostRow({ rows, validatedCase, t, change }: RowContext): void {
  const contactByEmail = validatedCase.defendantResponsesContactByEmail;
  const contactByPost = validatedCase.defendantResponsesContactByPost;
  if (!contactByEmail && !contactByPost) {
    return;
  }
  const items: string[] = [];
  const userSupplied = new Set<string>();

  if (isYes(contactByEmail)) {
    const emailLabel = t('rows.contactByEmailOrPost.options.email');
    const emailAddress = validatedCase.defendantContactDetailsPartyEmailAddress?.trim();
    if (emailAddress) {
      const item = `${emailLabel}: ${emailAddress}`;
      items.push(item);
      userSupplied.add(item);
    } else {
      items.push(emailLabel);
    }
  }
  if (isYes(contactByPost)) {
    items.push(t('rows.contactByEmailOrPost.options.post'));
  }

  rows.push({
    key: { text: t('rows.contactByEmailOrPost.label') },
    value:
      items.length === 0
        ? { text: t('rows.contactByEmailOrPost.options.none') }
        : multiSelectValue(items, userSupplied),
    actions: { items: [change('contact-preferences-email-or-post', 'rows.contactByEmailOrPost.changeHidden')] },
  });
}

function addContactByPhoneRow({ rows, validatedCase, t, change, yesNoNotSure }: RowContext): void {
  const contactByPhone = validatedCase.defendantResponsesContactByPhone;
  if (!contactByPhone) {
    return;
  }
  const questionRow = pushYesNoRow(
    rows,
    'rows.contactByPhone',
    contactByPhone,
    'contact-preferences-telephone',
    t,
    yesNoNotSure,
    change
  );

  if (!isYes(contactByPhone)) {
    return;
  }
  const phoneNumber = validatedCase.defendantContactDetailsPartyPhoneNumber?.trim();
  if (!phoneNumber) {
    return;
  }
  const detailRow: SummaryListRow = {
    key: { text: t('rows.contactByPhoneNumber.label') },
    value: { html: escapeHtml(phoneNumber) },
    actions: { items: [change('contact-preferences-telephone', 'rows.contactByPhoneNumber.changeHidden')] },
  };
  groupQuestionAndDetail(questionRow, detailRow);
  rows.push(detailRow);
}

function addContactByTextRow({ rows, validatedCase, t, change, yesNoNotSure }: RowContext): void {
  // Text only applies when phone is YES (matches showCondition AND the contact-preferences
  // normaliser that drops contactByText when contactByPhone !== 'YES').
  if (!isYes(validatedCase.defendantResponsesContactByPhone)) {
    return;
  }
  const contactByText = validatedCase.defendantResponsesContactByText;
  if (!contactByText) {
    return;
  }
  pushYesNoRow(rows, 'rows.contactByText', contactByText, 'contact-preferences-text-message', t, yesNoNotSure, change);
}
