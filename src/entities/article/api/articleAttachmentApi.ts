import { requestBlob, requestBlobWithoutAuth, requestRedirectLocation } from '../../../shared/lib/http/api';
import { resolveArticleAttachmentDownloadUrl } from '../../../shared/lib/files';

const requestArticleAttachmentBlob = async (articleId?: number | null, fileId?: number | null) => {
  const downloadUrl = resolveArticleAttachmentDownloadUrl(articleId, fileId);
  if (!downloadUrl) {
    throw new Error('첨부파일 다운로드 경로가 올바르지 않습니다.');
  }

  try {
    const location = await requestRedirectLocation(downloadUrl, { method: 'GET' });
    return await requestBlobWithoutAuth(location, { method: 'GET' });
  } catch {
    // redirect: manual 동작이 제한되는 환경에서는 인증 요청 + 리다이렉트 추적으로 폴백한다.
    return requestBlob(downloadUrl, { method: 'GET' });
  }
};

export { requestArticleAttachmentBlob };
