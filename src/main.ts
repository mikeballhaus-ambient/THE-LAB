import { createApp } from 'vue';

import App from './App.vue';

import PrimeVue from 'primevue/config';

import 'primeicons/primeicons.css';

import ToastService from 'primevue/toastservice';

import './assets/styles/tailwind.css';

import './assets/styles/lab-app-shell.css';
import './assets/styles/lab-settings-shell.css';
import './assets/styles/lab-chat-shell.css';
import './assets/styles/lab-messages-shell.css';
import './assets/styles/lab-sidecar-shell.css';
import './assets/styles/lab-prime-badges.css';
import './assets/styles/lab-prime-form-controls.css';

import '@/shared/theme/lab-app-theme';

import { bootstrapLabTheme, getActiveLabTheme } from '@/shared/theme/lab-theme-state';

import { getLabPrimeVuePluginOptions } from '@/shared/theme/prime-preset';

import { getAuthUser } from '@/shared/types';
import { setLabShellUserSnapshot } from '@/shared/auth/lab-shell-user-state';
import { getLabAccessToken } from '@/shared/composables/useLabPlatformAuth';
import { hydrateLabThemeFromPlatform } from '@/shared/theme/lab-theme-draft-store';



bootstrapLabTheme();

void (async () => {
  const storedUser = getAuthUser();
  if (storedUser) {
    setLabShellUserSnapshot(storedUser);
  }
  // Avoid 401 noise: localStorage user can outlive session; platform theme APIs need a live session.
  if (!storedUser || !getLabAccessToken()) {
    return;
  }
  await hydrateLabThemeFromPlatform();
})();

const app = createApp(App);



app.use(PrimeVue, getLabPrimeVuePluginOptions(getActiveLabTheme()));

app.use(ToastService);



app.mount('#app');


