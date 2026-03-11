import { nextTick, reactive, ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const routeState = reactive({
  name: 'home',
  fullPath: '/',
  params: {} as Record<string, unknown>,
});

const updateNotificationPresence = vi.fn().mockResolvedValue(undefined);
const removeNotificationPresence = vi.fn().mockResolvedValue(undefined);

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
}));

vi.mock('../api/notificationPresenceApi', () => ({
  updateNotificationPresence,
  removeNotificationPresence,
}));

describe('features/notification useNotificationPresence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    window.sessionStorage.clear();
    routeState.name = 'home';
    routeState.fullPath = '/';
    routeState.params = {};
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('인증된 사용자는 현재 화면과 패널 상태를 presence API로 동기화한다', async () => {
    // given
    const { useNotificationPresence } = await import('./useNotificationPresence');
    const isAuthenticated = ref(true);
    const isNotificationMenuOpen = ref(false);

    // when
    useNotificationPresence({ isAuthenticated, isNotificationMenuOpen });
    await nextTick();

    // then
    expect(updateNotificationPresence).toHaveBeenCalledTimes(1);
    expect(updateNotificationPresence).toHaveBeenCalledWith(
      expect.objectContaining({
        viewType: 'HOME',
        articleId: null,
        notificationPanelOpen: false,
      }),
    );
    expect(updateNotificationPresence.mock.calls[0]?.[0]?.sessionId).toBeTypeOf('string');
  });

  it('게시글 상세와 알림 패널 열림 상태가 바뀌면 최신 presence 값을 다시 보낸다', async () => {
    // given
    const { useNotificationPresence } = await import('./useNotificationPresence');
    const isAuthenticated = ref(true);
    const isNotificationMenuOpen = ref(false);
    useNotificationPresence({ isAuthenticated, isNotificationMenuOpen });
    await nextTick();
    updateNotificationPresence.mockClear();

    // when
    routeState.name = 'article-detail';
    routeState.fullPath = '/articles/15';
    routeState.params = { articleId: '15' };
    isNotificationMenuOpen.value = true;
    await nextTick();

    // then
    expect(updateNotificationPresence).toHaveBeenCalled();
    expect(updateNotificationPresence).toHaveBeenLastCalledWith(
      expect.objectContaining({
        viewType: 'ARTICLE_DETAIL',
        articleId: 15,
        notificationPanelOpen: true,
      }),
    );
  });

  it('정리 시 removePresence=true 이면 현재 sessionId로 presence 제거를 요청한다', async () => {
    // given
    const { useNotificationPresence } = await import('./useNotificationPresence');
    const isAuthenticated = ref(true);
    const isNotificationMenuOpen = ref(false);
    const { stopNotificationPresence } = useNotificationPresence({ isAuthenticated, isNotificationMenuOpen });
    await nextTick();
    const savedSessionId = window.sessionStorage.getItem('notification_presence_session_id');

    // when
    stopNotificationPresence(true);
    await nextTick();

    // then
    expect(savedSessionId).not.toBeNull();
    expect(removeNotificationPresence).toHaveBeenCalledWith(savedSessionId);
  });
});
