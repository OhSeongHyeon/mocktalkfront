import { type AppLocale, i18n, toIntlLocaleTag } from '../i18n';

const resolveIntlLocale = () => toIntlLocaleTag(i18n.global.locale.value as AppLocale);

const formatKoreanDate = (
  value: string,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  },
) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(resolveIntlLocale(), options);
};

const formatKoreanDateTime = (value: string | null, fallback = '-') => {
  if (!value) {
    return fallback;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(resolveIntlLocale());
};

export { formatKoreanDate, formatKoreanDateTime };
