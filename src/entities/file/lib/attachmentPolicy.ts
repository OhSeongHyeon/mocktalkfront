import { translate } from '../../../shared/i18n/translate';

const ATTACHMENT_MAX_FILE_SIZE = 50 * 1024 * 1024;

const ATTACHMENT_ALLOWED_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'hwp',
  'hwpx',
  'txt',
  'csv',
  'zip',
  '7z',
  'rar',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'mp4',
  'webm',
  'mp3',
  'wav',
] as const;

const ATTACHMENT_ALLOWED_EXTENSION_LABEL = ATTACHMENT_ALLOWED_EXTENSIONS.join(', ');
const ATTACHMENT_FILE_ACCEPT = ATTACHMENT_ALLOWED_EXTENSIONS.map((extension) => `.${extension}`).join(',');

const resolveExtension = (fileName: string) => {
  const normalized = fileName.trim();
  const dotIndex = normalized.lastIndexOf('.');
  if (dotIndex < 0 || dotIndex === normalized.length - 1) {
    return null;
  }
  return normalized.slice(dotIndex + 1).toLowerCase();
};

const validateAttachmentFile = (file: File) => {
  if (file.size > ATTACHMENT_MAX_FILE_SIZE) {
    return translate('editor.file.sizeLimit');
  }
  const extension = resolveExtension(file.name);
  if (!extension || !ATTACHMENT_ALLOWED_EXTENSIONS.includes(extension as (typeof ATTACHMENT_ALLOWED_EXTENSIONS)[number])) {
    return translate('editor.file.invalidType');
  }
  return null;
};

export { ATTACHMENT_ALLOWED_EXTENSION_LABEL, ATTACHMENT_FILE_ACCEPT, ATTACHMENT_MAX_FILE_SIZE, validateAttachmentFile };
