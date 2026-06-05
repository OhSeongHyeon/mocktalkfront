import type { ArticleContentFormat } from '../../entities/article';
import { hasMeaningfulArticleContent } from '../../features/editor/lib/articleContent';

export type ArticleUpsertFormState = {
  title: string;
  contentSource: string;
  contentFormat: ArticleContentFormat;
  visibility: string;
  selectedCategoryId: number | null;
  attachmentIds: number[];
};

const normalizeSnapshot = (state: ArticleUpsertFormState): ArticleUpsertFormState => ({
  title: state.title.trim(),
  contentSource: state.contentSource,
  contentFormat: state.contentFormat,
  visibility: state.visibility,
  selectedCategoryId: state.selectedCategoryId,
  attachmentIds: [...state.attachmentIds].sort((left, right) => left - right),
});

const createArticleUpsertSnapshot = (state: ArticleUpsertFormState): ArticleUpsertFormState => normalizeSnapshot(state);

const isArticleUpsertDirty = (current: ArticleUpsertFormState, baseline: ArticleUpsertFormState | null, mode: 'create' | 'edit') => {
  if (mode === 'create') {
    if (current.title.trim().length > 0) {
      return true;
    }
    if (hasMeaningfulArticleContent(current.contentSource, current.contentFormat)) {
      return true;
    }
    if (current.attachmentIds.length > 0) {
      return true;
    }
    if (current.selectedCategoryId != null) {
      return true;
    }
    if (current.visibility !== 'PUBLIC') {
      return true;
    }
    return false;
  }

  if (!baseline) {
    return false;
  }

  const normalizedCurrent = normalizeSnapshot(current);
  const normalizedBaseline = normalizeSnapshot(baseline);
  return (
    normalizedCurrent.title !== normalizedBaseline.title ||
    normalizedCurrent.contentSource !== normalizedBaseline.contentSource ||
    normalizedCurrent.contentFormat !== normalizedBaseline.contentFormat ||
    normalizedCurrent.visibility !== normalizedBaseline.visibility ||
    normalizedCurrent.selectedCategoryId !== normalizedBaseline.selectedCategoryId ||
    normalizedCurrent.attachmentIds.join(',') !== normalizedBaseline.attachmentIds.join(',')
  );
};

export { createArticleUpsertSnapshot, isArticleUpsertDirty };
