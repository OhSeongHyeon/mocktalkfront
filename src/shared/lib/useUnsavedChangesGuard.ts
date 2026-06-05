import { onBeforeUnmount, onMounted, ref, type ComputedRef } from 'vue';
import { onBeforeRouteLeave, type NavigationGuardNext, type RouteLocationNormalized } from 'vue-router';

type UnsavedChangesGuardOptions = {
  isDirty: ComputedRef<boolean>;
  shouldBypassRouteLeave?: (to: RouteLocationNormalized, from: RouteLocationNormalized) => boolean;
};

const useUnsavedChangesGuard = ({ isDirty, shouldBypassRouteLeave }: UnsavedChangesGuardOptions) => {
  const isLeaveConfirmed = ref(false);
  const isLeaveModalOpen = ref(false);
  let pendingRouteNext: NavigationGuardNext | null = null;
  let pendingLeaveAction: (() => void) | null = null;

  const allowLeaveWithoutConfirm = () => {
    isLeaveConfirmed.value = true;
  };

  const openLeaveModal = (routeNext?: NavigationGuardNext, leaveAction?: () => void) => {
    pendingRouteNext = routeNext ?? null;
    pendingLeaveAction = leaveAction ?? null;
    isLeaveModalOpen.value = true;
  };

  const requestLeave = (leaveAction: () => void) => {
    if (isLeaveConfirmed.value || !isDirty.value) {
      leaveAction();
      return;
    }
    openLeaveModal(undefined, leaveAction);
  };

  const confirmLeave = () => {
    isLeaveModalOpen.value = false;
    allowLeaveWithoutConfirm();

    if (pendingRouteNext) {
      const routeNext = pendingRouteNext;
      pendingRouteNext = null;
      pendingLeaveAction = null;
      routeNext();
      return;
    }

    if (pendingLeaveAction) {
      const leaveAction = pendingLeaveAction;
      pendingLeaveAction = null;
      leaveAction();
    }
  };

  const cancelLeave = () => {
    isLeaveModalOpen.value = false;
    pendingRouteNext = null;
    pendingLeaveAction = null;
  };

  onBeforeRouteLeave((to, from, next) => {
    if (isLeaveConfirmed.value || !isDirty.value) {
      next();
      return;
    }
    if (shouldBypassRouteLeave?.(to, from)) {
      next();
      return;
    }
    openLeaveModal(next);
    next(false);
  });

  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (!isDirty.value || isLeaveConfirmed.value) {
      return;
    }
    event.preventDefault();
    event.returnValue = '';
  };

  onMounted(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
  });

  onBeforeUnmount(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.removeEventListener('beforeunload', handleBeforeUnload);
  });

  return {
    allowLeaveWithoutConfirm,
    cancelLeave,
    confirmLeave,
    isLeaveModalOpen,
    requestLeave,
  };
};

export { useUnsavedChangesGuard };
