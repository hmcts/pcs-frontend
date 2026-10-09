export const YES_NO_LABELS: Record<string, string> = {
  YES: 'Yes',
  NO: 'No',
  NOT_SURE: 'Not sure',
  IM_NOT_SURE: 'Not sure',
  IMNOTSURE: 'Not sure',
};

// English labels as pcs-api sends them (enum getLabel()). Used to recognise a pcs-api display value so it can be
// shown in Welsh; a value that no longer matches simply stays in English.
export const TENANCY_TYPE_LABELS: Record<string, string> = {
  ASSURED_TENANCY: 'Assured tenancy',
  SECURE_TENANCY: 'Secure tenancy',
  INTRODUCTORY_TENANCY: 'Introductory tenancy',
  FLEXIBLE_TENANCY: 'Flexible tenancy',
  DEMOTED_TENANCY: 'Demoted tenancy',
  STANDARD_CONTRACT: 'Standard contract',
  SECURE_CONTRACT: 'Secure contract',
  OTHER: 'Other',
};

export const NOTICE_SERVICE_METHOD_LABELS: Record<string, string> = {
  DELIVERED_PERMITTED_PLACE: 'By delivering it to or leaving it at a permitted place',
  EMAIL: 'By email',
  FIRST_CLASS_POST: 'By first class post or other service which provides for delivery on the next business day',
  OTHER: 'Other',
  OTHER_ELECTRONIC: 'By other electronic method',
  PERSONALLY_HANDED: 'By personally handing it to or leaving it with someone',
};

export const RENT_FREQUENCY_LABELS: Record<string, string> = {
  WEEKLY: 'Weekly',
  FORTNIGHTLY: 'Fortnightly',
  MONTHLY: 'Monthly',
  OTHER: 'Other',
};

export const HOUSING_ACT_LABELS: Record<string, string> = {
  SECTION_82A_2: 'Section 82A(2) of the Housing Act 1985',
  SECTION_6A_2: 'Section 6A(2) of the Housing Act 1988',
  SECTION_121A: 'Section 121A of the Housing Act 1985',
};

export const CLAIMANT_TYPE_LABELS: Record<string, string> = {
  PRIVATE_LANDLORD: 'Private landlord',
  PROVIDER_OF_SOCIAL_HOUSING: 'Registered provider of social housing or local authority',
  COMMUNITY_LANDLORD: 'Community landlord',
  MORTGAGE_LENDER: 'Mortgage lender',
  OTHER: 'Other',
};

export const STATEMENT_OF_TRUTH_COMPLETED_BY_LABELS: Record<string, string> = {
  CLAIMANT: 'Claimant',
  LEGAL_REPRESENTATIVE: "Claimant's legal representative (as defined by CPR 2.3 (1))",
};

