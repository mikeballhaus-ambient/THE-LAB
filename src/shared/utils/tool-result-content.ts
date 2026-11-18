/** Default cap for tool result text in chat history, Dexie, and provider tool messages. */
export const DEFAULT_TOOL_RESULT_CONTENT_MAX_CHARS = 8000;

const TRUNCATION_SUFFIX =
  '\n\n[Tool result truncated for chat storage and model context.]';

/**
 * Limits large tool payloads (e.g. web_fetch HTML) persisted in Dexie and sent back to the model.
 */
export function truncateToolResultContent(
  content: string,
  maxChars: number = DEFAULT_TOOL_RESULT_CONTENT_MAX_CHARS,
): string {
  if (!content || content.length <= maxChars) {
    return content;
  }
  const budget = Math.max(0, maxChars - TRUNCATION_SUFFIX.length);
  return `${content.slice(0, budget)}${TRUNCATION_SUFFIX}`;
}

/** Strip HTML to plain text for web_fetch (models and UI do not need raw markup). */
export function htmlResponseToPlainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
