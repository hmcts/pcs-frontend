import type { TFunction } from 'i18next';

import { toDateLocale } from '@utils/formatLocalisedDate';
import { buildNoticeDetailsSection } from '@utils/viewTheClaim/viewTheClaimSections';
import { type ViewTheClaimCopy, buildViewTheClaimPageData } from '@utils/viewTheClaim/viewTheClaimUtils';

const t = ((key: string) => key) as unknown as TFunction;

const copyFor = (language: string): ViewTheClaimCopy => ({
  section: key => key,
  label: key => key,
  text: key => key,
  value: (_key, english) => english,
  personsUnknown: '',
  addressUnknown: '',
  locale: toDateLocale(language),
});

const rowText = (rows: { key: { text: string }; value: { text?: string } }[] | undefined, label: string) =>
  rows?.find(row => row.key.text === label)?.value.text;

describe('View the claim dates', () => {
  const noticeData = {
    detailsTab_NoticeDetails: { noticeServed: 'Yes' },
    notice_HandedOverDateTime: '2024-07-15T13:45:00Z',
  };

  it('shows the notice date and time in English', () => {
    const section = buildNoticeDetailsSection(noticeData, [], '1234567890123456', copyFor('en'));

    expect(rowText(section?.rows, 'noticeDate')).toBe('15 July 2024');
    expect(rowText(section?.rows, 'noticeTime')).toBe('14:45');
  });

  it('shows the notice date in Welsh', () => {
    const section = buildNoticeDetailsSection(noticeData, [], '1234567890123456', copyFor('cy'));

    expect(rowText(section?.rows, 'noticeDate')).toBe('15 Gorffennaf 2024');
    expect(rowText(section?.rows, 'noticeTime')).toBe('14:45');
  });

  it('shows the issued and submitted dates in Welsh', () => {
    const page = buildViewTheClaimPageData(
      '1234567890123456',
      { claimIssueDate: '2026-02-05', dateSubmitted: '2026-06-24T12:23:59.791346' } as never,
      t,
      'cy'
    );

    expect(page.pageMetadataRows.map(row => row.value.text)).toEqual(['5 Chwefror 2026', '24 Mehefin 2026']);
  });
});