export const GROUND_LABELS: Record<string, string> = {
  ABSOLUTE_GROUNDS: 'Absolute grounds',
  ADAPTED_ACCOMMODATION: 'Adapted accommodation (ground 13)',
  ALTERNATIVE_ACCOMMODATION_GROUND9: 'Suitable alternative accommodation (ground 9)',
  ANTISOCIAL_BEHAVIOUR_GROUND7A: 'Antisocial behaviour (ground 7A)',
  ANTISOCIAL_BEHAVIOUR_S157: 'Antisocial behaviour (breach of contract) (section 157)',
  ANTI_SOCIAL: 'Antisocial behaviour',
  BREACH_OF_TENANCY: 'Breach of the tenancy',
  BREACH_OF_THE_TENANCY: 'Breach of the tenancy',
  BREACH_TENANCY_GROUND12: 'Breach of tenancy conditions (ground 12)',
  BUILDING_WORKS: 'Building works (ground A)',
  CHARITABLE_LANDLORD: 'Charitable landlords (ground 11)',
  CHARITIES: 'Charities (ground C)',
  CONVERTED_FIXED_TERM_SCH12_25B2:
    'Notice given in relation to end of converted fixed term standard contract (paragraph 25B(2) of Schedule 12)',
  DEATH_OF_TENANT_GROUND7: 'Death of the tenant (ground 7)',
  DETERIORATION_FURNITURE_GROUND15: 'Deterioration of furniture (ground 15)',
  DETERIORATION_PROPERTY_GROUND13: 'Deterioration in the condition of the property (ground 13)',
  DISABLED_SUITABLE_DWELLING: 'Dwelling suitable for disabled people (ground D)',
  DOMESTIC_VIOLENCE: 'Domestic violence (ground 2A)',
  DOMESTIC_VIOLENCE_GROUND14A: 'Domestic violence (ground 14A)',
  EMPLOYEE_LANDLORD_GROUND16: 'Employee of the landlord (ground 16)',
  ESTATE_MANAGEMENT_GROUNDS_S160: 'Estate management grounds (section 160)',
  FAILURE_TO_GIVE_UP_POSSESSION_S170:
    'Failure to give up possession on date specified in contract-holder’s notice (section 170)',
  FAILURE_TO_GIVE_UP_POSSESSION_S191:
    'Failure to give up possession on date specified in contract-holder’s break clause notice (section 191)',
  FAIL_TO_GIVE_UP_BREAK_NOTICE_S191:
    'Failure to give up possession on date specified in contract-holder’s break clause notice (section 191)',
  FALSE_STATEMENT_GROUND17: 'Tenancy obtained by false statement (ground 17)',
  FURNITURE_DETERIORATION: 'Deterioration of furniture (ground 4)',
  HOLIDAY_LET_GROUND3: 'Holiday let (ground 3)',
  HOUSING_ASSOCIATIONS_AND_TRUSTS: 'Housing associations and housing trusts: people difficult to house (ground E)',
  HOUSING_ASSOCIATION_SPECIAL_CIRCUMSTANCES: 'Housing association special circumstances accommodation (ground 14)',
  JOINT_CONTRACT_HOLDERS: 'Joint contract-holders (ground H)',
  LANDLORD_BREAK_CLAUSE_S199: 'Notice given under a landlord’s break clause (section 199)',
  LANDLORD_NOTICE_FT_END_S186: 'Landlord’s notice in connection with end of fixed term given (section 186)',
  LANDLORD_NOTICE_PERIODIC_S178: 'Landlord’s notice given in relation to periodic standard contract (section 178)',
  LANDLORD_NOTICE_S186: 'Landlord’s notice in connection with end of fixed term given (section 186)',
  LANDLORD_NOTICE_S199: 'Notice given under a landlord’s break clause (section 199)',
  LANDLORD_WORKS: 'Landlord’s works (ground 10)',
  MINISTER_RELIGION_GROUND5: 'Property required for minister of religion (ground 5)',
  NO_GROUNDS: 'No grounds',
  NO_RIGHT_TO_RENT_GROUND7B: 'Tenant does not have a right to rent (ground 7B)',
  NUISANCE_ANNOYANCE_GROUND14: 'Nuisance, annoyance, illegal or immoral use of the property (ground 14)',
  NUISANCE_OR_IMMORAL_USE: 'Nuisance, annoyance, illegal or immoral use of the property (ground 2)',
  OFFENCE_RIOT_GROUND14ZA: 'Offence during a riot (ground 14ZA)',
  OTHER: 'Other',
  OTHER_BREACH_OF_CONTRACT_S157: 'Other breach of contract (section 157)',
  OTHER_ESTATE_MANAGEMENT_REASONS: 'Other estate management reasons (ground I)',
  OVERCROWDING: 'Overcrowding (ground 9)',
  OWNER_OCCUPIER_GROUND1: 'Owner occupier (ground 1)',
  PERSISTENT_DELAY_GROUND11: 'Persistent delay in paying rent (ground 11)',
  PREMIUM_PAID_MUTUAL_EXCHANGE: 'Premium paid in connection with mutual exchange (ground 6)',
  PROPERTY_DETERIORATION: 'Deterioration in the condition of the property (ground 3)',
  PROPERTY_SOLD: 'Property sold for redevelopment (ground 10A)',
  REDEVELOPMENT_GROUND6: 'Property required for redevelopment (ground 6)',
  REDEVELOPMENT_SCHEMES: 'Redevelopment schemes (ground B)',
  REFUSAL_TO_MOVE_BACK: 'Refusal to move back to main home after works completed (ground 8)',
  RENT_ARREARS: 'Rent arrears',
  RENT_ARREARS_GROUND10: 'Rent arrears (ground 10)',
  RENT_ARREARS_OR_BREACH_OF_TENANCY: 'Rent arrears or breach of the tenancy (ground 1)',
  RENT_ARREARS_S157: 'Rent arrears (breach of contract) (section 157)',
  REPOSSESSION_GROUND2: 'Repossession by the landlord’s mortgage lender (ground 2)',
  RESERVE_SUCCESSORS: 'Reserve successors (ground G)',
  RIOT_OFFENCE: 'Offence during a riot (ground 2ZA)',
  S84A_CONDITION_1: 'Condition 1 of Section 84A of the Housing Act 1985',
  S84A_CONDITION_2: 'Condition 2 of Section 84A of the Housing Act 1985',
  S84A_CONDITION_3: 'Condition 3 of Section 84A of the Housing Act 1985',
  S84A_CONDITION_4: 'Condition 4 of Section 84A of the Housing Act 1985',
  S84A_CONDITION_5: 'Condition 5 of Section 84A of the Housing Act 1985',
  SERIOUS_ARREARS_FIXED_TERM_S187:
    'Contract-holder under a fixed term standard contract seriously in arrears with rent (section 187)',
  SERIOUS_ARREARS_PERIODIC_S181:
    'Contract-holder under a periodic standard contract seriously in arrears with rent (section 181)',
  SERIOUS_RENT_ARREARS_GROUND8: 'Serious rent arrears (ground 8)',
  SPECIAL_NEEDS_ACCOMMODATION: 'Special needs accommodation (ground 15)',
  SPECIAL_NEEDS_DWELLINGS: 'Groups of dwellings for people with special needs (ground F)',
  STUDENT_LET_GROUND4: 'Student let (ground 4)',
  TENANCY_OBTAINED_BY_FALSE_STATEMENT: 'Tenancy obtained by false statement (ground 5)',
  TIED_ACCOMMODATION_NEEDED_FOR_EMPLOYEE: 'Tied accommodation needed for another employee (ground 12)',
  UNDER_OCCUPYING_AFTER_SUCCESSION: 'Under occupying after succession (ground 15A)',
  UNREASONABLE_CONDUCT_TIED_ACCOMMODATION: 'Unreasonable conduct in tied accommodation (ground 7)',
};

