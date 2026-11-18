import { ref } from 'vue';
import { resolvePlatformBackendUrlForClient } from '@/shared/config/resolve-platform-backend-url.client';
import { labPlatformFetchInit } from '@/shared/composables/useLabPlatformAuth';
import type { User } from '@/shared/types/user';

export function useForcePasswordChange() {
  const submitting = ref(false);
  const errorMessage = ref<string | null>(null);

  async function submitPasswordChange(
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; user?: User }> {
    submitting.value = true;
    errorMessage.value = null;
    try {
      const base = resolvePlatformBackendUrlForClient().replace(/\/$/, '');
      const res = await fetch(
        `${base}/auth/change-password`,
        labPlatformFetchInit({
          method: 'POST',
          body: JSON.stringify({ currentPassword, newPassword }),
        }),
      );
      const body = (await res.json()) as {
        success?: boolean;
        error?: string;
        user?: User;
      };
      if (!res.ok || !body.success) {
        errorMessage.value = body.error ?? 'Password change failed';
        return { success: false };
      }
      return { success: true, user: body.user };
    } catch (err: unknown) {
      errorMessage.value = err instanceof Error ? err.message : 'Password change failed';
      return { success: false };
    } finally {
      submitting.value = false;
    }
  }

  return { submitting, errorMessage, submitPasswordChange };
}
