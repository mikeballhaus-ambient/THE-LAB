export interface AiProvider {
    id: number
    name: string
    baseUrl: string
    supportsApiKey: boolean
}

export interface ProviderConfigBase {
    id: number
    provider: string
    providerId: number
    providerType: 'chat' | 'embed'
    model: string
    apiKey: string
    baseUrl: string
    maxContext: string
}

export type LLMChatProviderConfig = ProviderConfigBase;

export type LLMEmbedProviderConfig = ProviderConfigBase;

export interface LLMProviderConfig {
    chat: LLMChatProviderConfig
    embed: LLMEmbedProviderConfig
}

import type { RuntimeApp } from "./index";

export type ProviderData = {
    aiProviders: AiProvider[],
    //mcpTools: ToolsList[],
    repoFiles: string[],
    sysMsg: string,
    apps: RuntimeApp[]
}
