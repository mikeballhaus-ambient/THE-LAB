<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { EditorState, type Extension } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { autocompletion, closeBrackets, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import { linter, type Diagnostic } from '@codemirror/lint';
import { bracketMatching, indentOnInput } from '@codemirror/language';

/**
 * CodeMirror-backed editor for the `code` step.
 *
 * ## Why a real editor now
 *
 * A textarea with a syntax check was enough to catch a missing paren, but not to *write* the node:
 * no monospaced layout, no line numbers, no completion, and an error message detached from the
 * position that caused it. CodeMirror 6 gives all three without a language server — it is a parser
 * and an editor, not an IDE, so it stays a few hundred KB rather than several megabytes.
 *
 * ## What the intellisense actually knows
 *
 * Only one thing, but it is the thing that matters: **the fields a real captured payload contained**
 * (see {@link latestCapturedPayloadFields}). Completion inside `item.` offers those paths, so every
 * suggestion is a field that genuinely arrived. Nothing invents `count` or `stepValue` from thin air —
 * a wrong suggestion here produces code that silently never runs.
 *
 * ## Linting is syntax-only, and says so
 *
 * `@codemirror/lang-javascript` ships a parser, not a type checker, so the linter compiles the body
 * (`new Function`) and maps the engine's own message to an offset. That catches unbalanced brackets,
 * stray identifiers and malformed arrow functions as you type. Value-dependent failures cannot be
 * caught statically and are reported by the run panel instead — pretending otherwise would be worse
 * than a narrower promise.
 */

const props = defineProps<{
  modelValue: string;
  /** Dotted paths from a captured payload, offered after `item.`. */
  payloadPaths?: { path: string; type: string }[];
  blockKey: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const host = ref<HTMLDivElement | null>(null);
const view = shallowRef<EditorView | null>(null);
/** Set while we push a prop value into the doc, so the change listener does not echo it back. */
let applyingExternal = false;

/**
 * The item parameter name the snippets use.
 *
 * Completion inserts `item.` references, so the example and the suggested paths have to agree with
 * each other. One convention — `item` — keeps the two honest; offering `it.foo` while the example
 * says `item.foo` would produce code that does not compile from a suggestion that looked right.
 */
const ITEM = 'item';

function completionSource(payloadPaths: { path: string; type: string }[]) {
  return (context: CompletionContext): CompletionResult | null => {
    const word = context.matchBefore(/[\w$.[\]]*/);
    if (!word || (word.from === word.to && !context.explicit)) {
      return null;
    }
    const options = [
      { label: 'items', type: 'variable', detail: 'the item array' },
      ...payloadPaths.map((field) => ({
        // `apply` writes the whole reference, so accepting a completion can never produce a
        // half-qualified path like `item.stepValue` inserted inside an existing `item.`.
        apply: `${ITEM}.${field.path}`,
        label: `${ITEM}.${field.path}`,
        type: 'property',
        detail: field.type,
      })),
    ];
    return { from: word.from, options };
  };
}

/**
 * Compile-only syntax check.
 *
 * `new Function` parses without executing, so an author's typo is caught before the node ever runs.
 * The wrapper is the same shape the sandbox evaluates, so "valid here" means "valid there".
 */
function syntaxDiagnostics(doc: string): Diagnostic[] {
  const source = doc.trim();
  if (!source) {
    return [];
  }
  try {
    // Parsing only — the body is never invoked.
    new Function(`return (${source});`);
    return [];
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid JavaScript.';
    // The engine reports a position for most parse errors; clamp it to the document so the underline
    // always lands somewhere real instead of throwing off the end of a short body.
    const position = /position (\d+)/i.exec(message);
    const at = position ? Math.min(Number(position[1]), doc.length) : 0;
    const from = Math.max(0, Math.min(at, doc.length > 0 ? doc.length - 1 : 0));
    return [
      {
        from,
        to: Math.min(from + 1, doc.length || 1),
        severity: 'error',
        message: message.replace(/\s*\(position \d+\)/i, ''),
        source: 'workflow-code',
      },
    ];
  }
}

function buildExtensions(): Extension[] {
  const paths = props.payloadPaths ?? [];
  return [
    lineNumbers(),
    highlightActiveLine(),
    history(),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    autocompletion({
      override: [completionSource(paths)],
      activateOnTyping: true,
    }),
    javascript(),
    keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
    linter((editor) => syntaxDiagnostics(editor.state.doc.toString()), { delay: 300 }),
    EditorView.updateListener.of((update) => {
      if (!update.docChanged || applyingExternal) {
        return;
      }
      emit('update:modelValue', update.state.doc.toString());
    }),
    EditorView.lineWrapping,
    EditorView.theme({
      '&': { fontSize: '0.8rem' },
      // Monospaced first and explicit: a theme that sets a sans font on `.cm-content` would otherwise
      // win, and a proportional code editor is the exact complaint this component exists to fix.
      '.cm-content, .cm-line': {
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
        lineHeight: '1.5',
      },
      '.cm-scroller': { minHeight: '8rem', maxHeight: '20rem' },
    }),
  ];
}

onMounted(() => {
  if (!host.value) {
    return;
  }
  view.value = new EditorView({
    state: EditorState.create({
      doc: props.modelValue,
      extensions: buildExtensions(),
    }),
    parent: host.value,
  });
});

onBeforeUnmount(() => {
  view.value?.destroy();
  view.value = null;
});

/** Keep the document in step with the parent, without clobbering the cursor mid-edit. */
watch(
  () => props.modelValue,
  (next) => {
    const current = view.value;
    if (!current || next === current.state.doc.toString()) {
      return;
    }
    applyingExternal = true;
    current.dispatch({
      changes: { from: 0, to: current.state.doc.length, insert: next },
    });
    applyingExternal = false;
  },
);

/**
 * Rebuild when the payload shape changes.
 *
 * Completion is closed over the paths at construction time, so a newly captured payload would keep
 * offering the old field list until the editor was remounted. Rebuilding the state is cheap and means
 * "capture, then write the code" works in one sitting.
 */
watch(
  () => props.payloadPaths,
  () => {
    const current = view.value;
    if (!current) {
      return;
    }
    const doc = current.state.doc.toString();
    current.setState(EditorState.create({ doc, extensions: buildExtensions() }));
  },
  { deep: true },
);

function insertSnippet(snippet: string): void {
  const current = view.value;
  if (!current) {
    return;
  }
  const { from, to } = current.state.selection.main;
  current.dispatch({
    changes: { from, to, insert: snippet },
    selection: { anchor: from + snippet.length },
  });
  current.focus();
}

defineExpose({ insertSnippet });
</script>

<template>
  <div
    class="lab-workflow-code-editor"
    :id="`wf-code-editor-${props.blockKey}`"
    :data-code-block-key="props.blockKey"
  >
    <div ref="host" class="lab-workflow-code-editor__host" />
  </div>
</template>
