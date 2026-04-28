import type { CcdCollectionItem, CcdDashboardNotification, CcdDashboardTaskGroup } from '@services/ccdCase.interface';
import { formatAddress, unwrapNotifications, unwrapTaskGroups } from '@utils/ccdDashboardUtils';

describe('ccdDashboardUtils', () => {
  describe('formatAddress', () => {
    it('returns undefined when address is undefined', () => {
      expect(formatAddress(undefined)).toBeUndefined();
    });

    it('joins non-empty address parts with comma and space', () => {
      expect(
        formatAddress({
          AddressLine1: '1 High Street',
          AddressLine2: '',
          AddressLine3: undefined,
          PostTown: 'London',
          County: '',
          PostCode: 'E1 1AA',
        })
      ).toBe('1 High Street, London, E1 1AA');
    });
  });

  describe('unwrapNotifications', () => {
    it('returns empty array when raw is undefined', () => {
      expect(unwrapNotifications(undefined)).toEqual([]);
    });

    it('flattens CCD collection and templateValues key/value pairs', () => {
      const raw: CcdCollectionItem<CcdDashboardNotification>[] = [
        {
          id: 'n1',
          value: {
            templateId: 'Defendant.CaseIssued',
            templateValues: [
              { id: 'k1', value: { key: 'claimantName', value: 'Jane' } },
              { id: 'k2', value: { key: 'amount', value: '100' } },
            ],
          },
        },
      ];

      expect(unwrapNotifications(raw)).toEqual([
        {
          templateId: 'Defendant.CaseIssued',
          templateValues: { claimantName: 'Jane', amount: '100' },
        },
      ]);
    });
  });

  describe('unwrapTaskGroups', () => {
    it('returns empty array when raw is undefined', () => {
      expect(unwrapTaskGroups(undefined)).toEqual([]);
    });

    it('unwraps nested CCD collections to flat tasks with templateId and status only', () => {
      const raw: CcdCollectionItem<CcdDashboardTaskGroup>[] = [
        {
          id: 'g1',
          value: {
            groupId: 'CLAIM',
            tasks: [
              {
                id: 't1',
                value: { templateId: 'Defendant.ViewClaim', status: 'AVAILABLE' },
              },
            ],
          },
        },
      ];

      expect(unwrapTaskGroups(raw)).toEqual([
        {
          groupId: 'CLAIM',
          tasks: [{ templateId: 'Defendant.ViewClaim', status: 'AVAILABLE' }],
        },
      ]);
    });
  });
});
