import axios, { AxiosError } from 'axios';
import { AppRegistry } from '../shared/services/AppRegistry';
import { IServerConfig } from '../shared/types';
import { getLabPlatformAuthHeaders } from '../shared/composables/useLabPlatformAuth';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}:${import.meta.env.VITE_API_BASE_PORT}`

export class AppGateway {
  private static instance: AppGateway;
  private registry: AppRegistry;
  private static launchInFlight: Map<string, Promise<boolean>> = new Map();

  private constructor() {
    this.registry = AppRegistry.getInstance();
  }

  public static getInstance(): AppGateway {
    if (!AppGateway.instance) {
      AppGateway.instance = new AppGateway();
    }
    return AppGateway.instance;
  }

  public async launch(appId: string, server: IServerConfig): Promise<boolean> {
    const pending = AppGateway.launchInFlight.get(appId);
    if (pending) {
      console.log(`[AppGateway.launch] Coalescing duplicate launch for app: ${appId}`);
      return pending;
    }

    const task = this.launchOnce(appId, server);
    AppGateway.launchInFlight.set(appId, task);
    try {
      return await task;
    } finally {
      AppGateway.launchInFlight.delete(appId);
    }
  }

  private async launchOnce(appId: string, server: IServerConfig): Promise<boolean> {
    console.log(`[AppGateway.launch] Starting launch for app: ${appId}`);

    const app = await this.registry.getById(appId);
    if (!app) {
      console.error(`[AppGateway.launch] App with ID '${appId}' not found.`);
      return false
    }

    try {
      const requestBody = { id: appId, entry: server.entry, port: server.port };
      const responseText = await axios.post(
        `${API_BASE_URL}/app/launch`,
        requestBody,
        {
          headers: getLabPlatformAuthHeaders(),
          withCredentials: true,
          timeout: 30000,
        }
      );

      console.log(`[AppGateway.launch] Response status: ${responseText.status}`);
      console.log(`[AppGateway.launch] Response body:`, responseText.data);

      if (responseText.data?.success) {
        console.log(`[AppGateway.launch] App launched successfully`);
        return true;
      } else {
        console.error(`[AppGateway.launch] Server response failed:`, responseText.data?.message);
        return false;
      }
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error(`[AppGateway.launch] Axios error: ${error.message}`);
        console.error(`[AppGateway.launch] Axios status: ${error.response?.status}`);
        console.error(`[AppGateway.launch] Axios data:`, error.response?.data);
      } else {
        console.error(`[AppGateway.launch] Error during launch:`, error);
      }
      return false
    }
  }

  public async teardown(appId: string, port: number): Promise<string> {
    const app = await this.registry.getById(appId);
    if (!app) {
      return `App with ID '${appId}' not found.`;
    }

    try {
      const requestBody = { id: appId, port: port };

      const response = await fetch(
        `${API_BASE_URL}/app/teardown`, {
        method: 'POST',
        headers: getLabPlatformAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        return `Failed to terminate app: ${response.statusText}`;
      }

      return '';
    } catch (error) {
      return `${JSON.stringify(error)}`
    }
  }
}
