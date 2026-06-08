import type { TFunction } from 'i18next';

import { ViewTheClaimSection, ViewTheClaimStatementOfTruth, buildViewTheClaimPageData } from '@utils/viewTheClaimUtils';

const translations: Record<string, string> = {
  'viewTheClaim:claimPdfLabel': 'Claim (PDF)',
  'viewTheClaim:sections.claimantDetails': 'Claimant details',
  'viewTheClaim:sections.defendantDetails': 'Defendant 1 details',
  'viewTheClaim:sections.additionalDefendantDetails': 'Additional defendant 1 details',
  'viewTheClaim:sections.claimDetails': 'Claim details',
  'viewTheClaim:sections.rentArrears': 'Details of rent arrears - RENT ARREARS CLAIMS ONLY',
  'viewTheClaim:sections.actionTaken': 'Action already taken by the claimant',
  'viewTheClaim:sections.noticeDetails': 'Notice details',
  'viewTheClaim:sections.tenancyDetails': 'Tenancy, occupation contract or licence details',
  'viewTheClaim:labels.preActionProtocol': 'Has the pre-action protocol been followed?',
  'viewTheClaim:labels.noticeServed': 'Has notice been served?',
  'viewTheClaim:labels.noticeNotServedReason': 'Statement of why notice has not been served',
  'viewTheClaim:labels.tenancyWalesUpload': 'Tenancy, occupation contract or licence',
  'viewTheClaim:labels.tenancyCopy':
    'Does the claimant have a copy of the tenancy, occupation contract or licence agreement?',
  'viewTheClaim:labels.tenancyDocument': 'Tenancy, occupation contract or licence',
  'viewTheClaim:sections.underlesseeTriage': 'Underlessees or mortgagees entitled to claim relief against forfeiture',
  'viewTheClaim:sections.underlesseeDetails': 'Underlessee or mortgagee 1 details',
  'viewTheClaim:sections.additionalUnderlesseeDetails': 'Additional underlessee or mortgagee 1 details',
  'viewTheClaim:labels.claimantName': 'Name',
  'viewTheClaim:labels.addressForService': 'Address for service',
  'viewTheClaim:labels.isExemptLandlord':
    'Is the claimant an exempt landlord under Part 1 of the Housing (Wales) Act 2014?',
  'viewTheClaim:labels.defendantName': 'Name',
  'viewTheClaim:labels.propertyAddress': 'Address of the property the claimant is seeking possession of',
  'viewTheClaim:labels.hasGrounds': 'Does the claimant have grounds for possession?',
  'viewTheClaim:labels.groundsForPossession': 'Grounds for possession',
  'viewTheClaim:labels.descriptionOfGrounds': 'Description of grounds',
  'viewTheClaim:labels.reasonForGround': 'Reason for claiming possession under ground Rent arrears',
  'viewTheClaim:labels.whyClaimingPossession': 'Why is the claimant claiming possession?',
  'viewTheClaim:labels.otherInfoAboutReasons':
    'Is there any other information the claimant wants to provide about their reasons for possession?',
  'viewTheClaim:labels.additionalReasons': 'Additional reasons for possession',
  'viewTheClaim:labels.rentAmount': 'Rent amount',
  'viewTheClaim:labels.howIsRentCalculated': 'How is rent calculated?',
  'viewTheClaim:labels.rentStatement': 'Rent statement',
  'viewTheClaim:labels.underlesseeName': 'Name',
  'viewTheClaim:labels.underlesseeAddress': 'Address for service',
  'viewTheClaim:labels.statementOfTruthCompletedBy': 'Completed by',
  'viewTheClaim:personsUnknown': 'Persons unknown',
  'viewTheClaim:dateIssued': 'Date issued',
  'viewTheClaim:dateSubmitted': 'Date submitted',
  'viewTheClaim:emptyValue': '—',
};

const t = ((key: string, options?: Record<string, unknown>) => {
  if (key === 'viewTheClaim:sections.additionalDefendantDetails') {
    return `Additional defendant ${options?.number} details`;
  }

  if (key === 'viewTheClaim:sections.additionalUnderlesseeDetails') {
    return `Additional underlessee or mortgagee ${options?.number} details`;
  }

  if (key === 'viewTheClaim:labels.reasonForGround') {
    return `Reason for claiming possession under ground ${options?.ground}`;
  }

  return options?.defaultValue ?? translations[key] ?? key;
}) as TFunction;

function sectionByTitle(page: ReturnType<typeof buildViewTheClaimPageData>, title: string): ViewTheClaimSection {
  const section = page.sections.find(item => item.title === title);
  if (!section) {
    throw new Error(`Missing section ${title}`);
  }
  return section;
}

