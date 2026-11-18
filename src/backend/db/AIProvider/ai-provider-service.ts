import { aiProviderRepository } from './ai-provider-repository';
import {
  AiProvider,
  ProviderConfigBase,
  LLMProviderConfig,
} from '../../../shared/types';

export class AIProviderService {
  private static instance: AIProviderService | null = null;

  private constructor() { }

  public static getInstance(): AIProviderService {
    if (!this.instance) {
      this.instance = new AIProviderService();
    }
    return this.instance;
  }

  //
  // PROVIDERS
  //
  getProviderById(id: number): AiProvider | undefined {
    return aiProviderRepository.getProviderById(id);
  }

  getProviderByName(name: string): AiProvider | undefined {
    return aiProviderRepository.getProviderByName(name);
  }

  getAllProviders(): AiProvider[] {
    return aiProviderRepository.getAllProviders();
  }

  createProvider(provider: AiProvider): void {
    aiProviderRepository.insertProvider(provider);
  }

  updateProvider(id: number, provider: AiProvider): void {
    aiProviderRepository.updateProvider(id, provider);
  }

  deleteProvider(id: number): void {
    aiProviderRepository.deleteProvider(id);
  }

  //
  // USER AI PROVIDER CONFIGS (user_ai_provider_configs)
  //
  getStructuredUserProviderConfig(userId: number): LLMProviderConfig | undefined {
    return aiProviderRepository.getStructuredUserProviderConfig(userId);
  }

  getUserProviderConfigById(userId: number, providerType: 'chat' | 'embed'): ProviderConfigBase | undefined {
    return aiProviderRepository.getUserProviderConfigById(userId, providerType);
  }

  // Update user's provider configuration with full LLMProviderConfig object
  updateUserProviderConfig(
    userId: number,
    providerConfig: LLMProviderConfig
  ): void {
    aiProviderRepository.updateUserProviderConfig(
      userId,
      providerConfig.chat.providerId,
      providerConfig.chat.providerType,
      {
        model: providerConfig.chat.model,
        apiKey: providerConfig.chat.apiKey,
        baseUrl: providerConfig.chat.baseUrl,
        maxContext: providerConfig.chat.maxContext,
      } as ProviderConfigBase
    );

    aiProviderRepository.updateUserProviderConfig(
      userId,
      providerConfig.embed.providerId,
      providerConfig.embed.providerType,
      {
        model: providerConfig.embed.model,
        apiKey: providerConfig.embed.apiKey,
        baseUrl: providerConfig.embed.baseUrl,
        maxContext: providerConfig.embed.maxContext,
      } as ProviderConfigBase
    );
  }

  getAllUserProviderConfigs(): ProviderConfigBase[] {
    return aiProviderRepository.getAllUserProviderConfigs();
  }

  getProviderConfigsByUserId(userId: number): ProviderConfigBase[] {
    return aiProviderRepository.getProviderConfigsByUserId(userId);
  }

  deleteUserProviderConfigs(userId: number): void {
    aiProviderRepository.deleteUserProviderConfigs(userId);
  }

  /**
   * Ensure a user has default API provider configurations if they don't already have any.
   * @param userId - The user ID to ensure has default provider configs
   */
  ensureUserHasDefaultAPIProviders(userId: number): void {
    aiProviderRepository.ensureUserHasDefaultProviderConfigs(userId);
  }
}

// Singleton instance
export const aiProviderService = AIProviderService.getInstance();
export default aiProviderService;
