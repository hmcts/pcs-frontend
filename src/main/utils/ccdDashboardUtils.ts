import type {
  CcdCaseAddress,
  CcdCollectionItem,
  CcdDashboardNotification,
  CcdDashboardTaskGroup,
  CcdTemplateKeyValue,
} from '@interfaces/ccdCase.interface';
import type { DashboardNotification } from '@services/pcsApi/dashboardNotification.interface';
import type { DashboardTask, DashboardTaskGroup } from '@services/pcsApi/dashboardTaskGroup.interface';

export function formatAddress(addr: CcdCaseAddress | undefined): string | undefined {
  if (!addr) {
    return undefined;
  }
  return [addr.AddressLine1, addr.AddressLine2, addr.AddressLine3, addr.PostTown, addr.County, addr.PostCode]
    .filter(Boolean)
    .join(', ');
}

function unwrapCollection<T>(items: CcdCollectionItem<T>[] | undefined): T[] {
  return (items ?? []).map(item => item.value);
}

function flattenTemplateValues(items: CcdCollectionItem<CcdTemplateKeyValue>[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const item of items) {
    result[item.value.key] = item.value.value;
  }
  return result;
}

/** Unwraps CCD-wrapped notifications to flat shape */
export function unwrapNotifications(
  raw: CcdCollectionItem<CcdDashboardNotification>[] | undefined
): DashboardNotification[] {
  return unwrapCollection(raw).map(n => ({
    templateId: n.templateId,
    templateValues: flattenTemplateValues(n.templateValues ?? []),
  }));
}

/** Unwraps CCD-wrapped task groups into the flat shape */
export function unwrapTaskGroups(raw: CcdCollectionItem<CcdDashboardTaskGroup>[] | undefined): DashboardTaskGroup[] {
  return unwrapCollection(raw).map(g => ({
    groupId: g.groupId as DashboardTaskGroup['groupId'],
    tasks: unwrapCollection(g.tasks).map(
      (t): DashboardTask => ({
        templateId: t.templateId,
        status: t.status,
        templateValues: {},
      })
    ),
  }));
}
