const resolveBoardSummaryDescription = (description: string | null, fallback = '설명이 없습니다.') => {
  const trimmed = description?.trim();
  return trimmed ? trimmed : fallback;
};

export { resolveBoardSummaryDescription };
