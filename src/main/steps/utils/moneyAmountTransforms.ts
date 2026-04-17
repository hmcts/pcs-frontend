import { Logger } from '@modules/logger';

const logger = Logger.getLogger('moneyAmountTransforms');

type MoneyGbpValue = {
  amount?: number | string;
};

function warnUnexpectedMoney(context: string, value: unknown): void {
  logger.warn(`Unexpected money value [${context}]: ${JSON.stringify(value)}`);
}

function parseOptionalFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return undefined;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function poundsStringToPence(value: string): number | undefined {
  const parsed = parseOptionalFiniteNumber(value);
  if (parsed === undefined) {
    return undefined;
  }
  return Math.round(parsed * 100);
}

/** MoneyGBP-style values stored as whole pence (digit-only string or numeric pence). */
export function ccdPenceToPoundsString(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return undefined;
    }
    if (/^\d+$/.test(trimmed)) {
      const pence = Number(trimmed);
      if (!Number.isFinite(pence)) {
        warnUnexpectedMoney('ccdPenceToPoundsString:digitString', value);
        return undefined;
      }
      return (pence / 100).toFixed(2);
    }
    warnUnexpectedMoney('ccdPenceToPoundsString:string', value);
    return undefined;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      warnUnexpectedMoney('ccdPenceToPoundsString:number', value);
      return undefined;
    }
    return (value / 100).toFixed(2);
  }

  warnUnexpectedMoney('ccdPenceToPoundsString:type', value);
  return undefined;
}

function penceToPoundsString(value: unknown): string | undefined {
  const getPenceAmount = (amountValue: unknown): number | undefined => {
    const parsed = parseOptionalFiniteNumber(amountValue);
    if (parsed === undefined && amountValue !== undefined && amountValue !== null && amountValue !== '') {
      warnUnexpectedMoney('penceToPoundsString:object.amount', amountValue);
    }
    return parsed;
  };

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      warnUnexpectedMoney('penceToPoundsString:number', value);
      return undefined;
    }
    return value.toFixed(2);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return undefined;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      warnUnexpectedMoney('penceToPoundsString:string', value);
      return undefined;
    }
    return parsed.toFixed(2);
  }

  if (typeof value === 'object' && value !== null) {
    const penceAmount = getPenceAmount((value as MoneyGbpValue).amount);
    if (penceAmount === undefined) {
      return undefined;
    }
    return (penceAmount / 100).toFixed(2);
  }

  if (value !== undefined && value !== null) {
    warnUnexpectedMoney('penceToPoundsString:unsupported', value);
  }
  return undefined;
}

/** Maps CCD MoneyGBP (pence string), legacy { amount: pence }, or numeric forms to pounds for the form. */
export function additionalRentContributionToPoundsString(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) {
      const pence = Number(trimmed);
      if (!Number.isFinite(pence)) {
        warnUnexpectedMoney('additionalRentContributionToPoundsString:digitString', value);
        return undefined;
      }
      return (pence / 100).toFixed(2);
    }
  }

  return penceToPoundsString(value);
}
