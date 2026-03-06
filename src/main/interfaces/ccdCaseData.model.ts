import {
  CcdCase,
  CcdCaseAddress,
  CcdCaseData,
  CcdClaimGroundSummaryItem,
  CcdDefendantParty,
  PossessionClaimResponse,
} from '@interfaces/ccdCase.interface';

export class CcdCaseModel {
  protected readonly validatedCase: CcdCase;

  constructor(validatedCase: CcdCase) {
    this.validatedCase = validatedCase;
  }

  private get data(): CcdCaseData {
    return this.validatedCase.data ?? {};
  }

  get id(): string {
    return this.validatedCase.id ?? '';
  }

  get claimIssueDate(): string {
    return this.data.claimIssueDate ?? '';
  }

  get defendantName(): string {
    return this.data.defendantName ?? '';
  }

  get defendantAddress(): string {
    return this.data.defendantAddress ?? '';
  }

  get rentArrears_Total(): string | undefined {
    return this.data.rentArrears_Total;
  }

  get noticeServed(): string | undefined {
    return this.data.noticeServed;
  }

  get propertyAddress(): CcdCaseAddress | undefined {
    return this.data.propertyAddress;
  }

  get claimGroundSummaries(): CcdClaimGroundSummaryItem[] | undefined {
    return this.data.claimGroundSummaries;
  }

  get userPcqIdSet(): string | undefined {
    return this.data.userPcqIdSet;
  }

  get tenancy_TenancyLicenceDate(): string | undefined {
    return this.data.tenancy_TenancyLicenceDate;
  }

  get legislativeCountry(): string | undefined {
    return this.data.legislativeCountry;
  }

  get notice_NoticeHandedOverDateTime(): string | undefined {
    return this.data.notice_NoticeHandedOverDateTime;
  }

  get notice_NoticePostedDate(): string | undefined {
    return this.data.notice_NoticePostedDate;
  }

  get notice_NoticeOtherElectronicDateTime(): string | undefined {
    return this.data.notice_NoticeOtherElectronicDateTime;
  }

  get tenancy_TypeOfTenancyLicence(): string | undefined {
    return this.data.tenancy_TypeOfTenancyLicence;
  }

  get occupationLicenceTypeWales(): string | undefined {
    return this.data.occupationLicenceTypeWales;
  }

  get licenceStartDate(): string | undefined {
    return this.data.licenceStartDate;
  }

  get possessionClaimResponse(): PossessionClaimResponse | undefined {
    return this.data.possessionClaimResponse;
  }

  get submitDraftAnswers(): string | undefined {
    return this.data.submitDraftAnswers;
  }

  get claimantName(): string | undefined {
    return this.data.possessionClaimResponse?.claimantOrganisations?.[0]?.value;
  }

  get defendantContactDetailsParty(): CcdDefendantParty {
    return this.data.possessionClaimResponse?.defendantContactDetails?.party ?? ({} as CcdDefendantParty);
  }

  get organisationName(): string {
    return this.data.possessionClaimResponse?.claimantOrganisations?.[0]?.value ?? '';
  }
  get defendantResponsesReceivedFreeLegalAdvice(): string | undefined {
    return this.data.possessionClaimResponse?.defendantResponses?.receivedFreeLegalAdvice ?? undefined;
  }

  get defendantContactDetailsPartyName(): string {
    return this.defendantContactDetailsParty.firstName && this.defendantContactDetailsParty.lastName
      ? `${this.defendantContactDetailsParty.firstName} ${this.defendantContactDetailsParty.lastName}`
      : '';
  }

  get defendantContactDetailsPartyNameKnown(): string {
    return this.defendantContactDetailsParty.nameKnown ?? '';
  }
}
