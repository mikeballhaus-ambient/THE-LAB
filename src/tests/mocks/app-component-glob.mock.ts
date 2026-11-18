import type { Component } from 'vue';

export type AppVueLoader = () => Promise<{ default: Component }>;
export type AppVueLoaderMap = Record<string, AppVueLoader>;

export const appComponentGlob: AppVueLoaderMap = {};
