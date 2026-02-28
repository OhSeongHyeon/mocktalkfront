export type BoardVisibility = 'PUBLIC' | 'GROUP' | 'PRIVATE' | 'UNLISTED';

export type BoardVisibilityOption = {
  value: BoardVisibility;
  label: string;
  adminOnly?: boolean;
};

export const BOARD_VISIBILITY_OPTIONS: BoardVisibilityOption[] = [
  { value: 'PUBLIC', label: '공개' },
  { value: 'GROUP', label: '구독 멤버만' },
  { value: 'PRIVATE', label: '소유자만' },
  { value: 'UNLISTED', label: '운영자만', adminOnly: true },
];

export const resolveBoardVisibilityOptions = (isAdminUser: boolean, currentVisibility?: BoardVisibility) => {
  const options = BOARD_VISIBILITY_OPTIONS.filter((option) => !option.adminOnly || isAdminUser);
  if (!isAdminUser && currentVisibility === 'UNLISTED') {
    const unlistedOption = BOARD_VISIBILITY_OPTIONS.find((option) => option.value === 'UNLISTED');
    if (unlistedOption) {
      return [...options, unlistedOption];
    }
  }
  return options;
};
