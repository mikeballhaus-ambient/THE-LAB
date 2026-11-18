import { onMounted, ref, watch, type Ref } from 'vue';
import { SessionManager } from '@/shared/composables/session/session-manager';
import { labShellUserRef } from '@/shared/auth/lab-shell-user-state';
import { getAuthUser } from '@/shared/types/auth';

/**
 * Persist a slice of an app's UI state in the platform session record, **scoped to the current
 * user**.
 *
 * This is the generic escape hatch described on `SessionRecord.appState`: the platform stores one
 * opaque value per (app id, user id) and **the app owns the shape**. Nothing here validates or
 * migrates the payload, so callers must supply a `parse` that is defensive about whatever an
 * older build (or a hand-edited record) left behind.
 *
 * Why the user dimension matters: the session record lives in IndexedDB for the **browser**, not
 * per login. Without scoping, one person's saved overlay/animation settings would appear for the
 * next user who signs in on the same machine.
 *
 * Design notes:
 * - **Hydration must not trigger a write.** Without the `ready` gate, mounting would immediately
 *   persist the default value and could overwrite a real saved entry before the read completed.
 * - **Re-hydrates on user switch.** Signing in as someone else clears to the default and reads
 *   that user's entry; a stale value from the previous user must never be written to the new one.
 * - **Debounced writes.** Some state (e.g. an animation speed slider) changes rapidly, and each
 *   change is a full session-record `put`.
 * - **Failures are non-fatal.** Persisting UI preferences must never break the screen.
 */
export interface UseLabAppStateOptions<T> {
  /** Registry app id — the outer key under `appState`. */
  appId: string;
  /** Initial value, used when nothing is saved or the saved value fails `parse`. */
  defaultValue: T;
  /** Validate/normalise a stored value. Return `null` to reject and fall back to the default. */
  parse: (raw: unknown) => T | null;
  /** Debounce for writes, in ms. Defaults to 300. */
  debounceMs?: number;
}

export function useLabAppState<T>(
  options: UseLabAppStateOptions<T>,
): { state: Ref<T>; ready: Ref<boolean> } {
  const state = ref(options.defaultValue) as Ref<T>;
  const ready = ref(false);
  const debounceMs = options.debounceMs ?? 300;

  /*
   * `SessionManager` has no shared instance — the shell constructs its own (`LabDashboard.vue`)
   * and this matches that convention. Safe because every call goes through the single
   * `labDB.sessionState` table and `load()` re-reads it, so there is no per-instance cache to
   * diverge.
   */
  const manager = new SessionManager();
  let writeTimer: ReturnType<typeof setTimeout> | null = null;
  /** Which user the current in-memory `state` belongs to; guards cross-user writes. */
  let loadedUserId: number | null = null;

  /**
   * Resolve the current user, preferring the reactive shell ref but falling back to the stored
   * `lab_auth_user` snapshot.
   *
   * `labShellUserRef` is only populated by `main.ts` and lazily by `useLabShellUserRole` — an
   * app mounted without either would see `null`, and the previous ref-only lookup then skipped
   * every write silently, so nothing was ever persisted. `getAuthUser()` is the same fallback
   * `useLabShellUserRole` already relies on.
   */
  function resolveUserId(): number | null {
    const fromRef = labShellUserRef.value?.userId;
    if (typeof fromRef === 'number' && fromRef > 0) {
      return fromRef;
    }
    const stored = getAuthUser()?.userId;
    return typeof stored === 'number' && stored > 0 ? stored : null;
  }

  function clearPendingWrite(): void {
    if (writeTimer) {
      clearTimeout(writeTimer);
      writeTimer = null;
    }
  }

  async function hydrate(userId: number | null): Promise<void> {
    clearPendingWrite();
    ready.value = false;
    loadedUserId = userId;

    if (userId == null) {
      /*
       * Signed out, or the shell user snapshot has not landed yet — fall back to defaults
       * without persisting them. Warned rather than silent: "my settings never save" is
       * otherwise invisible, and this was the exact failure mode before the `getAuthUser()`
       * fallback existed.
       */
      console.warn(
        `[useLabAppState] no current user; ${options.appId} state will not persist until sign-in.`,
      );
      state.value = options.defaultValue;
      ready.value = true;
      return;
    }

    try {
      await manager.init();
      const raw = await manager.getAppState(options.appId, userId);
      const parsed = raw === undefined || raw === null ? null : options.parse(raw);
      state.value = parsed ?? options.defaultValue;
    } catch {
      state.value = options.defaultValue;
    } finally {
      ready.value = true;
    }
  }

  onMounted(() => {
    void hydrate(resolveUserId());
  });

  // A different user means a different saved entry — never carry the previous one across.
  watch(
    () => resolveUserId(),
    (userId) => {
      if (userId !== loadedUserId) {
        void hydrate(userId);
      }
    },
  );

  watch(
    state,
    (next) => {
      // Never echo the default back before the saved value has been read.
      if (!ready.value || loadedUserId == null) {
        return;
      }
      const userId = loadedUserId;
      clearPendingWrite();
      writeTimer = setTimeout(() => {
        writeTimer = null;
        void manager.setAppState(options.appId, userId, next).catch((err: unknown) => {
          /*
           * Persistence is best-effort — a failed write must not break the screen. But it is
           * logged, because the common cause is a caller handing over non-plain data (a reactive
           * proxy, a Map), which is a bug in the app rather than a transient failure.
           */
          console.warn(
            `[useLabAppState] could not persist state for ${options.appId}:`,
            err instanceof Error ? err.message : err,
          );
        });
      }, debounceMs);
    },
    { deep: true },
  );

  return { state, ready };
}
