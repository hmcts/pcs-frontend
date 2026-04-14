type MoneyGbpValue = {
  amount?: number | string;
};

export function poundsStringToPence(value: string): number | undefined {
  const parsed = Number(value.trim());
  if (Number.isFinite(parsed)) {
    return Math.round(parsed * 100);
  }

  return undefined;
}

function penceToPoundsString(value: unknown): string | undefined {
  const getPenceAmount = (amountValue: unknown): number | undefined => {
    if (typeof amountValue === 'number' && Number.isFinite(amountValue)) {
      return amountValue;
    }

    if (typeof amountValue === 'string' && amountValue.trim()) {
      const parsed = Number(amountValue.trim());
      return Number.isFinite(parsed) ? parsed : undefined;
    }

    return undefined;
  };

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toFixed(2);
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed.toFixed(2) : undefined;
  }

  if (typeof value === 'object' && value !== null) {
    const penceAmount = getPenceAmount((value as MoneyGbpValue).amount);
    if (penceAmount === undefined) {
      return undefined;
    }

    return (penceAmount / 100).toFixed(2);
  }

  return undefined;
}

/** Maps CCD MoneyGBP (pence string), legacy { amount: pence }, or numeric forms to pounds for the form. */
export function additionalRentContributionToPoundsString(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const pence = Number(value.trim());
    return Number.isFinite(pence) ? (pence / 100).toFixed(2) : undefined;
  }

  return penceToPoundsString(value);
}
