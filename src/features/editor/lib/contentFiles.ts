const extractFileIdsFromContent = (content: string) => {
  if (!content) {
    return [];
  }
  const ids = new Set<number>();
  const regex = /\/api\/files\/(\d+)\/view/g;
  let match: RegExpExecArray | null = null;
  while ((match = regex.exec(content)) !== null) {
    const value = Number(match[1]);
    if (!Number.isNaN(value)) {
      ids.add(value);
    }
  }
  return Array.from(ids);
};

export { extractFileIdsFromContent };
