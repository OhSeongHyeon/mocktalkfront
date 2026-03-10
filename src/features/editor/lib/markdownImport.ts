export interface MarkdownImportMetadata {
  title?: string;
  tags: string[];
  boardSlug?: string;
  visibility?: string;
  summary?: string;
}

export interface MarkdownImportResult {
  content: string;
  metadata: MarkdownImportMetadata;
  hadFrontmatter: boolean;
  unsupportedFields: string[];
  warnings: string[];
}

const FRONTMATTER_BOUNDARY_PATTERN = /^---\s*$/;
const FRONTMATTER_END_PATTERN = /^(---|\.\.\.)\s*$/;
const LIST_ITEM_PATTERN = /^\s*-\s+(.*)$/;

const FRONTMATTER_KEY_ALIASES: Record<string, keyof MarkdownImportMetadata | null> = {
  title: 'title',
  tags: 'tags',
  boardslug: 'boardSlug',
  board_slug: 'boardSlug',
  'board-slug': 'boardSlug',
  visibility: 'visibility',
  summary: 'summary',
};

const stripUtf8Bom = (value: string) => value.replace(/^\uFEFF/, '');

const decodeQuotedValue = (value: string) => {
  if (value.length < 2) {
    return value;
  }
  const first = value[0];
  const last = value[value.length - 1];
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    const inner = value.slice(1, -1);
    return inner.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
  }
  return value;
};

const parseScalar = (rawValue: string) => decodeQuotedValue(rawValue.trim());

const splitInlineArrayItems = (rawValue: string) => {
  const items: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;

  for (let index = 0; index < rawValue.length; index += 1) {
    const char = rawValue[index];
    if ((char === '"' || char === "'") && rawValue[index - 1] !== '\\') {
      if (quote === char) {
        quote = null;
      } else if (quote === null) {
        quote = char;
      }
    }

    if (char === ',' && quote === null) {
      items.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    items.push(current.trim());
  }

  return items;
};

const parseInlineArray = (rawValue: string) => {
  const trimmed = rawValue.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    return null;
  }

  const body = trimmed.slice(1, -1).trim();
  if (!body) {
    return [];
  }

  return splitInlineArrayItems(body).map(parseScalar).filter(Boolean);
};

const resolveCanonicalKey = (rawKey: string) => FRONTMATTER_KEY_ALIASES[rawKey.trim().toLowerCase()] ?? null;

const resolveTitleFromFileName = (fileName?: string | null) => {
  if (!fileName) {
    return undefined;
  }

  const baseName = fileName.replace(/\.[^.]+$/, '').trim();
  if (!baseName) {
    return undefined;
  }

  return baseName.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
};

const createInitialMetadata = (): MarkdownImportMetadata => ({
  tags: [],
});

export const parseMarkdownImport = (rawText: string, fileName?: string | null): MarkdownImportResult => {
  const normalizedText = stripUtf8Bom(rawText);
  const fallbackTitle = resolveTitleFromFileName(fileName);
  const lines = normalizedText.split(/\r?\n/);
  const metadata = createInitialMetadata();
  const warnings: string[] = [];
  const unsupportedFields: string[] = [];
  const firstLine = lines[0] ?? '';

  if (lines.length === 0 || !FRONTMATTER_BOUNDARY_PATTERN.test(firstLine)) {
    if (fallbackTitle) {
      metadata.title = fallbackTitle;
    }
    return {
      content: normalizedText,
      metadata,
      hadFrontmatter: false,
      unsupportedFields,
      warnings,
    };
  }

  let endIndex = -1;
  for (let index = 1; index < lines.length; index += 1) {
    const nextLine = lines[index] ?? '';
    if (FRONTMATTER_END_PATTERN.test(nextLine)) {
      endIndex = index;
      break;
    }
  }

  if (endIndex === -1) {
    if (fallbackTitle) {
      metadata.title = fallbackTitle;
    }
    warnings.push('frontmatter 닫힘 구분자를 찾지 못해 파일 본문 전체를 그대로 불러왔습니다.');
    return {
      content: normalizedText,
      metadata,
      hadFrontmatter: false,
      unsupportedFields,
      warnings,
    };
  }

  const frontmatterLines = lines.slice(1, endIndex);
  let index = 0;

  while (index < frontmatterLines.length) {
    const line = frontmatterLines[index] ?? '';
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      index += 1;
      continue;
    }

    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
      warnings.push(`frontmatter 줄을 해석하지 못해 무시했습니다: ${trimmed}`);
      index += 1;
      continue;
    }

    const rawKey = line.slice(0, separatorIndex).trim();
    const canonicalKey = resolveCanonicalKey(rawKey);
    const rawValue = line.slice(separatorIndex + 1).trim();

    if (!canonicalKey) {
      unsupportedFields.push(rawKey);
      index += 1;
      continue;
    }

    if (canonicalKey === 'tags') {
      const inlineArray = parseInlineArray(rawValue);
      if (inlineArray !== null) {
        metadata.tags = inlineArray;
        index += 1;
        continue;
      }

      if (rawValue) {
        metadata.tags = [parseScalar(rawValue)].filter(Boolean);
        index += 1;
        continue;
      }

      const listItems: string[] = [];
      index += 1;
      while (index < frontmatterLines.length) {
        const nextLine = frontmatterLines[index] ?? '';
        const listMatch = nextLine.match(LIST_ITEM_PATTERN);
        if (!listMatch) {
          break;
        }
        listItems.push(parseScalar(listMatch[1] ?? ''));
        index += 1;
      }
      metadata.tags = listItems.filter(Boolean);
      continue;
    }

    const scalarValue = parseScalar(rawValue);
    if (canonicalKey === 'visibility') {
      metadata.visibility = scalarValue ? scalarValue.toUpperCase() : undefined;
      index += 1;
      continue;
    }

    metadata[canonicalKey] = scalarValue || undefined;
    index += 1;
  }

  if (!metadata.title && fallbackTitle) {
    metadata.title = fallbackTitle;
  }

  const body = lines
    .slice(endIndex + 1)
    .join('\n')
    .replace(/^(?:\r?\n)+/, '');

  return {
    content: body,
    metadata,
    hadFrontmatter: true,
    unsupportedFields: Array.from(new Set(unsupportedFields)),
    warnings,
  };
};
