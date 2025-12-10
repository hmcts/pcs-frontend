import i18next, { type i18n } from 'i18next';
import type { $ZodRawIssue, $ZodErrorMap } from 'zod/v4/core/errors';

// Helper functions from zod-i18n-map library

const jsonStringifyReplacer = (_: string, value: any): any => {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
};

function joinValues<T extends any[]>(array: T, separator = ' | '): string {
  return array
    .map((val) => (typeof val === 'string' ? `'${val}'` : val))
    .join(separator);
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null) return false;

  for (const key in value) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) return false;
  }

  return true;
};

const getKeyAndValues = (
  param: unknown,
  defaultKey: string
): {
  values: Record<string, unknown>;
  key: string;
} => {
  if (typeof param === 'string') return { key: param, values: {} };

  if (isRecord(param)) {
    const key =
      'key' in param && typeof param.key === 'string' ? param.key : defaultKey;
    const values =
      'values' in param && isRecord(param.values) ? param.values : {};

    return { key, values };
  }

  return { key: defaultKey, values: {} };
};

export type ZodI18nMapOption = {
  t?: i18n['t'];
  ns?: string | readonly string[];
  handlePath?: HandlePathOption | false;
};

export type HandlePathOption = {
  context?: string;
  ns?: string | readonly string[];
  keyPrefix?: string;
};

const defaultNs = 'zod';

// Get parsed type from input (adapted from Zod v4)
const getParsedType = (data: unknown): string => {
  if (data === undefined) return 'undefined';
  if (data === null) return 'null';
  const t = typeof data;
  if (t === 'string') return 'string';
  if (t === 'number') return Number.isNaN(data) ? 'nan' : 'number';
  if (t === 'boolean') return 'boolean';
  if (t === 'function') return 'function';
  if (t === 'bigint') return 'bigint';
  if (t === 'symbol') return 'symbol';
  if (t === 'object') {
    if (Array.isArray(data)) return 'array';
    if (data instanceof Date) return 'date';
    if (data instanceof Map) return 'map';
    if (data instanceof Set) return 'set';
    return 'object';
  }
  return 'unknown';
};

/**
 * Create a zod v4 custom error map function using i18next translations
 * Based on zod-i18n-map library approach
 */
