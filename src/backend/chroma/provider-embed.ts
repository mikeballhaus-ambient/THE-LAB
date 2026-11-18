import { LLMProvider } from '../../shared/types';

export async function embedTexts(texts: string[], llmProvider: LLMProvider | undefined) {

  const vectors: number[][] = [];

  if (!llmProvider) return vectors;

  for (const text of texts) {
    try {
      const MAX_CHARS = 1250; // Conservative limit for safety
      let truncatedText = text.substring(0, Math.min(text.length, MAX_CHARS));

      if (text.length > MAX_CHARS) {
        truncatedText += ' [truncated: original was longer than ' + MAX_CHARS + ' characters]';
      }

      const res = await llmProvider.embed(truncatedText)

      vectors.push(res);
    } catch (error: unknown) {
      throw error;
    }
  }

  return vectors;
}
