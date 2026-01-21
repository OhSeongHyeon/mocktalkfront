import type { UserProfileResponse } from '../services/mypage';
import { setProfileImageUrl, setProfileSummary } from '../stores/auth';
import { resolveImageUrl } from './files';

const applyProfileSummary = (profile: UserProfileResponse) => {
  const display = profile.displayName?.trim() || profile.userName;
  setProfileSummary({ displayName: display, point: profile.userPoint });
  setProfileImageUrl(resolveImageUrl(profile.profileImage ?? null, 'medium'));
};

export { applyProfileSummary };
