import { onBeforeUnmount, onMounted, ref, type ComputedRef } from 'vue';
import { onBeforeRouteLeave, useRouter, type RouteLocationNormalized } from 'vue-router';

type UnsavedChangesGuardOptions = {
  isDirty: ComputedRef<boolean>;
  shouldBypassRouteLeave?: (to: RouteLocationNormalized, from: RouteLocationNormalized) => boolean;
};

const useUnsavedChangesGuard = ({ isDirty, shouldBypassRouteLeave }: UnsavedChangesGuardOptions) => {
  const router = useRouter();
  const isLeaveConfirmed = ref(false);
  const isLeaveModalOpen = ref(false);
  let pendingRouteTo: RouteLocationNormalized | null = null;
  let pendingLeaveAction: (() => void) | null = null;

  const allowLeaveWithoutConfirm = () => {
    isLeaveConfirmed.value = true;
  };

  const clearPendingLeave = () => {
    pendingRouteTo = null;
    pendingLeaveAction = null;
  };

  const openLeaveModalForRoute = (to: RouteLocationNormalized) => {
    clearPendingLeave();
    pendingRouteTo = to;
    isLeaveModalOpen.value = true;
  };

  const openLeaveModalForAction = (leaveAction: () => void) => {
    clearPendingLeave();
    pendingLeaveAction = leaveAction;
    isLeaveModalOpen.value = true;
  };

  const requestLeave = (leaveAction: () => void) => {
    if (isLeaveConfirmed.value || !isDirty.value) {
      leaveAction();
      return;
    }
    openLeaveModalForAction(leaveAction);
  };

  const confirmLeave = async () => {
    isLeaveModalOpen.value = false;
    allowLeaveWithoutConfirm();

    if (pendingRouteTo) {
      const destination = pendingRouteTo;
      clearPendingLeave();
      await router.push(destination);
      return;
    }

    if (pendingLeaveAction) {
      const leaveAction = pendingLeaveAction;
      clearPendingLeave();
      leaveAction();
    }
  };

  const cancelLeave = () => {
    isLeaveModalOpen.value = false;
    clearPendingLeave();
  };

  onBeforeRouteLeave((to, from) => {
    if (isLeaveConfirmed.value || !isDirty.value) {
      return;
    }
    if (shouldBypassRouteLeave?.(to, from)) {
      return;
    }
    openLeaveModalForRoute(to);
    return false;
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
