const FRONTMATTER_BOUNDARY_PATTERN = /^---\s*$/;
const FRONTMATTER_END_PATTERN = /^(---|\.\.\.)\s*$/;
const TOP_LEVEL_KEY_PATTERN = /^([A-Za-z0-9_-]+)\s*:/;

interface FrontmatterEntry {
  key: string | null;
  normalizedKey: string | null;
  lines: string[];
}

interface FrontmatterSplitResult {
  normalizedSource: string;
  hasFrontmatter: boolean;
  body: string;
  frontmatterLines: string[];
}

interface ManagedFrontmatterValues {
  title?: string | null;
  boardSlug?: string | null;
  visibility?: string | null;
  categoryName?: string | null;
}

interface MergeManagedFrontmatterOptions {
  body?: string;
}

const MANAGED_KEY_ALIASES = new Set(['title', 'boardslug', 'visibility', 'categoryname', 'category_name', 'category-name', 'category']);

const stripUtf8Bom = (value: string) => value.replace(/^\uFEFF/, '');

const normalizeFrontmatterKey = (value: string) => value.replace(/[-_]/g, '').toLowerCase();

const yamlQuote = (value: string) => JSON.stringify(value);

const splitMarkdownFrontmatter = (source: string): FrontmatterSplitResult => {
  const normalizedSource = stripUtf8Bom(source);
  const lines = normalizedSource.split(/\r?\n/);
  const firstLine = lines[0] ?? '';

  if (!FRONTMATTER_BOUNDARY_PATTERN.test(firstLine)) {
    return {
      normalizedSource,
      hasFrontmatter: false,
      body: normalizedSource,
      frontmatterLines: [],
    };
  }

  let endIndex = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (FRONTMATTER_END_PATTERN.test(lines[index] ?? '')) {
      endIndex = index;
      break;
    }
  }

  if (endIndex === -1) {
    return {
      normalizedSource,
      hasFrontmatter: false,
      body: normalizedSource,
      frontmatterLines: [],
    };
  }

  return {
    normalizedSource,
    hasFrontmatter: true,
    body: lines
      .slice(endIndex + 1)
      .join('\n')
      .replace(/^(?:\r?\n)+/, ''),
    frontmatterLines: lines.slice(1, endIndex),
  };
};

const parseFrontmatterEntries = (frontmatterLines: string[]) => {
  const entries: FrontmatterEntry[] = [];
  let index = 0;

  while (index < frontmatterLines.length) {
    const line = frontmatterLines[index] ?? '';
    const keyMatch = line.match(TOP_LEVEL_KEY_PATTERN);

    if (!keyMatch) {
      entries.push({
        key: null,
        normalizedKey: null,
        lines: [line],
      });
      index += 1;
      continue;
    }

    const key = keyMatch[1] ?? '';
    const lines = [line];
    index += 1;

    while (index < frontmatterLines.length) {
      const nextLine = frontmatterLines[index] ?? '';
      if (TOP_LEVEL_KEY_PATTERN.test(nextLine)) {
        break;
      }
      lines.push(nextLine);
      index += 1;
    }

    entries.push({
      key,
      normalizedKey: normalizeFrontmatterKey(key),
      lines,
    });
  }

  return entries;
};

const buildManagedFrontmatterLines = (values: ManagedFrontmatterValues) => {
  const lines: string[] = [];

  if (values.title?.trim()) {
    lines.push(`title: ${yamlQuote(values.title.trim())}`);
  }
  if (values.boardSlug?.trim()) {
    lines.push(`boardSlug: ${yamlQuote(values.boardSlug.trim())}`);
  }
  if (values.visibility?.trim()) {
    lines.push(`visibility: ${yamlQuote(values.visibility.trim().toUpperCase())}`);
  }
  if (values.categoryName?.trim()) {
    lines.push(`categoryName: ${yamlQuote(values.categoryName.trim())}`);
  }

  return lines;
};

const stripMarkdownFrontmatter = (source: string) => {
  const result = splitMarkdownFrontmatter(source);
  return result.hasFrontmatter ? result.body : result.normalizedSource;
};

const mergeManagedMarkdownFrontmatter = (source: string, values: ManagedFrontmatterValues, options?: MergeManagedFrontmatterOptions) => {
  const result = splitMarkdownFrontmatter(source);
  const managedLines = buildManagedFrontmatterLines(values);
  const body = options?.body ?? (result.hasFrontmatter ? result.body : result.normalizedSource);

  if (!result.hasFrontmatter) {
    if (managedLines.length === 0) {
      return body;
    }
    if (!body) {
      return ['---', ...managedLines, '---'].join('\n');
    }
    return ['---', ...managedLines, '---', '', body].join('\n');
  }

  const preservedLines = parseFrontmatterEntries(result.frontmatterLines)
    .filter((entry) => {
      if (entry.normalizedKey == null) {
        return true;
      }
      return !MANAGED_KEY_ALIASES.has(entry.normalizedKey);
    })
    .flatMap((entry) => entry.lines);

  const nextFrontmatterLines = [...managedLines, ...preservedLines];
  if (nextFrontmatterLines.length === 0) {
    return body;
  }

  const rebuilt = ['---', ...nextFrontmatterLines, '---'];
  if (body) {
    rebuilt.push('', body);
  }
  return rebuilt.join('\n');
};

export { mergeManagedMarkdownFrontmatter, splitMarkdownFrontmatter, stripMarkdownFrontmatter };
export type { ManagedFrontmatterValues, MergeManagedFrontmatterOptions };
