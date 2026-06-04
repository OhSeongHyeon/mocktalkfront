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
  return date.toLocaleDateString('ko-KR', options);
};

const formatKoreanDateTime = (value: string | null, fallback = '-') => {
  if (!value) {
    return fallback;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('ko-KR');
};

export { formatKoreanDate, formatKoreanDateTime };
