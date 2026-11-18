export interface IContextLevel {
    minValue: number,
    maxValue: number,
    colorClass: string
}

export interface IContextSettings {
    id: number,
    userId?: number,
    enableAutoSummarization: boolean,
    triggerSummarizationPercent: number,
    normal: IContextLevel,
    warning: IContextLevel,
    critical: IContextLevel
}