import { computed, ref, watch, type Ref } from 'vue';
import type { ToastServiceMethods } from 'primevue/toastservice';
import type { User } from '@/shared/types/user';
import { useLabComms } from '@/shared/composables/useLabComms';
import { getLabSessionId } from '@/shared/composables/useLabPlatformAuth';
import { fetchActivePlatformUsersForClient } from '@/shared/services/platform-user-client';
import {
  displayLabUserName,
  sortUsersForLabMessagesPicker,
} from '@/shared/utils/lab-comms-ui';
import { usePlatformAppServers } from '@/shared/composables/usePlatformAppServers';
import { useGameAppSocketAck } from '@/shared/composables/useGameAppSocketAck';
import {
  GAME_APP_INVITE_REGISTRY,
  resolveGameAppIdFromInvitePayload,
  resolveGameAppInviteEntry,
} from '@/shared/config/game-app-invite-registry';
import { saveGamePendingMatch } from '@/shared/config/game-pending-match';
import { LAB_COMMS_EVENTS } from '@/shared/types';
import { isLabPlatformSystemUserId } from '@/shared/config/lab-platform-system-user';
import type { LabEnvelope } from '@/shared/types/lab-comms';
import {
  LAB_COMMS_MESSAGE_TYPE_GAME_INVITE_DECLINE,
  LAB_COMMS_MESSAGE_TYPE_GAME_MATCH_READY,
} from '@/shared/types/lab-comms-game-invite';

export interface UseLabMessagesShellOptions {
  serverUrl: string;
  user: Ref<User | null>;
  isAuthenticated: Ref<boolean>;
  toast: ToastServiceMethods;
  /** Launch a hybrid game app (tab + server) when accepting a game invite. */
  launchGameApp?: (appId: string, displayName: string) => Promise<void>;
  /** Switch dashboard focus from Laboratory to the apps workspace. */
  focusAppView?: () => Promise<void>;
}