function rowText(section: ViewTheClaimStatementOfTruth | ViewTheClaimSection, label: string): string | undefined {
  return section.rows.find(row => row.key.text === label)?.value.text;
}

function rowHtml(section: ViewTheClaimStatementOfTruth | ViewTheClaimSection, label: string): string | undefined {
  return section.rows.find(row => row.key.text === label)?.value.html;
}

describe('viewTheClaimUtils', () => {
  it('builds claim summary sections in mapping order with case data values', () => {
    const page = buildViewTheClaimPageData(
      '1234567890123456',
      {
        propertyAddress: {
          AddressLine1: '2 Second Avenue',
          PostTown: 'London',
          PostCode: 'W3 7RX',
        },
        claimantName: 'Treetops Housing',
        isClaimantNameCorrect: 'YES',
        organisationAddress: {
          AddressLine1: '102 Petty France',
          PostTown: 'London',
          PostCode: 'SW1H 9AJ',
        },
        defendant1: {
          nameKnown: 'YES',
          firstName: 'Alex',
          lastName: 'Tenant',
          addressKnown: 'YES',
          addressSameAsPossession: 'NO',
          correspondenceAddress: {
            AddressLine1: '10 Second Avenue',
            PostTown: 'London',
            PostCode: 'W3 7RX',
          },
        },
        additionalDefendants: [
          {
            id: 'def-2',
            value: {
              nameKnown: 'NO',
              addressKnown: 'NO',
            },
          },
        ],
        introGrounds_HasIntroductoryDemotedOtherGroundsForPossession: 'YES',
        introGrounds_IntroductoryDemotedOrOtherGrounds: ['RENT_ARREARS'],
        rentDetails_CurrentRent: '100000',
        rentDetails_Frequency: 'MONTHLY',
        rentArrears_Total: '200000',
        rentArrears_RecoveryAttempted: 'NO',
        arrearsJudgmentWanted: 'YES',
        allDocuments: [
          {
            id: '11111111-1111-1111-1111-111111111111',
            value: {
              document_filename: 'rent-statement.pdf',
              document_binary_url: 'http://doc-store/rent-statement/binary',
              document_type: 'RENT_STATEMENT',
            },
          },
          {
            id: '22222222-2222-2222-2222-222222222222',
            value: {
              document_filename: 'generated-claim.pdf',
              document_binary_url: 'http://doc-store/generated-claim/binary',
              category_id: 'statementsOfCase',
            },
          },
        ],
        statementOfTruth: {
          completedBy: 'CLAIMANT',
          fullNameClaimant: 'Jane Claimant',
          positionClaimant: 'Housing officer',
        },
      } as never,
      t
    );

    expect(page.caseReference).toBe('1234567890123456');
    expect(page.propertyAddressHtml).toBe('2 Second Avenue<br>London<br>W3 7RX');
    expect(page.pageMetadataRows).toHaveLength(2);
    expect(page.pageMetadataRows[0].key.text).toBe('Date issued');
    expect(page.pageMetadataRows[0].value.text).toBe('—');
    expect(page.pageMetadataRows[1].key.text).toBe('Date submitted');
    expect(page.pageMetadataRows[1].value.text).toBe('—');
    expect(page.claimPdfSection.rows[0].value.html).toContain('Claim (PDF)');
    expect(page.claimPdfSection.rows[0].value.html).not.toContain('generated-claim.pdf');

    expect(page.sections.map(section => section.title).slice(0, 4)).toEqual([
      'Claimant details',
      'Defendant 1 details',
      'Additional defendant 1 details',
      'Claim details',
    ]);

    expect(rowText(sectionByTitle(page, 'Claimant details'), 'Name')).toBe('Treetops Housing');
    expect(rowHtml(sectionByTitle(page, 'Defendant 1 details'), 'Address for service')).toBe(
      '10 Second Avenue<br>London<br>W3 7RX'
    );
    expect(rowText(sectionByTitle(page, 'Additional defendant 1 details'), 'Name')).toBe('Persons unknown');
    expect(rowHtml(sectionByTitle(page, 'Additional defendant 1 details'), 'Address for service')).toBe(
      '2 Second Avenue<br>London<br>W3 7RX'
    );
    expect(rowHtml(sectionByTitle(page, 'Claim details'), 'Grounds for possession')).toBe('Rent arrears');

    const rentSection = sectionByTitle(page, 'Details of rent arrears - RENT ARREARS CLAIMS ONLY');
    expect(rowText(rentSection, 'Rent amount')).toBe('£1,000.00');
    expect(rowText(rentSection, 'How is rent calculated?')).toBe('Monthly');
    expect(rowHtml(rentSection, 'Rent statement')).toContain('rent-statement.pdf');

    const statementOfTruthSection = page.statementOfTruth;
    expect(rowHtml(statementOfTruthSection, 'Completed by')).toBe('Jane Claimant<br>Housing officer');
    expect(statementOfTruthSection.rows).toHaveLength(1);
  });

  it('builds statement of truth section for a legal representative', () => {
    const page = buildViewTheClaimPageData(
      '1234567890123456',
      {
        statementOfTruth: {
          completedBy: 'LEGAL_REPRESENTATIVE',
          fullNameLegalRep: 'John Smith',
          firmNameLegalRep: 'Smith & Co Solicitors',
          positionLegalRep: 'Solicitor',
        },
      } as never,
      t
    );

    expect(rowHtml(page.statementOfTruth, 'Completed by')).toBe('John Smith<br>Smith &amp; Co Solicitors<br>Solicitor');
  });

  it('shows statement of truth section with empty name and position when statementOfTruth is missing', () => {
    const page = buildViewTheClaimPageData('1234567890123456', {} as never, t);

    expect(page.statementOfTruth.rows).toHaveLength(1);
    expect(rowHtml(page.statementOfTruth, 'Completed by')).toBe('—<br>—');
  });

  it('shows notice served fields in action already taken, not notice details', () => {
    const page = buildViewTheClaimPageData(
      '1234567890123456',
      {
        preActionProtocolCompleted: 'NO',
        walesNoticeServed: 'NO',
        walesNoNoticeStatement: 'Notice was not required for this claim',
      } as never,
      t
    );

    const actionTaken = sectionByTitle(page, 'Action already taken by the claimant');
    expect(rowText(actionTaken, 'Has notice been served?')).toBe('No');
    expect(rowText(actionTaken, 'Statement of why notice has not been served')).toBe(
      'Notice was not required for this claim'
    );

    expect(() => sectionByTitle(page, 'Notice details')).toThrow('Missing section Notice details');
  });

  it('shows Wales occupation contract upload row and hides England copy fields', () => {
    const page = buildViewTheClaimPageData(
      '1234567890123456',
      {
        legislativeCountry: 'Wales',
        occupationLicenceTypeWales: 'STANDARD_CONTRACT',
        licenceStartDate: '2020-05-20',
        licenceDocuments: [],
      } as never,
      t
    );

    const tenancySection = sectionByTitle(page, 'Tenancy, occupation contract or licence details');
    expect(rowText(tenancySection, 'Tenancy, occupation contract or licence')).toBe('No');
    expect(
      tenancySection.rows.some(
        row =>
          row.key.text === 'Does the claimant have a copy of the tenancy, occupation contract or licence agreement?'
      )
    ).toBe(false);
  });

  it('shows Wales occupation contract document links from licenceDocuments', () => {
    const page = buildViewTheClaimPageData(
      '1234567890123456',
      {
        legislativeCountry: 'Wales',
        occupationLicenceTypeWales: 'STANDARD_CONTRACT',
        licenceStartDate: '2020-05-20',
        licenceDocuments: [
          {
            id: '33333333-3333-3333-3333-333333333333',
            value: {
              document_filename: 'occupation-contract.pdf',
              document_binary_url: 'http://doc-store/occupation-contract/binary',
            },
          },
        ],
      } as never,
      t
    );

    const tenancySection = sectionByTitle(page, 'Tenancy, occupation contract or licence details');
    expect(rowText(tenancySection, 'Tenancy, occupation contract or licence')).toBe('Yes');
    expect(tenancySection.rows.filter(row => row.key.text === 'Tenancy, occupation contract or licence')).toHaveLength(
      2
    );
    expect(tenancySection.rows.find(row => row.value.html)?.value.html).toContain('occupation-contract.pdf');
  });

  it('reads submitted date from detailsTab and hides Wales-only claimant fields for England cases', () => {
    const page = buildViewTheClaimPageData(
      '1234567890123456',
      {
        legislativeCountry: 'England',
        detailsTab_DateClaimSubmitted: '8 June 2026, 12:15:03PM',
        detailsTab_ClaimantInformation: { claimantName: 'Possession Claims Solicitor Org' },
        detailsTab_ClaimantAddress: {
          AddressLine1: '102 Petty France',
          PostTown: 'London',
          PostCode: 'SW1H 9AJ',
        },
      } as never,
      t
    );

    expect(page.pageMetadataRows[1].value.text).toBe('8 June 2026, 12:15:03PM');
    expect(rowText(sectionByTitle(page, 'Claimant details'), 'Name')).toBe('Possession Claims Solicitor Org');
    expect(rowHtml(sectionByTitle(page, 'Claimant details'), 'Address for service')).toBe(
      '102 Petty France<br>London<br>SW1H 9AJ'
    );
    expect(
      sectionByTitle(page, 'Claimant details').rows.some(row =>
        row.key.text.startsWith('Is the claimant an exempt landlord')
      )
    ).toBe(false);
  });

  it('shows Wales exempt landlord question only for Wales cases', () => {
    const page = buildViewTheClaimPageData(
      '1234567890123456',
      {
        legislativeCountry: 'Wales',
        occupationLicenceTypeWales: 'STANDARD_CONTRACT',
        isExemptLandlord: 'NO',
        claimantName: 'Community landlord',
      } as never,
      t
    );

    expect(
      rowText(
        sectionByTitle(page, 'Claimant details'),
        'Is the claimant an exempt landlord under Part 1 of the Housing (Wales) Act 2014?'
      )
    ).toBe('No');
  });

  it('hides additional defendant sections when there are no additional defendants', () => {
    const page = buildViewTheClaimPageData(
      '1234567890123456',
      {
        propertyAddress: {
          AddressLine1: '2 Second Avenue',
          PostTown: 'London',
          PostCode: 'W3 7RX',
        },
        defendant1: {
          nameKnown: 'YES',
          firstName: 'Alex',
          lastName: 'Tenant',
          addressKnown: 'NO',
        },
      } as never,
      t
    );

    expect(page.sections.some(section => section.title.startsWith('Additional defendant'))).toBe(false);
  });

  it('uses pcs-api returned party collections for claimant and defendant details', () => {
    const page = buildViewTheClaimPageData(
      '1234567890123456',
      {
        propertyAddress: {
          AddressLine1: '2 Second Avenue',
          PostTown: 'London',
          PostCode: 'W3 7RX',
        },
        allClaimants: [
          {
            id: 'claimant-1',
            value: {
              orgName: 'Treetops Housing',
              address: {
                AddressLine1: '102 Petty France',
                PostTown: 'London',
                PostCode: 'SW1H 9AJ',
              },
            },
          },
        ],
        allDefendants: [
          {
            id: 'defendant-1',
            value: {
              nameKnown: 'YES',
              firstName: 'Alex',
              lastName: 'Tenant',
              addressKnown: 'YES',
              addressSameAsProperty: 'YES',
            },
          },
          {
            id: 'defendant-2',
            value: {
              nameKnown: 'NO',
              addressKnown: 'NO',
            },
          },
        ],
      } as never,
      t
    );

    expect(rowText(sectionByTitle(page, 'Claimant details'), 'Name')).toBe('Treetops Housing');
    expect(rowHtml(sectionByTitle(page, 'Claimant details'), 'Address for service')).toBe(
      '102 Petty France<br>London<br>SW1H 9AJ'
    );
    expect(rowText(sectionByTitle(page, 'Defendant 1 details'), 'Name')).toBe('Alex Tenant');
    expect(rowHtml(sectionByTitle(page, 'Defendant 1 details'), 'Address for service')).toBe(
      '2 Second Avenue<br>London<br>W3 7RX'
    );
    expect(rowText(sectionByTitle(page, 'Additional defendant 1 details'), 'Name')).toBe('Persons unknown');
  });

  it('builds underlessee and additional underlessee sections in numerical order', () => {
    const page = buildViewTheClaimPageData(
      '1234567890123456',
      {
        propertyAddress: {
          AddressLine1: '2 Pentre Street',
          PostTown: 'Caerdydd',
          PostCode: 'CF11 6QX',
        },
        hasUnderlesseeOrMortgagee: 'YES',
        underlesseeOrMortgagee1: {
          nameKnown: 'NO',
          addressKnown: 'NO',
        },
        additionalUnderlesseeOrMortgagee: [
          {
            id: 'underlessee-2',
            value: {
              nameKnown: 'YES',
              name: 'Acme Mortgagee',
              addressKnown: 'YES',
              address: {
                AddressLine1: '1 Bank Street',
                PostTown: 'Cardiff',
                PostCode: 'CF10 1AA',
              },
            },
          },
        ],
      } as never,
      t
    );

    expect(page.sections.map(section => section.title)).toEqual([
      'Claim details',
      'Underlessees or mortgagees entitled to claim relief against forfeiture',
      'Underlessee or mortgagee 1 details',
      'Additional underlessee or mortgagee 1 details',
    ]);
    expect(rowText(sectionByTitle(page, 'Underlessee or mortgagee 1 details'), 'Name')).toBe('Persons unknown');
    expect(rowText(sectionByTitle(page, 'Additional underlessee or mortgagee 1 details'), 'Name')).toBe(
      'Acme Mortgagee'
    );
  });
});