export const makeZodI18nMap = (option?: ZodI18nMapOption): $ZodErrorMap => {
  return (issue: $ZodRawIssue, ctx?: { data: unknown }): { message: string } | undefined => {
    // Get translation function - i18next handles language detection automatically
    const { t, ns, handlePath } = {
      t: i18next.t,
      ns: defaultNs,
      ...option,
      handlePath:
        option?.handlePath !== false
          ? {
              context: 'with_path',
              ns: option?.ns ?? defaultNs,
              keyPrefix: undefined,
              ...option?.handlePath,
            }
          : null,
    };

    // Get default message as fallback
    let message: string;
    // In Zod v4, we don't have defaultErrorMap, so we'll use a simple fallback
    message = issue.message || 'Invalid input';
    // console.log('zod-error-map: message', issue.code, issue.message, message, issue.path);

    // Handle path translation
    const pathArray = issue.path || [];
    const path =
      pathArray.length > 0 && !!handlePath
        ? {
            context: handlePath.context,
            path: t(
              [handlePath.keyPrefix, pathArray.join('.')]
                .filter(Boolean)
                .join('.'),
              {
                ns: handlePath.ns,
                defaultValue: pathArray.join('.'),
              }
            ),
          }
        : {};

    // Handle different error codes
    // Use type assertion to handle error codes that may not be in the type union but are valid at runtime
    switch (issue.code as string) {
      case 'invalid_type': {
        const received = getParsedType(issue.input);
        
        if (received === 'undefined') {
          message = t('errors.invalid_type_received_undefined', {
            ns,
            defaultValue: message,
            ...path,
          });
        } else if (received === 'null') {
          message = t('errors.invalid_type_received_null', {
            ns,
            defaultValue: message,
            ...path,
          });
        } else {
          const expected = 'expected' in issue ? String(issue.expected) : 'unknown';
          message = t('errors.invalid_type', {
            expected: t(`types.${expected}`, {
              defaultValue: expected,
              ns,
            }),
            received: t(`types.${received}`, {
              defaultValue: received,
              ns,
            }),
            ns,
            defaultValue: message,
            ...path,
          });
        }
        break;
      }

      case 'invalid_literal': {
        const issueWithExpected = issue as $ZodRawIssue & { expected?: unknown };
        const expected = 'expected' in issueWithExpected ? issueWithExpected.expected : undefined;
        message = t('errors.invalid_literal', {
          expected: JSON.stringify(expected, jsonStringifyReplacer),
          ns,
          defaultValue: message,
          ...path,
        });
        break;
      }

      case 'unrecognized_keys': {
        const keys = 'keys' in issue && Array.isArray(issue.keys) ? issue.keys : [];
        message = t('errors.unrecognized_keys', {
          keys: joinValues(keys, ', '),
          count: keys.length,
          ns,
          defaultValue: message,
          ...path,
        });
        break;
      }

      case 'invalid_union': {
        message = t('errors.invalid_union', {
          ns,
          defaultValue: message,
          ...path,
        });
        break;
      }

      case 'invalid_union_discriminator': {
        const issueWithOptions = issue as $ZodRawIssue & { options?: unknown[] };
        const options = 'options' in issueWithOptions && Array.isArray(issueWithOptions.options) ? issueWithOptions.options : [];
        message = t('errors.invalid_union_discriminator', {
          options: joinValues(options),
          ns,
          defaultValue: message,
          ...path,
        });
        break;
      }

      case 'invalid_enum_value': {
        const issueWithEnum = issue as $ZodRawIssue & { options?: unknown[]; received?: unknown };
        const options = 'options' in issueWithEnum && Array.isArray(issueWithEnum.options) ? issueWithEnum.options : [];
        const received = 'received' in issueWithEnum ? String(issueWithEnum.received) : '';
        message = t('errors.invalid_enum_value', {
          options: joinValues(options),
          received,
          ns,
          defaultValue: message,
          ...path,
        });
        break;
      }

      case 'invalid_arguments': {
        message = t('errors.invalid_arguments', {
          ns,
          defaultValue: message,
          ...path,
        });
        break;
      }

      case 'invalid_return_type': {
        message = t('errors.invalid_return_type', {
          ns,
          defaultValue: message,
          ...path,
        });
        break;
      }

      case 'invalid_date': {
        message = t('errors.invalid_date', {
          ns,
          defaultValue: message,
          ...path,
        });
        break;
      }

      case 'invalid_format': {
        // Map invalid_format to invalid_string translations
        if ('format' in issue && typeof issue.format === 'string') {
          const format = issue.format;
          // Handle special cases for starts_with and ends_with
          if (format === 'starts_with' && 'prefix' in issue) {
            message = t('errors.invalid_string.startsWith', {
              startsWith: String(issue.prefix),
              ns,
              defaultValue: message,
              ...path,
            });
          } else if (format === 'ends_with' && 'suffix' in issue) {
            message = t('errors.invalid_string.endsWith', {
              endsWith: String(issue.suffix),
              ns,
              defaultValue: message,
              ...path,
            });
          } else {
            message = t(`errors.invalid_string.${format}`, {
              validation: t(`validations.${format}`, {
                defaultValue: format,
                ns,
              }),
              ns,
              defaultValue: message,
              ...path,
            });
          }
        }
        break;
      }

      case 'too_small': {
        const origin = 'origin' in issue ? String(issue.origin) : 'string';
        const minimum = 'minimum' in issue ? issue.minimum : undefined;
        const type = origin === 'date' ? 'date' : origin === 'array' ? 'array' : origin === 'number' || origin === 'int' ? 'number' : 'string';
        const exact = 'exact' in issue && issue.exact ? 'exact' : 'inclusive' in issue && issue.inclusive ? 'inclusive' : 'not_inclusive';
        
        const minimumValue = type === 'date' && typeof minimum === 'number' ? new Date(minimum) : minimum;
        
        message = t(
          `errors.too_small.${type}.${exact}`,
          {
            minimum: minimumValue,
            count: typeof minimum === 'number' ? minimum : undefined,
            ns,
            defaultValue: message,
            ...path,
          }
        );
        break;
      }

      case 'too_big': {
        const origin = 'origin' in issue ? String(issue.origin) : 'string';
        const maximum = 'maximum' in issue ? issue.maximum : undefined;
        const type = origin === 'date' ? 'date' : origin === 'array' ? 'array' : origin === 'number' || origin === 'int' ? 'number' : 'string';
        const exact = 'exact' in issue && issue.exact ? 'exact' : 'inclusive' in issue && issue.inclusive ? 'inclusive' : 'not_inclusive';
        
        const maximumValue = type === 'date' && typeof maximum === 'number' ? new Date(maximum) : maximum;
        
        message = t(
          `errors.too_big.${type}.${exact}`,
          {
            maximum: maximumValue,
            count: typeof maximum === 'number' ? maximum : undefined,
            ns,
            defaultValue: message,
            ...path,
          }
        );
        break;
      }

      case 'custom': {
        const { key, values } = getKeyAndValues(
          'params' in issue && issue.params && typeof issue.params === 'object' && 'i18n' in issue.params
            ? issue.params.i18n
            : undefined,
          'errors.custom'
        );

        message = t(key, {
          ...values,
          ns,
          defaultValue: message,
          ...path,
        });
        break;
      }

      case 'invalid_intersection_types': {
        message = t('errors.invalid_intersection_types', {
          ns,
          defaultValue: message,
          ...path,
        });
        break;
      }

      case 'not_multiple_of': {
        const issueWithDivisor = issue as $ZodRawIssue & { divisor?: number };
        const multipleOf = 'divisor' in issueWithDivisor ? issueWithDivisor.divisor : undefined;
        message = t('errors.not_multiple_of', {
          multipleOf,
          ns,
          defaultValue: message,
          ...path,
        });
        break;
      }

      case 'not_finite': {
        message = t('errors.not_finite', {
          ns,
          defaultValue: message,
          ...path,
        });
        break;
      }

      default:
        // For any other error codes, return the default message
        break;
    }

    return { message };
  };
};

// Export default instance
export const zodI18nMap = makeZodI18nMap();

