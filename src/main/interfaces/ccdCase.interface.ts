export interface CcdUserCases {
  total: number;
  cases: CcdCase[];
}

export interface CcdCaseData {
  applicantForename: string;
  applicantSurname: string;
  applicantAddress: {
    AddressLine1: string;
    AddressLine2: string;
    AddressLine3: string;
    PostTown: string;
    County: string;
    PostCode: string;
    Country: string;
  };
}


export interface CcdCase {
  id: string;
  data: CcdCaseData;
}
