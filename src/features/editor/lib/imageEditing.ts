import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { NodeSelection } from '@tiptap/pm/state';

interface ImageNaturalSize {
  width: number | null;
  height: number | null;
}

const readImageNaturalSize = (file: File): Promise<ImageNaturalSize> =>
  new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve({ width: null, height: null });
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
    };
    image.onload = () => {
      cleanup();
      const naturalWidth = image.naturalWidth > 0 ? image.naturalWidth : null;
      const naturalHeight = image.naturalHeight > 0 ? image.naturalHeight : null;
      resolve({
        width: naturalWidth,
        height: naturalHeight,
      });
    };
    image.onerror = () => {
      cleanup();
      resolve({ width: null, height: null });
    };
    image.src = objectUrl;
  });

const readImageNaturalSizeFromUrl = (url: string): Promise<ImageNaturalSize> =>
  new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const naturalWidth = image.naturalWidth > 0 ? image.naturalWidth : null;
      const naturalHeight = image.naturalHeight > 0 ? image.naturalHeight : null;
      resolve({
        width: naturalWidth,
        height: naturalHeight,
      });
    };
    image.onerror = () => {
      resolve({ width: null, height: null });
    };
    image.src = url;
  });

const parseImageSizeToPixels = (size: string | undefined, originalSize: number | null) => {
  if (typeof size !== 'string') {
    return null;
  }
  const trimmed = size.trim();
  if (!trimmed) {
    return null;
  }
  const pxMatch = /^(\d+(?:\.\d+)?)px$/.exec(trimmed);
  if (pxMatch) {
    return Math.round(Number(pxMatch[1]));
  }
  const percentMatch = /^(\d+(?:\.\d+)?)%$/.exec(trimmed);
  if (percentMatch && originalSize !== null && originalSize > 0) {
    return Math.round((Number(percentMatch[1]) / 100) * originalSize);
  }
  return null;
};

const parseImageSizeToPercent = (size: string | undefined) => {
  if (typeof size !== 'string') {
    return null;
  }
  const trimmed = size.trim();
  if (!trimmed) {
    return null;
  }
  const percentMatch = /^(\d+(?:\.\d+)?)%$/.exec(trimmed);
  if (!percentMatch) {
    return null;
  }
  const parsed = Number(percentMatch[1]);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.round(parsed);
};

const clampImageScale = (value: number, minScale: number, maxScale: number) => Math.max(minScale, Math.min(maxScale, Math.round(value)));

const parsePositiveInteger = (value: unknown) => {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) {
      return null;
    }
    return Math.round(value);
  }
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.round(parsed);
};

const getImageElementAtPosition = (instance: Editor, position: number) => {
  const dom = instance.view.nodeDOM(position);
  if (dom instanceof HTMLImageElement) {
    return dom;
  }
  if (!(dom instanceof HTMLElement)) {
    return null;
  }
  return dom.querySelector('img');
};

const findImagePositionNear = (nodeAt: (position: number) => ProseMirrorNode | null, position: number, radius = 12) => {
  const safePosition = Math.max(0, position);
  for (let distance = 0; distance <= radius; distance += 1) {
    const backward = safePosition - distance;
    if (backward >= 0) {
      const node = nodeAt(backward);
      if (node?.type.name === 'image') {
        return backward;
      }
    }
    if (distance === 0) {
      continue;
    }
    const forward = safePosition + distance;
    const node = nodeAt(forward);
    if (node?.type.name === 'image') {
      return forward;
    }
  }
  return null;
};

const resolveImageNodePositionFromSelection = (instance: Editor, radius = 12) => {
  const selection = instance.state.selection;
  if (selection instanceof NodeSelection && selection.node.type.name === 'image') {
    return selection.from;
  }

  const findInDoc = (position: number) => findImagePositionNear((candidate) => instance.state.doc.nodeAt(candidate), position, radius);
  const fromPosition = findInDoc(selection.from);
  if (fromPosition !== null) {
    return fromPosition;
  }
  const toPosition = findInDoc(selection.to);
  if (toPosition !== null) {
    return toPosition;
  }

  const afterNode = selection.$from.nodeAfter;
  if (afterNode?.type.name === 'image') {
    return selection.$from.pos;
  }
  const beforeNode = selection.$from.nodeBefore;
  if (beforeNode?.type.name === 'image') {
    return selection.$from.pos - beforeNode.nodeSize;
  }
  return null;
};

const resolveImageOriginalDimension = (
  instance: Editor,
  position: number,
  attrsOriginalSize: unknown,
  attrsSize: string | undefined,
  axis: 'width' | 'height',
) => {
  if (typeof attrsOriginalSize === 'number' && Number.isFinite(attrsOriginalSize) && attrsOriginalSize > 0) {
    return Math.round(attrsOriginalSize);
  }
  if (typeof attrsOriginalSize === 'string') {
    const parsed = Number(attrsOriginalSize.trim());
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.round(parsed);
    }
  }
  const imageElement = getImageElementAtPosition(instance, position);
  if (imageElement) {
    const naturalSize = axis === 'width' ? imageElement.naturalWidth : imageElement.naturalHeight;
    if (naturalSize > 0) {
      return naturalSize;
    }
    const renderedSize =
      axis === 'width'
        ? Math.round(imageElement.getBoundingClientRect().width || imageElement.clientWidth || imageElement.width)
        : Math.round(imageElement.getBoundingClientRect().height || imageElement.clientHeight || imageElement.height);
    if (renderedSize > 0) {
      return renderedSize;
    }
  }
  const pixelSize = parseImageSizeToPixels(attrsSize, null);
  if (pixelSize !== null) {
    return pixelSize;
  }
  return null;
};

export {
  clampImageScale,
  findImagePositionNear,
  parseImageSizeToPercent,
  parseImageSizeToPixels,
  parsePositiveInteger,
  readImageNaturalSize,
  readImageNaturalSizeFromUrl,
  resolveImageNodePositionFromSelection,
  resolveImageOriginalDimension,
};

export type { ImageNaturalSize };
