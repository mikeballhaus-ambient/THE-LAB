import type { AppType } from './app/app.d';

export interface PlatformAppServerEntry {
  appId: string;
  name: string;
  url: string;
  port: number;
  type: AppType;
  isServerSideEnabled: boolean;
  isRunning: boolean;
}

export interface PlatformAppServersResponse {
  success: true;
  data: {
    platformBaseUrl: string;
    apiHost: string;
    apps: PlatformAppServerEntry[];
  };
}

export type AppServerUrlSource = {
  id: string;
  name: string;
  type: AppType;
  isEnabled?: boolean;
  isServerSideEnabled?: boolean;
  server?: { port?: number } | null;
  requiresPort?: number | null;
};