export function useLabMessagesShell(options: UseLabMessagesShellOptions) {
  const { user, isAuthenticated, toast, launchGameApp, focusAppView } = options;

  const messagingUsers = ref<User[]>([]);
  const loadingMessagingUsers = ref(false);

  const showMessagesModal = ref(false);
  const messagesDialogMounted = ref(false);
  const openPartnerIds = ref<number[]>([]);
  const activePartnerId = ref<number | null>(null);
  /** Tabs the user closed; excluded from channel-list auto-open until they pick the user again. */
  const dismissedPartnerIds = ref<Set<number>>(new Set());
  const resolvedTwInviteIds = ref<Set<string>>(new Set());

  const gameAppIds = Object.keys(GAME_APP_INVITE_REGISTRY);
  const { urlFor, refresh: refreshGameAppUrls } = usePlatformAppServers({
    ids: gameAppIds,
    getPlatformBaseUrl: () => options.serverUrl.replace(/\/$/, ''),
    immediate: true,
  });
  const gameSocket = useGameAppSocketAck();

  async function resolveGameAppBaseUrl(appId: string): Promise<string> {
    const entry = resolveGameAppInviteEntry(appId);
    if (!entry) {
      throw new Error(`No game invite registry entry for ${appId}`);
    }
    const readUrl = () => urlFor(appId)?.replace(/\/$/, '') ?? '';
    await refreshGameAppUrls();
    let base = readUrl();
    if (base) {
      return base;
    }
    if (!launchGameApp) {
      throw new Error(`Launch ${entry.displayName} first so its server is available.`);
    }
    await launchGameApp(appId, entry.displayName);
    for (let attempt = 0; attempt < 40; attempt += 1) {
      await refreshGameAppUrls();
      base = readUrl();
      if (base) {
        return base;
      }
      await new Promise((resolve) => {
        setTimeout(resolve, 250);
      });
    }
    throw new Error(`${entry.displayName} server did not become ready`);
  }

  const comms = useLabComms({
    serverUrl: options.serverUrl,
    isAuthenticated,
    onCommsError: (code, message) => {
      toast.add({
        severity: code === 'RATE_LIMIT' ? 'warn' : 'error',
        summary: 'Messages',
        detail: message,
        life: 5000,
      });
    },
  });

  watch(
    () => isAuthenticated.value && Boolean(getLabSessionId()),
    (sessionReady) => {
      if (sessionReady) {
        comms.connect();
      } else {
        comms.disconnect();
        if (!isAuthenticated.value) {
          showMessagesModal.value = false;
          openPartnerIds.value = [];
          activePartnerId.value = null;
          dismissedPartnerIds.value = new Set();
        }
      }
    },
    { immediate: true },
  );

  async function refreshMessagingUsers(): Promise<void> {
    if (!isAuthenticated.value || !getLabSessionId()) {
      messagingUsers.value = [];
      return;
    }
    loadingMessagingUsers.value = true;
    try {
      messagingUsers.value = await fetchActivePlatformUsersForClient({ showSystemUser: true });
    } catch {
      toast.add({
        severity: 'error',
        summary: 'Messages',
        detail: 'Could not load team member list.',
        life: 5000,
      });
      messagingUsers.value = [];
    } finally {
      loadingMessagingUsers.value = false;
    }
  }

  watch(
    () => isAuthenticated.value && Boolean(getLabSessionId()),
    (ready) => {
      if (ready) {
        void refreshMessagingUsers();
      } else {
        messagingUsers.value = [];
      }
    },
    { immediate: true },
  );

  watch(showMessagesModal, (visible) => {
    if (visible) {
      messagesDialogMounted.value = true;
      void refreshMessagingUsers();
      comms.requestChannels();
    }
  });

  const sortedPickerUsers = computed(() => {
    const selfId = user.value?.userId;
    if (!selfId) {
      return [];
    }
    return sortUsersForLabMessagesPicker(
      messagingUsers.value,
      selfId,
      comms.presenceForUser,
    );
  });

  function userById(userId: number): User | undefined {
    return messagingUsers.value.find((u) => u.userId === userId);
  }

  function partnerLabel(userId: number): string {
    const u = userById(userId);
    return u ? displayLabUserName(u) : `User ${userId}`;
  }

  function openMessagesDialog(): void {
    if (!isAuthenticated.value) {
      toast.add({
        severity: 'warn',
        summary: 'Messages',
        detail: 'Sign in to send direct messages.',
        life: 4000,
      });
      return;
    }
    showMessagesModal.value = true;
  }

  function focusPartner(partnerUserId: number): void {
    const selfId = user.value?.userId;
    if (!selfId) {
      return;
    }
    const nextDismissed = new Set(dismissedPartnerIds.value);
    nextDismissed.delete(partnerUserId);
    dismissedPartnerIds.value = nextDismissed;
    if (!openPartnerIds.value.includes(partnerUserId)) {
      openPartnerIds.value = [...openPartnerIds.value, partnerUserId];
    }
    activePartnerId.value = partnerUserId;
    const channelId = comms.channelIdForPartner(selfId, partnerUserId);
    comms.subscribeChannels([channelId]);
    comms.requestHistory(channelId);
    comms.markRead(channelId);
  }

  function closePartner(partnerUserId: number): void {
    const idx = openPartnerIds.value.indexOf(partnerUserId);
    if (idx === -1) {
      return;
    }
    const remaining = openPartnerIds.value.filter((id) => id !== partnerUserId);
    openPartnerIds.value = remaining;
    dismissedPartnerIds.value = new Set(dismissedPartnerIds.value).add(partnerUserId);
    if (activePartnerId.value !== partnerUserId) {
      return;
    }
    if (remaining.length === 0) {
      activePartnerId.value = null;
      return;
    }
    const nextIdx = Math.min(idx, remaining.length - 1);
    activePartnerId.value = remaining[nextIdx];
  }

  async function clearPartnerHistory(partnerUserId: number): Promise<void> {
    const selfId = user.value?.userId;
    if (!selfId) {
      return;
    }
    const label = partnerLabel(partnerUserId);
    const channelId = comms.channelIdForPartner(selfId, partnerUserId);
    try {
      await comms.clearChannelHistory(channelId);
      toast.add({
        severity: 'success',
        summary: 'Messages',
        detail: `Cleared conversation with ${label}.`,
        life: 4000,
      });
    } catch (err) {
      toast.add({
        severity: 'error',
        summary: 'Messages',
        detail: err instanceof Error ? err.message : 'Could not clear history',
        life: 5000,
      });
    }
  }

  function sendToPartner(partnerUserId: number, text: string): void {
    if (isLabPlatformSystemUserId(partnerUserId)) {
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    focusPartner(partnerUserId);
    comms.sendDm(partnerUserId, trimmed);
  }

  const activeThreadMessageKey = computed(() => {
    const selfId = user.value?.userId;
    const partnerId = activePartnerId.value;
    if (!selfId || !partnerId) {
      return null;
    }
    const channelId = comms.channelIdForPartner(selfId, partnerId);
    const messages = comms.messagesByChannelId.value[channelId];
    if (!messages?.length) {
      return channelId;
    }
    const last = messages[messages.length - 1];
    return `${channelId}:${last.id}`;
  });

  function markActiveConversationReadIfViewing(): void {
    const selfId = user.value?.userId;
    const partnerId = activePartnerId.value;
    if (!showMessagesModal.value || !selfId || !partnerId) {
      return;
    }
    comms.markRead(comms.channelIdForPartner(selfId, partnerId));
  }

  watch(activeThreadMessageKey, () => {
    markActiveConversationReadIfViewing();
  });

  watch([showMessagesModal, activePartnerId], () => {
    markActiveConversationReadIfViewing();
  });

  const unreadByPartnerIdForUi = computed(() => {
    const raw = { ...comms.unreadByPartnerId.value };
    const active = activePartnerId.value;
    if (showMessagesModal.value && active != null) {
      delete raw[active];
    }
    return raw;
  });

  const unreadTotalForUi = computed(() => {
    let total = comms.unreadTotal.value;
    const active = activePartnerId.value;
    if (showMessagesModal.value && active != null) {
      total -= comms.unreadByPartnerId.value[active] ?? 0;
    }
    return Math.max(0, total);
  });

  watch(
    () => comms.channels.value,
    (list) => {
      const selfId = user.value?.userId;
      for (const ch of list) {
        if (dismissedPartnerIds.value.has(ch.partnerUserId)) {
          continue;
        }
        if (openPartnerIds.value.includes(ch.partnerUserId)) {
          continue;
        }
        if (!(ch.unreadCount > 0 || ch.lastMessageAt)) {
          continue;
        }
        openPartnerIds.value = [...openPartnerIds.value, ch.partnerUserId];
        /*
         * A tab opened **by an inbound channel** (a workflow DM, an automated notification) is exactly
         * the case where the socket push cannot be relied on: the message that created the channel was
         * sent while this client was not subscribed, and anything written before the tab existed is not
         * in `messagesByChannelId`. Without an explicit history request the tab renders "No
         * notifications yet" beside a non-zero unread badge — the state that reads as "the DM never
         * arrived" even though the row is in SQLite.
         *
         * Deliberately **not** marking read here: opening a tab is not the user reading it, and the
         * badge must stay until they actually focus the conversation.
         */
        if (selfId) {
          const channelId = comms.channelIdForPartner(selfId, ch.partnerUserId);
          comms.subscribeChannels([channelId]);
          comms.requestHistory(channelId);
        }
      }
    },
    { deep: true },
  );

  function markTwInviteResolved(inviteId: string): void {
    resolvedTwInviteIds.value = new Set(resolvedTwInviteIds.value).add(inviteId);
  }

  watch(
    () => comms.socket.value,
    (sock, prev) => {
      const onInboundMessage = (envelope: LabEnvelope) => {
        const selfId = user.value?.userId;
        if (!selfId || envelope.senderUserId === selfId) {
          return;
        }
        if (envelope.type !== LAB_COMMS_MESSAGE_TYPE_GAME_INVITE_DECLINE) {
          return;
        }
        const inviteId = (envelope.payload as { inviteId?: string }).inviteId;
        if (!inviteId) {
          return;
        }
        markTwInviteResolved(inviteId);
        toast.add({
          severity: 'info',
          summary: 'Game invite',
          detail: `${partnerLabel(envelope.senderUserId)} declined your game invite.`,
          life: 6000,
        });
      };
      prev?.off(LAB_COMMS_EVENTS.MESSAGE, onInboundMessage);
      sock?.on(LAB_COMMS_EVENTS.MESSAGE, onInboundMessage);
    },
  );

  async function acceptGameInvite(
    inviteId: string,
    partnerUserId: number,
    appId: string,
  ): Promise<void> {
    void partnerUserId;
    const entry = resolveGameAppInviteEntry(appId);
    if (!entry) {
      toast.add({
        severity: 'error',
        summary: 'Game invite',
        detail: `Unknown game app: ${appId}`,
        life: 6000,
      });
      return;
    }
    try {
      const base = await resolveGameAppBaseUrl(appId);
      gameSocket.connect(base);
      const data = await gameSocket.emitAck<{ matchId: string; gameId: string; inviterId: number }>(
        entry.socketEvents.inviteAccept,
        { inviteId },
      );
      markTwInviteResolved(inviteId);
      comms.sendEnvelope(data.inviterId, LAB_COMMS_MESSAGE_TYPE_GAME_MATCH_READY, {
        appId,
        matchId: data.matchId,
        gameId: data.gameId,
      });
      if (launchGameApp) {
        await launchGameApp(appId, entry.displayName);
      }
      showMessagesModal.value = false;
      await focusAppView?.();
      saveGamePendingMatch({ appId, matchId: data.matchId, gameId: data.gameId });
      toast.add({
        severity: 'success',
        summary: 'Game invite',
        detail: `Opening your match in ${entry.displayName}.`,
        life: 5000,
      });
    } catch (err) {
      toast.add({
        severity: 'error',
        summary: 'Game invite',
        detail: err instanceof Error ? err.message : 'Could not accept invite',
        life: 6000,
      });
    }
  }

  async function declineGameInvite(
    inviteId: string,
    partnerUserId: number,
    appId: string,
  ): Promise<void> {
    void partnerUserId;
    const entry = resolveGameAppInviteEntry(appId);
    if (!entry) {
      return;
    }
    const base = urlFor(appId)?.replace(/\/$/, '');
    if (!base) {
      toast.add({
        severity: 'warn',
        summary: 'Game invite',
        detail: `Launch ${entry.displayName} first so its server is available.`,
        life: 6000,
      });
      return;
    }
    try {
      gameSocket.connect(base);
      const data = await gameSocket.emitAck<{ inviterId: number }>(
        entry.socketEvents.inviteDecline,
        { inviteId },
      );
      comms.sendEnvelope(data.inviterId, LAB_COMMS_MESSAGE_TYPE_GAME_INVITE_DECLINE, {
        appId,
        inviteId,
      });
      markTwInviteResolved(inviteId);
      toast.add({
        severity: 'info',
        summary: 'Game invite',
        detail: 'Invite declined.',
        life: 4000,
      });
    } catch (err) {
      toast.add({
        severity: 'error',
        summary: 'Game invite',
        detail: err instanceof Error ? err.message : 'Could not decline invite',
        life: 6000,
      });
    }
  }

  return {
    showMessagesModal,
    messagesDialogMounted,
    openPartnerIds,
    activePartnerId,
    loadingMessagingUsers,
    sortedPickerUsers,
    partnerLabel,
    openMessagesDialog,
    focusPartner,
    closePartner,
    clearPartnerHistory,
    sendToPartner,
    acceptGameInvite,
    declineGameInvite,
    resolveGameAppIdFromInvitePayload,
    resolvedTwInviteIds,
    ...comms,
    unreadTotal: unreadTotalForUi,
    unreadByPartnerId: unreadByPartnerIdForUi,
  };
}
