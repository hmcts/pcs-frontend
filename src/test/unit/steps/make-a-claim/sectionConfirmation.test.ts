import type { Request } from 'express';

import type { CitizenPossessionClaim } from '../../../../main/services/citizenPossessionClaim.interface';
import {
  confirmationsAfterSave,
  confirmingCya,
  cyaShowing,
  isSectionCya,
  makeAClaimSectionConfirmation,
  unconfirmedCya,
} from '../../../../main/steps/make-a-claim/sectionConfirmation';
import { makeAClaimSections } from '../../../../main/steps/make-a-claim/sections.config';

const section = (id: string) => makeAClaimSections.find(candidate => candidate.id === id)!;

const requestFor = (claim: CitizenPossessionClaim): Request =>
  ({ res: { locals: { validatedCase: { data: { citizenPossessionClaim: claim } } } } }) as unknown as Request;

describe('cyaShowing', () => {
  it.each([
    ['claimant-name', 'claimant-cya'],
    ['multiple-claimants', 'claimant-cya'],
    ['defendant-address', 'defendant-cya'],
    ['remove-defendant', 'defendant-cya'],
    ['tenancy-type', 'tenancy-cya'],
    ['ground-reason', 'tenancy-cya'],
    ['notice-details', 'notice-cya'],
    ['upload-notice', 'notice-cya'],
    ['rent-amount', 'arrears-cya'],
    ['rent-due-day', 'arrears-cya'],
    ['statement-period', 'arrears-cya'],
    ['rent-statement-payment', 'arrears-cya'],
    ['claimant-circumstances', 'situation-cya'],
    ['claimant-cya', 'claimant-cya'],
  ])('puts %s on %s', (stepName, cya) => {
    expect(cyaShowing(stepName)).toBe(cya);
  });

  it.each(['eligible', 'language-used', 'check-your-answers', 'task-list'])('puts %s on no summary', stepName => {
    expect(cyaShowing(stepName)).toBeUndefined();
  });
});

describe('isSectionCya', () => {
  it('knows the section summaries, but not the final check your answers', () => {
    expect(isSectionCya('notice-cya')).toBe(true);
    expect(isSectionCya('check-your-answers')).toBe(false);
  });
});

describe('confirmingCya', () => {
  it('adds the summary once', () => {
    expect(confirmingCya({}, 'claimant-cya')).toEqual(['claimant-cya']);
    expect(confirmingCya({ confirmedSections: ['claimant-cya', 'notice-cya'] }, 'claimant-cya')).toEqual([
      'claimant-cya',
      'notice-cya',
    ]);
  });
});

describe('confirmationsAfterSave', () => {
  const saved: CitizenPossessionClaim = {
    confirmedSections: ['claimant-cya', 'tenancy-cya', 'notice-cya'],
    claimant: { firstName: 'Billy' },
    tenancy: { tenancyType: 'ASSURED' },
  };

  it('withdraws the confirmation of the summary showing a changed answer', () => {
    expect(confirmationsAfterSave(saved, { ...saved, tenancy: { tenancyType: 'EXCLUDED' } }, 'tenancy-type')).toEqual([
      'claimant-cya',
      'notice-cya',
    ]);
  });

  it('keeps every confirmation when nothing changed', () => {
    expect(confirmationsAfterSave(saved, { ...saved, draftVersion: 3 }, 'tenancy-type')).toEqual(
      saved.confirmedSections
    );
  });

  it('keeps every confirmation for a page no summary shows', () => {
    expect(
      confirmationsAfterSave(saved, { ...saved, otherInformation: { languageUsed: 'WELSH' } }, 'language-used')
    ).toEqual(saved.confirmedSections);
  });

  it('starts from what was saved, never from the updated claim', () => {
    expect(
      confirmationsAfterSave(
        saved,
        { ...saved, confirmedSections: ['arrears-cya'], claimant: { firstName: 'Bill' } },
        'claimant-name'
      )
    ).toEqual(['tenancy-cya', 'notice-cya']);
  });
});

describe('makeAClaimSectionConfirmation', () => {
  it('has summaries for every section but upload documents and check and submit', () => {
    expect(makeAClaimSections.filter(makeAClaimSectionConfirmation.hasCya).map(({ id }) => id)).toEqual([
      'aboutYou',
      'defendants',
      'tenancyAndGrounds',
      'notice',
      'rentArrears',
      'circumstances',
    ]);
    expect(makeAClaimSectionConfirmation.confirmationCompletes).toBe(false);
  });

  it('confirms the tenancy and the notice separately, each on its own summary', () => {
    const tenancyOnly = requestFor({ confirmedSections: ['tenancy-cya'] });
    expect(makeAClaimSectionConfirmation.isConfirmed(section('tenancyAndGrounds'), tenancyOnly)).toBe(true);
    expect(makeAClaimSectionConfirmation.isConfirmed(section('notice'), tenancyOnly)).toBe(false);
    expect(unconfirmedCya(section('notice'), tenancyOnly)).toBe('notice-cya');
  });

  it('confirms nothing for a claim without confirmations', () => {
    expect(unconfirmedCya(section('aboutYou'), requestFor({}))).toBe('claimant-cya');
  });
});
