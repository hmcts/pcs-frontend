import type { Request } from 'express';
import type { TFunction } from 'i18next';

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

type ValidatedCase = {
  id?: string;
  claimantEnteredDefendantDetailsName?: string;
  defendantContactDetailsPartyName?: string;
  defendantResponses?: {
    defendantNameConfirmation?: string;
    dateOfBirth?: string;
    correspondenceAddressConfirmation?: string;
    contactByEmail?: string;
    contactByPost?: string;
    contactByPhone?: string;
    contactByText?: string;
  };
  data?: {
    possessionClaimResponse?: {
      claimantEnteredDefendantDetails?: {
        address?: Address;
      };
    };
  };
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
  const data = (req.res?.locals.validatedCase ?? {}) as ValidatedCase;
  const caseRef = data.id;
  if (!caseRef) {
    return [];
  }

  const responses = data.defendantResponses ?? {};
  const claimDefendantName = data.claimantEnteredDefendantDetailsName ?? '';
  const correctedDefendantName = data.defendantContactDetailsPartyName ?? '';
  const defendantName = claimDefendantName || correctedDefendantName;
  const claimAddress = formatAddress(data.data?.possessionClaimResponse?.claimantEnteredDefendantDetails?.address);

  const change = (stepSlug: string, hiddenKey: string, hiddenInterp?: Record<string, string>) => ({
    href: `/case/${caseRef}/respond-to-claim/${stepSlug}?edit=${SECTION_ID}`,
    text: t('change'),
    visuallyHiddenText: t(hiddenKey, hiddenInterp ?? {}),
  });

  const rows: SummaryListRow[] = [];

  if (responses.defendantNameConfirmation && defendantName) {
    rows.push({
      key: { text: t('rows.defendantNameConfirmation.label', { name: defendantName }) },
      value: { text: t(`options.${responses.defendantNameConfirmation}`) },
      actions: {
        items: [change('defendant-name-confirmation', 'rows.defendantNameConfirmation.changeHidden')],
      },
    });
  }

  if (responses.dateOfBirth) {
    rows.push({
      key: { text: t('rows.dateOfBirth.label') },
      value: { text: formatDob(responses.dateOfBirth) },
      actions: { items: [change('defendant-date-of-birth', 'rows.dateOfBirth.changeHidden')] },
    });
  }

  if (responses.correspondenceAddressConfirmation && claimAddress) {
    rows.push({
      key: { text: t('rows.correspondenceAddressConfirmation.label', { address: claimAddress }) },
      value: { text: t(`options.${responses.correspondenceAddressConfirmation}`) },
      actions: {
        items: [change('correspondence-address', 'rows.correspondenceAddressConfirmation.changeHidden')],
      },
    });
  }

  const methods: string[] = [];
  if (responses.contactByEmail === 'YES') {
    methods.push(t('rows.contactBy.options.email'));
  }
  if (responses.contactByPost === 'YES') {
    methods.push(t('rows.contactBy.options.post'));
  }
  if (responses.contactByPhone === 'YES') {
    methods.push(t('rows.contactBy.options.phone'));
  }
  if (responses.contactByText === 'YES') {
    methods.push(t('rows.contactBy.options.text'));
  }

  if (methods.length > 0) {
    rows.push({
      key: { text: t('rows.contactBy.label') },
      value: { text: methods.join(', ') },
      actions: {
        items: [change('contact-preferences-email-or-post', 'rows.contactBy.changeHidden')],
      },
    });
  }

  return rows;
}
