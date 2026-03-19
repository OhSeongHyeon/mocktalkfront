export type ModerationReportStatus = 'PENDING' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED';
export type ModerationStatusFilter = ModerationReportStatus | 'ALL';

const MODERATION_STATUS_OPTIONS: ModerationStatusFilter[] = ['ALL', 'PENDING', 'IN_REVIEW', 'RESOLVED', 'REJECTED'];

const formatModerationStatusLabel = (status: ModerationReportStatus) => {
  const labels: Record<ModerationReportStatus, string> = {
    PENDING: '대기',
    IN_REVIEW: '검토',
    RESOLVED: '해결',
    REJECTED: '반려',
  };
  return labels[status] ?? status;
};

const resolveModerationStatusBadgeClass = (status: ModerationReportStatus) => {
  if (status === 'PENDING') {
    return 'ui-badge ui-badge-warning';
  }
  if (status === 'IN_REVIEW') {
    return 'ui-badge ui-badge-accent';
  }
  if (status === 'RESOLVED') {
    return 'ui-badge ui-badge-success';
  }
  return 'ui-badge ui-badge-danger';
};

const parseModerationTargetSnapshot = (snapshot: string | null) => {
  if (!snapshot) {
    return null;
  }
  try {
    const parsed = JSON.parse(snapshot);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return snapshot;
  }
};

export { MODERATION_STATUS_OPTIONS, formatModerationStatusLabel, parseModerationTargetSnapshot, resolveModerationStatusBadgeClass };
