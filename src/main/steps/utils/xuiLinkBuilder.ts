import config from 'config';

export function buildCaseOverviewUrl(caseReference: string): string {
  const xuiBaseUri: string = config.get('xui.uri');

  return `${xuiBaseUri}/cases/case-details/PCS/PCS/${caseReference}`;
}
