import type { UserProfileResponse } from '../services/mypage';
import { setProfileImageUrl, setProfileSummary } from '../stores/auth';
import { resolveFileUrl } from './files';

const applyProfileSummary = (profile: UserProfileResponse) => {
  const display = profile.displayName?.trim() || profile.userName;
  setProfileSummary({ displayName: display, point: profile.userPoint });
  setProfileImageUrl(resolveFileUrl(profile.profileImage?.storageKey ?? null));
};

export { applyProfileSummary };
