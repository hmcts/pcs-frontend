import { toDateLocale, toUkDateTime } from '@utils/formatLocalisedDate';

type FilterContext = { ctx?: { lang?: string } } | void;

// A plain function so Nunjucks can bind `this` to the render context, which carries the request's `lang`.
// The shared env globals are rewritten on every request, so they are not safe to read here.
export function date(this: FilterContext, isoDateUtc: string, format: string = 'd LLLL y', lang?: string): string {
  const dateTime = toUkDateTime(isoDateUtc);
  return dateTime ? dateTime.setLocale(toDateLocale(lang ?? this?.ctx?.lang)).toFormat(format) : '';
}
