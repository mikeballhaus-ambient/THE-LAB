import { ChatPersona } from "./chat"

export interface ICommandBase {
    description: string,
}

export interface ICommand extends ICommandBase {
    userId?: number  // Optional: Track which user this belongs to (defaults to current user)
    key: string
    text: string
    persona: ChatPersona & ''
    argumentHints: string[]
}
