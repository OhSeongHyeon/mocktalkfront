import type { UserProfileResponse } from '../../entities/user';
import { useAuthStore } from '../../stores/auth';
import { resolveImageUrl } from './files';

const applyProfileSummary = (profile: UserProfileResponse) => {
  const authStore = useAuthStore();
  const display = profile.displayName?.trim() || profile.userName;
  authStore.setProfileSummary({ displayName: display, point: profile.userPoint });
  authStore.setProfileImageUrl(resolveImageUrl(profile.profileImage ?? null, 'medium'));
};

export { applyProfileSummary };
