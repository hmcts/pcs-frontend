import type { TFunction } from 'i18next';
import { DateTime } from 'luxon';

export function formatDateViaI18n(dt: DateTime, t: TFunction): string {
  const day = String(dt.day);
  const monthKey = String(dt.month); // 1..12
  const month = t(`months.${monthKey}`, monthKey); // falls back to number if missing
  const year = String(dt.year);
  // allow languages to change order via a translatable template
  const tpl = t('dateFormatLong', '{{day}} {{month}} {{year}}');
  return tpl.replace('{{day}}', day).replace('{{month}}', month).replace('{{year}}', year);
}
