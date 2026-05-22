import escapeHtml from 'escape-html';
import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { formatIsoDate, normalizeYesNoValue } from '../../utils';
import { formatCcdAddressLines } from '../../utils/ccdAddress';
import {
  type SummaryListRow,
  getValidatedCase,
  groupQuestionAndDetail,
  isYes,
  makeChange,
  makeYesNoNotSure,
} from '../section-cya/cyaRow';
import type { RespondToClaimSectionId } from '../sections.config';

import type { CcdCaseModel } from '@services/ccdCaseData.model';

const SECTION_ID: RespondToClaimSectionId = 'personalDetails';

interface RowContext {
  rows: SummaryListRow[];
  validatedCase: CcdCaseModel;
  t: TFunction;
  change: ReturnType<typeof makeChange>;
  yesNoNotSure: ReturnType<typeof makeYesNoNotSure>;
}

// GDS multi-select pattern: a single value renders as text; many values render as a
// govuk-list. Items in `userSuppliedItems` are HTML-escaped (the rest are translation
// strings that are safe to render verbatim).
function multiSelectValue(items: string[], userSuppliedItems: Set<string> = new Set()): SummaryListRow['value'] {
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

  const ctx: RowContext = {
    rows: [],
    validatedCase,
    t,
    change: makeChange(caseRef, SECTION_ID, t),
    yesNoNotSure: makeYesNoNotSure(t),
  };

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
      const item = `${emailLabel} (${emailAddress})`;
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
  const questionRow: SummaryListRow = {
    key: { text: t('rows.contactByPhone.label') },
    value: { text: yesNoNotSure(contactByPhone) },
    actions: { items: [change('contact-preferences-telephone', 'rows.contactByPhone.changeHidden')] },
  };
  rows.push(questionRow);

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
  rows.push({
    key: { text: t('rows.contactByText.label') },
    value: { text: yesNoNotSure(contactByText) },
    actions: { items: [change('contact-preferences-text-message', 'rows.contactByText.changeHidden')] },
  });
}