export const GROUND_COLLECTION_PATHS = [
  'introGrounds_IntroductoryDemotedOrOtherGrounds',
  'rentArrears_RentArrearsGrounds',
  'rentArrears_AdditionalMandatoryGrounds',
  'rentArrears_AdditionalDiscretionaryGrounds',
  'noRentArrears_MandatoryGrounds',
  'noRentArrears_DiscretionaryGrounds',
  'secureOrFlexibleMandatoryGrounds',
  'secureOrFlexibleDiscretionaryGrounds',
  'secureOrFlexibleMandatoryGroundsAlt',
  'secureOrFlexibleDiscretionaryGroundsAlt',
  'secureGroundsWales_MandatoryGrounds',
  'secureGroundsWales_DiscretionaryGrounds',
  'possessionGroundsWales_MandatoryGrounds',
  'possessionGroundsWales_DiscretionaryGrounds',
  'estateManagementGroundsWales',
];

export const REASON_FIELDS = [
  { path: 'absoluteGrounds', label: 'absoluteGrounds' },
  { path: 'antiSocialBehaviourGround', label: 'antiSocialBehaviourGround' },
  { path: 'antiSocialGround', label: 'antiSocialGround' },
  { path: 'breachOfTheTenancyGround', label: 'breachOfTheTenancyGround' },
  { path: 'breachOfTenancyGround', label: 'breachOfTenancyGround' },
  { path: 'breachOfTenancyConditionsReason', label: 'breachOfTenancyConditionsReason' },
  { path: 'domesticViolenceGround', label: 'domesticViolenceGround' },
  { path: 'domesticViolenceReason', label: 'domesticViolenceReason' },
  { path: 'ownerOccupierReason', label: 'ownerOccupierReason' },
  { path: 'studentLetReason', label: 'studentLetReason' },
  { path: 'suitableAltAccommodationReason', label: 'suitableAltAccommodationReason' },
  { path: 'assuredNoArrearsReasons_AntisocialBehaviour', label: 'assuredNoArrearsReasonsAntisocialBehaviour' },
  {
    path: 'assuredNoArrearsReasons_BreachOfTenancyConditions',
    label: 'assuredNoArrearsReasonsBreachOfTenancyConditions',
  },
  { path: 'assuredNoArrearsReasons_DeathOfTenant', label: 'assuredNoArrearsReasonsDeathOfTenant' },
  { path: 'assuredNoArrearsReasons_DomesticViolence', label: 'assuredNoArrearsReasonsDomesticViolence' },
  { path: 'assuredNoArrearsReasons_FalseStatement', label: 'assuredNoArrearsReasonsFalseStatement' },
  { path: 'assuredNoArrearsReasons_FurnitureDeterioration', label: 'assuredNoArrearsReasonsFurnitureDeterioration' },
  { path: 'assuredNoArrearsReasons_HolidayLet', label: 'assuredNoArrearsReasonsHolidayLet' },
  { path: 'assuredNoArrearsReasons_LandlordEmployee', label: 'assuredNoArrearsReasonsLandlordEmployee' },
  {
    path: 'assuredNoArrearsReasons_MinisterOfReligion',
    label: 'assuredNoArrearsReasonsMinisterOfReligion',
  },
  { path: 'assuredNoArrearsReasons_NoRightToRent', label: 'assuredNoArrearsReasonsNoRightToRent' },
  {
    path: 'assuredNoArrearsReasons_NuisanceOrIllegalUse',
    label: 'assuredNoArrearsReasonsNuisanceOrIllegalUse',
  },
  { path: 'assuredNoArrearsReasons_OffenceDuringRiot', label: 'assuredNoArrearsReasonsOffenceDuringRiot' },
  { path: 'assuredNoArrearsReasons_OwnerOccupier', label: 'assuredNoArrearsReasonsOwnerOccupier' },
  {
    path: 'assuredNoArrearsReasons_PropertyDeterioration',
    label: 'assuredNoArrearsReasonsPropertyDeterioration',
  },
  { path: 'assuredNoArrearsReasons_Redevelopment', label: 'assuredNoArrearsReasonsRedevelopment' },
  {
    path: 'assuredNoArrearsReasons_RepossessionByLender',
    label: 'assuredNoArrearsReasonsRepossessionByLender',
  },
  { path: 'assuredNoArrearsReasons_StudentLet', label: 'assuredNoArrearsReasonsStudentLet' },
  {
    path: 'assuredNoArrearsReasons_SuitableAlternativeAccomodation',
    label: 'assuredNoArrearsReasonsSuitableAlternativeAccomodation',
  },
  {
    path: 'walesFailToGiveUpS170Reason',
    label: 'walesFailToGiveUpS170Reason',
  },
  {
    path: 'walesFailToGiveUpBreakNoticeS191Reason',
    label: 'walesFailToGiveUpBreakNoticeS191Reason',
  },
  {
    path: 'walesLandlordNoticeFtEndS186Reason',
    label: 'walesLandlordNoticeFtEndS186Reason',
  },
  { path: 'walesLandlordBreakClauseS199Reason', label: 'walesLandlordBreakClauseS199Reason' },
  { path: 'walesOtherBreachSection157Reason', label: 'walesOtherBreachSection157Reason' },
  {
    path: 'walesSecureFailureToGiveUpPossessionSection170Reason',
    label: 'walesSecureFailureToGiveUpPossessionSection170Reason',
  },
  {
    path: 'walesSecureFailureToGiveUpPossessionSection191Reason',
    label: 'walesSecureFailureToGiveUpPossessionSection191Reason',
  },
  {
    path: 'walesSecureLandlordNoticeSection186Reason',
    label: 'walesSecureLandlordNoticeSection186Reason',
  },
  {
    path: 'walesSecureLandlordNoticeSection199Reason',
    label: 'walesSecureLandlordNoticeSection199Reason',
  },
  { path: 'walesSecureOtherBreachOfContractReason', label: 'walesSecureOtherBreachOfContractReason' },
];
