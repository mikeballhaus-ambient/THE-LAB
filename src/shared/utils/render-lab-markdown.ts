import { marked, Tokens } from 'marked';
import { sanitizeLabHtml } from '@/shared/utils/sanitize-lab-html';
import { stripLeakedNativeToolCallsFromText } from '@/shared/utils/strip-leaked-assistant-tool-calls';

/**
 * The single markdown → sanitized HTML pipeline for the whole platform.
 *
 * Two audiences consume this, and they need different treatment:
 *
 * | Caller | Options | Why |
 * |---|---|---|
 * | Laboratory chat (`useMessagesView`) | `{ repairStreamedMarkdown: true, breaks: true }` | Text arrives token-by-token from a model, so fences/tables are often mid-token and want a hard break per newline. |
 * | Knowledge Base articles | `{ breaks: false }` | Text is authored once by a human. Repair rewrites would corrupt it. |
 *
 * **The repair pass is not a markdown feature.** It fixes broken model output and it *will*
 * mutilate authored prose. Two concrete examples:
 *
 * - `replace(/:\s*(?=\|)/g, ':\n')` splits `Note: | Role |` into `Note:` plus a table.
 * - `replace(/\n\n/g, '\n')` collapses every blank line, so markdown paragraph breaks
 *   disappear and a document renders as one dense block.
 *
 * Never enable it for content written by a person.
 */

/**
 * Renderer overrides registered once, globally.
 *
 * `marked.use()` mutates the shared singleton, which is why this lives here rather than in a
 * composable: every caller that renders markdown — chat, sidecar, Knowledge Base — must get
 * the same table and rule styling.
 */
marked.use({
  renderer: {
    table(token: Tokens.Table) {
      const tcellFormatter = (cell: Tokens.TableCell) => {
        const tag = cell.header ? 'th' : 'td';
        return `<${tag} class="p-1 border border-lab-general-border">${cell.text}</${tag}>`;
      };
      const headerHtml = `
        <tr>
          ${token.header.map((cell) => tcellFormatter(cell)).join('')}
        </tr>
      `;
      const bodyHtml = token.rows
        .map((row) => {
          return `
            <tr>
              ${row.map((cell) => tcellFormatter(cell)).join('')}
            </tr>
          `;
        })
        .join('');

      return `
        <table class="border-spacing-0 w-full mt-3 mb-3">
          <thead>${headerHtml}</thead>
          <tbody>${bodyHtml}</tbody>
        </table>
      `;
    },
    hr() {
      return '<hr class="m-3" />\n';
    },
  },
});

/**
 * Stream-repair heuristics for model output.
 *
 * Preserved verbatim from the original Laboratory implementation so chat rendering does not
 * change byte-for-byte. Do not "tidy" these regexes — each one compensates for a specific
 * malformation seen in streamed model output.
 */
export function repairStreamedMarkdown(text: string): string {
  if (!text) return '';
  let processed = text;

  processed = processed.replace(/%EF%B8%8F/g, '');
  processed = processed.replace(/(#+)(---+)/g, '$1\n$2\n');
  processed = processed.replace(/(---+)(#+)/g, '\n$1\n$2');
  processed = processed.replace(/:\s*(?=\|)/g, ':\n');
  processed = processed.replace(/^(?!(?:[^\n]*\|){2,})\s*(---+)\s*$/gm, '\n$1\n');
  processed = processed.replace(/(##\s+[^\n|]+)(\s*\|)/g, '$1\n$2');
  processed = processed.replace(/:(?=\d)/g, ':\n');
  processed = processed.replace(/([^\n])(?=\d+\.\s*\*\*)/g, '$1\n');

  const listStorage: string[] = [];

  processed = processed.replace(/```((?:(?!```)[\s\S])+?)```/g, (match, codeContent: string) => {
    if (/\d/.test(codeContent)) {
      let formattedInner = codeContent.replace(/(?<![\s`])(\d+\.)/g, ' $1');
      formattedInner = formattedInner.replace(/→\s*(?=\d)/g, '\n');
      formattedInner = formattedInner.trim();

      const placeholderIndex = listStorage.length;
      listStorage.push(`\n\n${formattedInner}\n\n`);

      return `__NUMBERED_LIST_PLACEHOLDER_${placeholderIndex}__`;
    }

    return match;
  });

  const tableBoundsRegex = /(\|[\s\S]*?\|{1,2}(?:[\s\S]*?\|{2,}[\s\S]*?)+)/gi;
  let result = processed.replace(tableBoundsRegex, (tableBlock) => {
    const brokenLinesText = tableBlock.replace(/\s*\|\|\s*/g, ' | \n | ');
    const lines = brokenLinesText.split('\n');
    const cleanRows: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      let trimmedRow = lines[i];
      if (!trimmedRow) continue;
      trimmedRow = trimmedRow.replace(/\s*\|\s*/g, ' | ');
      cleanRows.push(trimmedRow);
    }
    return '\n\n' + cleanRows.join('\n') + '\n\n';
  });

  result = result.replace(/\n\s*\|\s*\n/g, '\n |');
  result = result.replace(/\n\n---\n\n/g, '\n---\n');
  result = result.replace(/(\S)(##)/g, '$1\n$2');
  result = result.replace(/__NUMBERED_LIST_PLACEHOLDER_(\d+)__/g, (_, index: string) => {
    return listStorage[parseInt(index, 10)];
  });

  result = result.replace(/([^\n])(```)/g, '$1\n$2');
  result = result.replace(/(```)([^\n])/g, '$1\n$2');
  result = result.replace(/(```)(\*)([A-Za-z])/g, '$1\n$2$3');
  result = result.replace(/([^\n])(-\s*✅)/g, '$1\n$2');
  result = result.replace(/([a-z])([A-Z][a-z\s]+)$/m, '$1\n$2');
  result = result.replace(/\n\n/g, '\n');

  return result;
}

export interface RenderLabMarkdownOptions {
  /**
   * Run the stream-repair heuristics. **Chat only** — never for authored documentation.
   * Default `false`.
   */
  repairStreamedMarkdown?: boolean;
  /**
   * Strip leaked native tool-call JSON out of assistant text before rendering. Chat only.
   * Default `false`.
   */
  stripLeakedToolCalls?: boolean;
  /**
   * `true` = a single newline is a visual line break (chat).
   * `false` = single newlines collapse into a paragraph and prose reflows (documents).
   * Default `false`.
   */
  breaks?: boolean;
}

/**
 * Render markdown to sanitized HTML.
 *
 * Always runs the result through {@link sanitizeLabHtml} (DOMPurify) before it reaches
 * `v-html`.
 */
export function renderLabMarkdown(
  markdown: string,
  options: RenderLabMarkdownOptions = {},
): string {
  if (!markdown) {
    return '';
  }
  let source = markdown;
  if (options.stripLeakedToolCalls) {
    source = stripLeakedNativeToolCallsFromText(source);
  }
  if (options.repairStreamedMarkdown) {
    source = repairStreamedMarkdown(source);
  }
  const html = marked(source, { async: false, gfm: true, breaks: options.breaks ?? false }) as string;
  return sanitizeLabHtml(html);
}
