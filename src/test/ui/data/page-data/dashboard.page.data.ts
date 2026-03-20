export const dashboard = {
  mainHeader: `${process.env.DEFENDENT_CORRESPONDENCE_ADDRESS}`,
  caseNumberParagraph: (): string => `Case number: ${process.env.CASE_FID}`,
};
