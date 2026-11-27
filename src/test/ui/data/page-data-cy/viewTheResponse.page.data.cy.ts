const getCurrentResponseDate = (): string =>
  new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

export const viewTheResponse = {
  mainHeader: `Gweld yr ymateb`,
  theResponseCaption: `Yr ymateb`,
  claimantDetailsSubHeader: `Manylion yr hawlydd`,
  defendant1SubHeader: `Manylion diffynnydd 1`,
  responseToClaimSubHeader: `Ymateb i hawliad yr hawlydd`,
  paymentsOrAgreementsSubHeader: `Taliadau neu gytundebau ers gwneud yr hawliad`,
  yourHouseholdSubHeader: `Eich cartref a’ch amgylchiadau`,
  regularIncomeSubHeader: `Incwm rheolaidd`,
  priorityDebtsSubHeader: `Dyledion blaenoriaeth`,
  regularExpensesSubHeader: `Costau rheolaidd`,
  additionalInformationSubHeader: `Gwybodaeth ychwanegol`,
  counterclaimSubHeader: `Gwrth-hawliad`,
  statementOfTruthSubHeader: `Datganiad gwirionedd`,
  closeAndReturnButton: `Cau a dychwelyd i drosolwg o’r achos`,
  ifYouCannotFindLink: `Os na allwch ddod o hyd i ddogfen rydych yn chwilio amdani yn yr adran hon`,
  downloadPDFLink: `Lawrlwythwch gopi PDF o’r ymateb`,
  responsePDFLink: `Ymateb (PDF)`,
  counterClaimPDFLink: `Gwrth-hawliad (PDF)`,
  iBelieveTheFactsParagraph: `Credaf fod y ffeithiau a nodir yn y ffurflen amddiffyniad hon yn wir. Deallaf y gellir dwyn achos dirmyg llys yn erbyn unrhyw un sy’n gwneud datganiad anwir, neu sy’n achosi i ddatganiad anwir gael ei wneud mewn dogfen a ddilysir gan ddatganiad gwirionedd heb gredu’n onest ei fod yn wir.`,
  claimantDetails: {
    Enw: 'Possession Claims Solicitor Org',
    'Cyfeiriad ar gyfer cyflwyno': 'Ministry Of Justice, Seventh Floor 102 Petty France, London, SW1H 9AJ',
  },
  responseToClaimDetails: {
    'A yw’r math o denantiaeth, contract meddiannaeth neu gytundeb trwydded a roddwyd gan yr hawlydd yn gywir?': 'Ydy',
    'A yw dyddiad dechrau’r denantiaeth, contract meddiannaeth neu gytundeb trwydded a roddwyd gan yr hawlydd yn gywir?':
      'Ydy',
    'A yw eich landlord wedi anfon telerau ysgrifenedig atoch o’r contract meddiannaeth?': 'Ydy',
    'A wnaeth yr hawlydd eich hysbysu am eu bwriad i ddechrau achos meddiannu?': 'Do',
    'Pryd gawsoch yr hysbysiad gan yr hawlydd?': '10 Mawrth 2026',
    'A yw’r swm ôl-ddyledion rhent a roddwyd gan yr hawlydd yn gywir?': 'Ydy',
    'A ydych yn gwrthwynebu unrhyw rannau eraill o’r hawliad?': 'Nac ydy',
  },
  paymentsOrAgreementsDetails: {
    [`A ydych wedi talu unrhyw arian i Possession Claims Solicitor Org ers ${getCurrentResponseDate()}?`]: 'Do',
    'Manylion taliadau a wnaed': 'Paid £200 on 1 March 2026 by bank transfer.',
    [`A ydych wedi dod i gytundeb gyda Possession Claims Solicitor Org i ad-dalu’r ôl-ddyledion ers ${getCurrentResponseDate()}?`]:
      'Do',
    'Manylion cytundeb ad-dalu': 'Agreed to pay £50 per week until arrears cleared.',
    'A hoffech chi gynnig talu eich ôl-ddyledion mewn rhandaliadau?': 'Hoffwn',
    'Faint allwch chi fforddio’i dalu ar ben eich rhent cyfredol?': '£50.00',
    'Pa mor aml allech chi fforddio talu’r swm hwn?': 'Pob wythnos',
  },
  yourHouseholdDetails: {
    'A oes gennych chi unrhyw blant sy’n ddibynnol arnoch?': 'Oes',
    'Manylion plant sy’n ddibynnol': 'Children aged 4 and 7.',
    'A oes gennych chi unrhyw un arall sy’n ddibynnol arnoch?': 'Nac oes',
    'A oes yna unrhyw oedolion eraill yn byw yn eich cartref?': 'Oes',
    'Manylion oedolion eraill yn byw yn eich cartref': 'Partner is also named on the tenancy agreement.',
    'A fyddai gennych rywle arall i fyw os byddai’n rhaid i chi adael eich cartref?': 'Nid wyf yn siŵr',
    'Hoffech chi rannu unrhyw beth am eich amgylchiadau?': 'Hoffwn',
    'Manylion am eich amgylchiadau': 'Recent job loss affecting ability to pay rent.',
    'A fyddech yn profi caledi eithriadol os gofynnir i chi adael eich cartref?': 'Byddwn',
    'Manylion am y caledi eithriadol y byddech yn ei brofi': 'Two young children in the household.',
  },
  regularIncomeDetails: {
    'Incwm o bob swydd a wneir gennych': '£1800.00 derbynnir bob mis',
    'Credyd Cynhwysol': '£400.00 derbynnir bob mis',
    'Budd-daliadau a chredydau eraill': '£120.00 derbynnir bob mis',
  },
  priorityDebtsDetails: {
    'A oes gennych chi unrhyw ddyledion blaenoriaeth?': 'Oes',
    'Beth yw’r cyfanswm sy’n ddyledus gennych ar gyfer eich holl ddyledion blaenoriaeth?': '£3000.00',
    'Faint ydych yn ei dalu tuag at eich dyledion blaenoriaeth bob wythnos neu fis?': '£75.00 telir bob mis',
  },
  regularExpensesDetails: {
    'Biliau’r cartref (e.e. treth y cyngor, nwy, trydan, dŵr, rhyngrwyd)': '£450.00 telir bob mis',
    'Taliadau benthyciadau': '£150.00 telir bob mis',
    'Ffôn symudol': '£35.00 telir bob mis',
    'Siopa bwyd': '£280.00 telir bob mis',
    'Tanwydd, parcio a chludiant': '£90.00 telir bob mis',
    'Costau ysgol (er enghraifft, gwisg a chinio ysgol)': '£60.00 telir bob mis',
    Dillad: '£40.00 telir bob mis',
    Arall: '£25.00 telir bob mis',
  },
  additionalInformationDetails: {
    'Oes yna unrhyw beth arall rydych eisiau ei ddweud wrth y llys fel rhan o’ch ymateb?': 'Oes',
    'Manylion beth arall rydych eisiau ei ddweud wrth y llys': 'I have been in contact with the council housing team.',
  },
  counterclaimDetails: {
    'Beth ydych chi’n ei hawlio?': 'Swm o arian neu iawndal',
    'Ydych chi’n hawlio ar gyfer swm penodol o arian?': 'Ydw',
    'Faint ydych chi’n ei hawlio?': '£1500.00',
    'Ar gyfer beth mae eich gwrth-hawliad?': 'Deposit not returned after tenancy ended',
    'Beth yw eich rhesymau dros wneud y gwrth-hawliad?': 'Landlord withheld deposit without valid reason',
    'Ydych chi angen help i dalu’r ffi gwrth-hawliad?': 'Nid wyf angen help i dalu’r ffi',
  },
  statementOfTruthDetails: {
    'Cwblhawyd gan': 'Test John',
  },
};

export const getDefendantDetails = (firstName: string, lastName: string, address: string) => ({
  Enw: `${firstName} ${lastName}`,
  'Rhif ffôn': '07700900000',
  'Cyfeiriad post': address,
  'Dyddiad geni': '20 Mai 1990',
});

export const getStatementOfTruthDetails = (defendantName: string) => ({
  'Cwblhawyd gan': defendantName,
});
