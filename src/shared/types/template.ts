import { IApp } from "./index";

export interface TemplateResult {
    success: boolean,
    app: IApp,
    error: string
}