export const setAttribute = (
  dictionary: Record<string, unknown>,
  key: string,
  value: unknown
): Record<string, unknown> => {
  dictionary[key] = value;
  return dictionary;
};
