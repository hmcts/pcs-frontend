export const stringify = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch (error) {
    return '';
  }
};
