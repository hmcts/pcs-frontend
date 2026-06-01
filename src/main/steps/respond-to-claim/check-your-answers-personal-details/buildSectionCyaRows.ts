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
  addContactDetailsRow(ctx);

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
  // The row stands alone with no confirmation question above it, so it mirrors the
  // capture page's own question ("What's your name?") rather than the bare "Name" noun
  // label used for the corrected-name row in branch 1.
  const partyName = validatedCase.defendantContactDetailsPartyName?.trim();
  if (!partyName) {
    return;
  }
  rows.push({
    key: { text: t('rows.defendantNameCapture.label') },
    value: { html: escapeHtml(partyName) },
    actions: { items: [change('defendant-name-capture', 'rows.defendantNameCapture.changeHidden')] },
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

function addCorrespondenceAddressRow({ rows, validatedCase, t, change, yesNoNotSure }: RowContext): void {
  // On a confirmed "Yes" the step clears party.address, so show the claimant-recorded
  // address; on "No" or a typed-in one, show the defendant party's.
  const confirmation = validatedCase.defendantResponses?.correspondenceAddressConfirmation;
  const addressConfirmed = !!confirmation && normalizeYesNoValue(confirmation) === 'YES';

  const sourceAddress = addressConfirmed
    ? validatedCase.claimantEnteredDefendantDetails?.address
    : validatedCase.defendantContactDetailsPartyAddress;

  // Drop Country for the CYA row (UK address; matches the step legend and the task-list heading).
  const address = sourceAddress ? { ...sourceAddress, Country: undefined } : undefined;

  const lines = formatCcdAddressLines(address);
  if (lines.length === 0) {
    return;
  }

  if (addressConfirmed && confirmation) {
    // YES: question carries the address, value is just "Yes" (same shape as the name row).
    rows.push({
      key: { text: t('rows.correspondenceAddressConfirmation.label', { address: lines.join(', ') }) },
      value: { text: yesNoNotSure(confirmation) },
      actions: { items: [change('correspondence-address', 'rows.correspondenceAddressConfirmation.changeHidden')] },
    });
    return;
  }

  // NO: open question, the typed-in address is the value.
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
  if (isYes(contactByEmail)) {
    items.push(t('rows.contactByEmailOrPost.options.email'));
  }
  if (isYes(contactByPost)) {
    items.push(t('rows.contactByEmailOrPost.options.post'));
  }

  rows.push({
    key: { text: t('rows.contactByEmailOrPost.label') },
    value: items.length === 0 ? { text: t('rows.contactByEmailOrPost.options.none') } : multiSelectValue(items),
    actions: { items: [change('contact-preferences-email-or-post', 'rows.contactByEmailOrPost.changeHidden')] },
  });
}

function addContactByPhoneRow({ rows, validatedCase, t, change, yesNoNotSure }: RowContext): void {
  const contactByPhone = validatedCase.defendantResponsesContactByPhone;
  if (!contactByPhone) {
    return;
  }
  pushYesNoRow(rows, 'rows.contactByPhone', contactByPhone, 'contact-preferences-telephone', t, yesNoNotSure, change);
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

// Per the GOV.UK check-answers contact-details example: a single row that stacks
// phone and email when the citizen has opted in to either. Change link targets the
// step that captures the only displayed value; when both are shown, defaults to the
// email-or-post step (first contact-preferences step in section order).
function addContactDetailsRow({ rows, validatedCase, t, change }: RowContext): void {
  const lines: string[] = [];
  const phoneNumber = isYes(validatedCase.defendantResponsesContactByPhone)
    ? validatedCase.defendantContactDetailsPartyPhoneNumber?.trim()
    : undefined;
  const emailAddress = isYes(validatedCase.defendantResponsesContactByEmail)
    ? validatedCase.defendantContactDetailsPartyEmailAddress?.trim()
    : undefined;
  if (phoneNumber) {
    lines.push(phoneNumber);
  }
  if (emailAddress) {
    lines.push(emailAddress);
  }
  if (lines.length === 0) {
    return;
  }
  const changeStep = emailAddress ? 'contact-preferences-email-or-post' : 'contact-preferences-telephone';
  rows.push({
    key: { text: t('rows.contactDetails.label') },
    value: { html: lines.map(line => `<p class="govuk-body">${escapeHtml(line)}</p>`).join('') },
    actions: { items: [change(changeStep, 'rows.contactDetails.changeHidden')] },
  });
}
