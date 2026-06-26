import type { TFunction } from 'i18next';

import { ViewTheClaimSection, buildViewTheClaimPageData } from '@utils/viewTheClaim/viewTheClaimUtils';

const translations: Record<string, string> = {
  'viewTheClaim:claimPdfLabel': 'Claim (PDF)',
  'viewTheClaim:sections.claimantDetails': 'Claimant details',
  'viewTheClaim:sections.defendantDetails': 'Defendant 1 details',
  'viewTheClaim:sections.additionalDefendantDetails': 'Additional defendant 1 details',
  'viewTheClaim:sections.claimDetails': 'Claim details',
  'viewTheClaim:sections.rentArrears': 'Details of rent arrears - RENT ARREARS CLAIMS ONLY',
  'viewTheClaim:sections.underlesseeTriage': 'Underlessees or mortgagees entitled to claim relief against forfeiture',
  'viewTheClaim:sections.underlesseeDetails': 'Underlessee or mortgagee 1 details',
  'viewTheClaim:sections.additionalUnderlesseeDetails': 'Additional underlessee or mortgagee 1 details',
  'viewTheClaim:labels.claimantName': 'Name',
  'viewTheClaim:labels.addressForService': 'Address for service',
  'viewTheClaim:labels.defendantName': 'Name',
  'viewTheClaim:dateIssued': 'Date issued',
  'viewTheClaim:dateSubmitted': 'Date submitted',
  'viewTheClaim:labels.claimantType': 'Claimant type',
  'viewTheClaim:labels.trespassClaim': 'Is your claim a trespass claim?',
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
  'viewTheClaim:sections.statementOfTruth': 'Statement of truth',
  'viewTheClaim:labels.statementOfTruthCompletedBy': 'Completed by',
  'viewTheClaim:personsUnknown': 'Persons unknown',
  'viewTheClaim:sections.tenancyDetails': 'Tenancy, occupation contract or licence details',
  'viewTheClaim:labels.tenancyType':
    'What type of tenancy, occupation contract or licence is in place, or was in place?',
  'viewTheClaim:labels.tenancyStartDate': 'Tenancy, occupation contract or licence start date',
  'viewTheClaim:labels.tenancyCopy':
    'Does the claimant have a copy of the tenancy, occupation contract or licence agreement?',
  'viewTheClaim:labels.tenancyNoCopyReason':
    'Why does the claimant not have a copy of the tenancy, occupation contract or licence agreement?',
  'viewTheClaim:labels.tenancyDocument': 'Tenancy, occupation contract or licence agreement',
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

function rowText(section: ViewTheClaimSection, label: string): string | undefined {
  return section.rows.find(row => row.key.text === label)?.value.text;
}

function rowHtml(section: ViewTheClaimSection, label: string): string | undefined {
  return section.rows.find(row => row.key.text === label)?.value.html;
}

describe('viewTheClaimUtils', () => {
  it('shows date issued from top-level claimIssueDate on case data', () => {
    const page = buildViewTheClaimPageData(
      '1234567890123456',
      {
        claimIssueDate: '2026-02-05',
        detailsTab_DateClaimSubmitted: '2026-06-24T12:23:59.791346',
      } as never,
      t
    );

    expect(page.pageMetadataRows).toHaveLength(2);
    expect(page.pageMetadataRows[0].key.text).toBe('Date issued');
    expect(page.pageMetadataRows[0].value.text).toBe('5 February 2026');
    expect(page.pageMetadataRows[1].key.text).toBe('Date submitted');
  });

  it('builds claim summary sections in mapping order with case data values', () => {
    const page = buildViewTheClaimPageData(
      '1234567890123456',
      {
        propertyAddress: {
          AddressLine1: '2 Second Avenue',
          PostTown: 'London',
          PostCode: 'W3 7RX',
        },
        detailsTab_DateClaimSubmitted: '2026-06-24T12:23:59.791346',
        detailsTab_ClaimDetails: {
          claimantType: 'Registered provider of social housing or local authority',
          trespassClaim: 'No',
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
        detailsTab_RentArrearsDetails: {
          rentAmount: '£1,000.00',
          calculationFrequency: 'Monthly',
        },
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
    expect(page.pageMetadataRows[0].value.text).toBe('24 June 2026');
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
    expect(rowText(sectionByTitle(page, 'Claim details'), 'Does the claimant have grounds for possession?')).toBe(
      'Yes'
    );
    expect(rowHtml(sectionByTitle(page, 'Claim details'), 'Grounds for possession')).toBe('Rent arrears');

    const rentSection = sectionByTitle(page, 'Details of rent arrears - RENT ARREARS CLAIMS ONLY');
    expect(rowText(rentSection, 'Rent amount')).toBe('£1,000.00');
    expect(rowText(rentSection, 'How is rent calculated?')).toBe('Monthly');
    expect(rowHtml(rentSection, 'Rent statement')).toContain('rent-statement.pdf');
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
    expect(rowHtml(sectionByTitle(page, 'Additional defendant 1 details'), 'Address for service')).toBe(
      '2 Second Avenue<br>London<br>W3 7RX'
    );
  });

  it('uses casePartiesTab_ClaimantDetails.serviceAddress when detailsTab_ClaimantAddress is empty', () => {
    const page = buildViewTheClaimPageData(
      '1782399913518153',
      {
        propertyAddress: {
          AddressLine1: '2 Pentre Street',
          PostTown: 'Caerdydd',
          PostCode: 'CF11 6QX',
        },
        allClaimants: [
          {
            id: 'claimant-1',
            value: {
              orgName: 'Possession Claims Solicitor Org',
            },
          },
        ],
        detailsTab_ClaimantAddress: {
          AddressLine1: ' ',
          PostTown: ' ',
          PostCode: ' ',
          Country: ' ',
        },
        casePartiesTab_ClaimantDetails: {
          name: 'Possession Claims Solicitor Org',
          serviceAddress: {
            AddressLine1: '102 Petty France',
            PostTown: 'London',
            PostCode: 'SW1H 9AJ',
          },
        },
      } as never,
      t
    );

    expect(rowHtml(sectionByTitle(page, 'Claimant details'), 'Address for service')).toBe(
      '102 Petty France<br>London<br>SW1H 9AJ'
    );
  });

  it('uses detailsTab_ClaimantAddress when allClaimants address is redacted on citizen read', () => {
    const page = buildViewTheClaimPageData(
      '1782399913518153',
      {
        propertyAddress: {
          AddressLine1: '2 Pentre Street',
          PostTown: 'Caerdydd',
          PostCode: 'CF11 6QX',
        },
        allClaimants: [
          {
            id: 'claimant-1',
            value: {
              orgName: 'Possession Claims Solicitor Org',
            },
          },
        ],
        detailsTab_ClaimantAddress: {
          AddressLine1: '102 Petty France',
          PostTown: 'London',
          PostCode: 'SW1H 9AJ',
          Country: 'United Kingdom',
        },
      } as never,
      t
    );

    expect(rowText(sectionByTitle(page, 'Claimant details'), 'Name')).toBe('Possession Claims Solicitor Org');
    expect(rowHtml(sectionByTitle(page, 'Claimant details'), 'Address for service')).toBe(
      '102 Petty France<br>London<br>SW1H 9AJ<br>United Kingdom'
    );
  });

  it('uses defendant tab paths when allDefendants is redacted on citizen read', () => {
    const propertyAddress = {
      AddressLine1: '2 Pentre Street',
      PostTown: 'Caerdydd',
      PostCode: 'CF11 6QX',
    };

    const page = buildViewTheClaimPageData(
      '1782399913518153',
      {
        propertyAddress,
        allDefendants: [
          {
            id: 'a9a8bf4a-5dc1-4cf8-958c-9734da8d6c1e',
            value: {
              firstName: 'z',
              lastName: 'test',
              nameKnown: 'YES',
              addressKnown: 'YES',
              addressSameAsProperty: 'YES',
            },
          },
          { id: '129fbbfc-3677-46a5-bd88-eb286e3f8792', value: {} },
          { id: 'b4b7e79c-8ef8-4a3b-a330-2d4597bf8525', value: { firstName: 'y', lastName: 'test' } },
        ],
        detailsTab_DefendantInformationDetails: {
          nameKnown: 'Yes',
          firstName: 'z',
          lastName: 'test',
          addressKnown: 'Yes',
          addressForService: propertyAddress,
        },
        detailsTab_AdditionalDefendants: [],
        casePartiesTab_DefendantsDetails: [
          {
            value: {
              firstName: 'Person unknown',
              lastName: 'Person unknown',
              serviceAddress: propertyAddress,
            },
          },
          {
            value: {
              firstName: 'Person unknown',
              lastName: 'Person unknown',
              serviceAddress: propertyAddress,
            },
          },
        ],
      } as never,
      t
    );

    expect(rowText(sectionByTitle(page, 'Defendant 1 details'), 'Name')).toBe('z test');
    expect(rowText(sectionByTitle(page, 'Additional defendant 1 details'), 'Name')).toBe('Persons unknown');
    expect(rowHtml(sectionByTitle(page, 'Additional defendant 1 details'), 'Address for service')).toBe(
      '2 Pentre Street<br>Caerdydd<br>CF11 6QX'
    );
  });

  it('uses detailsTab_RentArrearsDetails.rentFrequency for Wales rent calculation', () => {
    const page = buildViewTheClaimPageData(
      '1782399913518153',
      {
        propertyAddress: {
          AddressLine1: '2 Pentre Street',
          PostTown: 'Caerdydd',
          PostCode: 'CF11 6QX',
        },
        detailsTab_RentArrearsDetails: {
          rentAmount: '£1234',
          rentFrequency: 'Weekly',
          arrearsTotal: '£12345',
        },
      } as never,
      t
    );

    const rentSection = sectionByTitle(page, 'Details of rent arrears - RENT ARREARS CLAIMS ONLY');
    expect(rowText(rentSection, 'How is rent calculated?')).toBe('Weekly');
  });

  it('builds Wales occupation contract details from detailsTab_OccupationContractLicenceDetails', () => {
    const page = buildViewTheClaimPageData(
      '1782399913518153',
      {
        propertyAddress: {
          AddressLine1: '2 Pentre Street',
          PostTown: 'Caerdydd',
          PostCode: 'CF11 6QX',
        },
        detailsTab_OccupationContractLicenceDetails: {
          agreementType: 'Secure contract',
          agreementStartDate: '1 January 2020',
          documents: [],
          documentsPlaceholder: ' ',
        },
      } as never,
      t
    );

    const tenancySection = sectionByTitle(page, 'Tenancy, occupation contract or licence details');
    expect(
      rowText(tenancySection, 'What type of tenancy, occupation contract or licence is in place, or was in place?')
    ).toBe('Secure contract');
    expect(rowText(tenancySection, 'Tenancy, occupation contract or licence start date')).toBe('1 January 2020');
    expect(
      tenancySection.rows.some(
        row =>
          row.key.text === 'Does the claimant have a copy of the tenancy, occupation contract or licence agreement?'
      )
    ).toBe(false);
  });

  it('builds England tenancy details from detailsTab_TenancyLicenceDetails', () => {
    const page = buildViewTheClaimPageData(
      '1234567890123456',
      {
        propertyAddress: {
          AddressLine1: '2 Second Avenue',
          PostTown: 'London',
          PostCode: 'W3 7RX',
        },
        detailsTab_TenancyLicenceDetails: {
          typeOfTenancyLicence: 'Assured tenancy',
          tenancyLicenceDate: '1 January 2020',
          hasCopyOfTenancyLicence: 'No',
          reasonsForNoTenancyLicenceDocuments: 'Lost in a house move',
          tenancyLicenceDocuments: [
            {
              id: '33333333-3333-3333-3333-333333333333',
              value: {
                document_filename: 'Tenancyagreement.pdf',
              },
            },
          ],
        },
      } as never,
      t
    );

    const tenancySection = sectionByTitle(page, 'Tenancy, occupation contract or licence details');
    expect(
      rowText(tenancySection, 'What type of tenancy, occupation contract or licence is in place, or was in place?')
    ).toBe('Assured tenancy');
    expect(rowText(tenancySection, 'Tenancy, occupation contract or licence start date')).toBe('1 January 2020');
    expect(
      rowText(tenancySection, 'Does the claimant have a copy of the tenancy, occupation contract or licence agreement?')
    ).toBe('No');
    expect(
      rowText(
        tenancySection,
        'Why does the claimant not have a copy of the tenancy, occupation contract or licence agreement?'
      )
    ).toBe('Lost in a house move');
    expect(rowHtml(tenancySection, 'Tenancy, occupation contract or licence agreement')).toContain(
      'Tenancyagreement.pdf'
    );
  });

  it('builds underlessee sections from detailsTab_Mortgage paths on read', () => {
    const page = buildViewTheClaimPageData(
      '1234567890123456',
      {
        propertyAddress: {
          AddressLine1: '2 Pentre Street',
          PostTown: 'Caerdydd',
          PostCode: 'CF11 6QX',
        },
        detailsTab_MortgageOneDetails: {
          nameKnown: 'Yes',
          name: 'underlessee 1',
          addressKnown: 'No',
        },
        detailsTab_MortgageDetails: [
          {
            value: {
              nameKnown: 'Yes',
              name: 'Acme Mortgagee',
              addressKnown: 'Yes',
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
    expect(rowText(sectionByTitle(page, 'Underlessee or mortgagee 1 details'), 'Name')).toBe('underlessee 1');
    expect(rowText(sectionByTitle(page, 'Additional underlessee or mortgagee 1 details'), 'Name')).toBe(
      'Acme Mortgagee'
    );
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
