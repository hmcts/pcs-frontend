export const speakDigits = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) {
    return '';
  }

  const digits = String(value).replace(/\D/g, '');
  return digits.split('').join(', ');
};
