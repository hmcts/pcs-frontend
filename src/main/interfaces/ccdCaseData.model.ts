import {
  CcdCase,
  CcdCaseAddress,
  CcdCaseData,
  CcdClaimGroundSummaryItem,
  CcdDefendantParty,
  CcdDefendantResponses,
  PossessionClaimResponse,
  YesNoEnum,
} from '@interfaces/ccdCase.interface';

export class CcdCaseModel {
  protected readonly validatedCase: CcdCase;

  constructor(validatedCase: CcdCase) {
    this.validatedCase = validatedCase;
  }

  get data(): CcdCaseData {
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

  /**
   * Combined tenancy/licence start date used in respondent flows.
   *
   * England: tenancy_TenancyLicenceDate
   * Wales: licenceStartDate
   */
  get tenancyStartDate(): string | undefined {
    return this.tenancy_TenancyLicenceDate ?? this.licenceStartDate;
  }

  /**
   * Convenience boolean for routing decisions that depend on whether
   * a tenancy/licence start date exists in CCD.
   */
  get hasTenancyStartDate(): boolean {
    const start = this.tenancyStartDate;
    return !!(start && start.trim());
  }

  get possessionClaimResponse(): PossessionClaimResponse | undefined {
    return this.data.possessionClaimResponse;
  }

  get submitDraftAnswers(): string | undefined {
    return this.data.submitDraftAnswers;
  }

  get claimantName(): string {
    return this.data.possessionClaimResponse?.claimantOrganisations?.[0]?.value ?? '';
  }

  get defendantContactDetailsParty(): CcdDefendantParty {
    return this.data.possessionClaimResponse?.defendantContactDetails?.party ?? ({} as CcdDefendantParty);
  }

  get defendantResponses(): CcdDefendantResponses | undefined {
    return this.data.possessionClaimResponse?.defendantResponses ?? undefined;
  }

  get defendantResponsesTenancyStartDateCorrect(): string | undefined {
    return this.defendantResponses?.tenancyStartDateCorrect ?? undefined;
  }

  get defendantResponsesTenancyStartDate(): string | undefined {
    return this.defendantResponses?.tenancyStartDate ?? undefined;
  }

  get defendantResponsesReceivedFreeLegalAdvice(): string | undefined {
    return this.defendantResponses?.receivedFreeLegalAdvice ?? undefined;
  }

  get defendantResponsesContactByPhone(): string | undefined {
    return this.defendantResponses?.contactByPhone ?? undefined;
  }

  get defendantResponsesContactByText(): string | undefined {
    return this.defendantResponses?.contactByText ?? undefined;
  }

  get isDefendantContactByPhone(): boolean {
    return this.defendantResponsesContactByPhone === YesNoEnum.YES;
  }

  get isDefendantContactByEmail(): boolean {
    return this.defendantResponsesContactByEmail === YesNoEnum.YES;
  }

  get isDefendantContactByPost(): boolean {
    return this.defendantResponsesContactByPost === YesNoEnum.YES;
  }

  get isDefendantContactByText(): boolean {
    return this.defendantResponsesContactByText === YesNoEnum.YES;
  }

  get defendantResponsesContactByEmail(): string | undefined {
    return this.defendantResponses?.contactByEmail ?? undefined;
  }

  get defendantResponsesContactByPost(): string | undefined {
    return this.defendantResponses?.contactByPost ?? undefined;
  }

  get defendantContactDetailsPartyPhoneNumber(): string | undefined {
    return this.defendantContactDetailsParty.phoneNumber ?? undefined;
  }

  get defendantContactDetailsPartyName(): string {
    return this.defendantContactDetailsParty.firstName && this.defendantContactDetailsParty.lastName
      ? `${this.defendantContactDetailsParty.firstName} ${this.defendantContactDetailsParty.lastName}`
      : '';
  }

  get defendantContactDetailsPartyNameKnown(): string {
    return this.defendantContactDetailsParty.nameKnown ?? '';
  }

  /** User's confirmation of notice given (yes/no/imNotSure). Used for arrears back-navigation after resume. */
  get defendantResponsesConfirmNoticeGiven(): string | undefined {
    const raw = this.defendantResponses?.confirmNoticeGiven;
    if (raw === undefined || raw === null) {
      return undefined;
    }
    return String(raw).toLowerCase();
  }

  /**
   * First provided notice date from CCD case data, regardless of channel.
   *
   * Order of precedence:
   * - notice_NoticeHandedOverDateTime (hand delivered)
   * - notice_NoticePostedDate (posted)
   * - notice_NoticeOtherElectronicDateTime (electronic)
   */
  get noticeDate(): string | undefined {
    return (
      this.notice_NoticeHandedOverDateTime ||
      this.notice_NoticePostedDate ||
      this.notice_NoticeOtherElectronicDateTime ||
      undefined
    );
  }
}
