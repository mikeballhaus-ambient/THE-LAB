import type { Component } from 'vue';
import ServerAppStatus from '@/shared/components/ServerAppStatus.vue';

/** Default dashboard UI for server-only apps (no front-end/App.vue). */
export function getDefaultServerAppComponent(): Component {
  return ServerAppStatus;
}

export { ServerAppStatus };
