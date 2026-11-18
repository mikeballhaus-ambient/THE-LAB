import { Ref, ref, reactive, ComponentPublicInstance, computed, watch, watchEffect } from "vue";
import { AgentInteractionStatus, ChatPersona, ChatSessionRecord, ICommand, IContextSettings } from '../../../shared/types';
import { ToastServiceMethods } from "primevue/toastservice";
import Quill from 'quill'
import { MentionBlot } from "../../../shared/utils/mention-blot";

export interface PrimeVueEditorInstance {
  quill: InstanceType<typeof Quill>
}

interface QuillKeyboardBindingContext {
  event: KeyboardEvent;
}

interface QuillDeltaOp {
  insert?: string | Record<string, unknown>;
}

interface QuillDelta {
  ops?: QuillDeltaOp[];
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  [index: number]: { transcript: string };
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultLike[];
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
}
export type EditorInstance =
  ComponentPublicInstance &
  PrimeVueEditorInstance;

Quill.register('formats/mention', MentionBlot)

export function useMessagesInput(editorRef: Ref<EditorInstance | null>,
  sendMessageHandler: () => Promise<void>,
  chatReady: () => boolean,
  agentInteractionStatus: () => Map<string, AgentInteractionStatus>,
  contextUsed: () => number,
  contextSettings: () => IContextSettings | undefined,
  activeSessionRef: () => ChatSessionRecord | null,
  updateSession: (sessionId: string, updates: Partial<ChatSessionRecord>) => Promise<void>,
  toast: () => ToastServiceMethods,
  setStreamingEnabled: (streamingEnabled: boolean) => Promise<void>,
  getStreamingEnabled: () => Promise<boolean>
) {

  const isStreaming = ref(false);
  const isListening = ref(false);
  let recognitionInstance: SpeechRecognitionLike | null = null;

  const toggleVoiceInput = () => {
    // 1. If currently listening, STOP the existing instance
    if (isListening.value && recognitionInstance) {
      recognitionInstance.stop();
      // Logic inside onend will set isListening.value = false
      return;
    }

    // 2. Initialize if it doesn't exist
    const win = window as WindowWithSpeechRecognition;
    const SpeechRecognitionCtor = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      alert("Voice input is not supported in this browser.");
      return;
    }

    recognitionInstance = new SpeechRecognitionCtor();
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = false;
    recognitionInstance.lang = 'en-US';

    // 3. Setup Handlers
    recognitionInstance.onstart = () => {
      isListening.value = true;
    };

    recognitionInstance.onresult = (event: SpeechRecognitionEventLike) => {
      // resultIndex is the lowest index in the results list that has actually changed
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        // Only process "final" results to avoid appending partial/interim guesses
        if (event.results[i].isFinal) {
          const transcript = event.results[i][0].transcript;
          appendToEditor(transcript);
        }
      }
    };

    recognitionInstance.onerror = (event: SpeechRecognitionErrorEventLike) => {
      console.error("Speech Recognition Error:", event.error);
      isListening.value = false;
    };

    recognitionInstance.onend = () => {
      isListening.value = false;
      // Optional: Auto-restart logic if you still want it
      // if (shouldStayActive) recognitionInstance.start();
    };

    // 4. START
    recognitionInstance.start();
  };

  const appendToEditor = (text: string) => {
    const quill = editorRef.value?.quill;

    if (quill) {
      quill.focus()
      const range = quill.getSelection();
      const currentIndex = range ? range.index : quill.getLength();

      // Insert text at cursor or end
      quill.insertText(currentIndex, `${text} `);

      // Move cursor to the end of the new text
      quill.setSelection(currentIndex + text.length + 2, 0);
    }
  };

  const getPlaceHolderMsg = (isChatReady: boolean): string => {
    if (isChatReady) {
      return 'Type your message in Laboratory... `@` to add context or `/` for commands'
    } else {
      return 'Looking for the AI Lab Assistant, hang on. .'
    }
  }


  const getProgressColor = (contextUsed: number, contextSettings: IContextSettings | undefined) => {
    if (contextSettings) {
      if (contextUsed >= contextSettings.normal.minValue && contextUsed <= contextSettings.normal.maxValue) return contextSettings.normal.colorClass
      if (contextUsed >= contextSettings.warning.minValue && contextUsed <= contextSettings.warning.maxValue) return contextSettings.warning.colorClass
      if (contextUsed >= contextSettings.critical.minValue && contextUsed <= contextSettings.critical.maxValue) return contextSettings.critical.colorClass
    }
    return "bg-emerald-500!"
  }

  const placeHolderMsg = computed(() => getPlaceHolderMsg(chatReady()))
  const disabledState = computed(() => {
    const _activeSessionRef = activeSessionRef()
    if (_activeSessionRef) {
      const curAgentInteractionStatus = agentInteractionStatus().get(_activeSessionRef?.sessionId)
      if (curAgentInteractionStatus) {
        return !chatReady() || curAgentInteractionStatus.isAwaitingResponse || curAgentInteractionStatus.isSummarizingMessasge
      }
      return false
    }
    return false
  });
  const isActiveAwaitingResponse = computed(() => {
    const _activeSessionRef = activeSessionRef()
    if (_activeSessionRef) {
      const curAgentInteractionStatus = agentInteractionStatus().get(_activeSessionRef?.sessionId)
      if (curAgentInteractionStatus) return curAgentInteractionStatus.isAwaitingResponse

      return false
    }
    return false
  })
  const progressColor = computed(() => getProgressColor(contextUsed(), contextSettings()))

  watch(placeHolderMsg, (newVal) => {
    const quill = editorRef.value?.quill;
    if (quill) {
      quill.root.dataset.placeholder = newVal;
      quill.update();
    }
  });

  const onPersonaChange = async (newPersona: ChatPersona) => {
    const activeSession = activeSessionRef()
    if (activeSession) {
      await updateSession(activeSession.sessionId, {
        persona: newPersona,
        lastActivity: Date.now()
      });
      showToast('Persona', `Persona changed to ${newPersona}`, 3000);
    }
  };

  const showToast = (summary: string, detail: string, life: number = 3000) => {
    const _toast = toast()
    if (_toast) {
      _toast.add({
        severity: 'success',
        summary: summary,
        detail: detail,
        life: life
      });
    }
  };

  //const editorRef = ref<EditorInstance | null>(null);
  const selectedFileIndex = ref(-1)
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  const modules = {
    toolbar: false,
    keyboard: {
      bindings: {
        enter: {
          key: 'Enter',
          async handler(_range: unknown, context: QuillKeyboardBindingContext) {
            if (!context.event.shiftKey) {
              await sendMessageHandler()
              return false
            }

            return true
          }
        }
      }
    }
  }

  const updateCursorPosition = () => {
    const quill = editorRef.value?.quill
    if (!quill) return;

    const range = quill.getSelection();
    if (!range) return;

    const bounds = quill.getBounds(range.index);

    mentionState.dropdownPosition = {
      bottom: `10px`,
      left: `${bounds.left + 25}px`
    };
  };

  const handleTextUpdate = (repoFiles: string[], commands: ICommand[]) => {
    updateCursorPosition()

    const quill = editorRef.value?.quill
    if (!quill) return

    let value = quill.getText()
    if (value.endsWith('\n')) value = value.slice(0, -1)

    // Find the last trigger: @ or /
    const lastTriggerIndex = Math.max(
      value.lastIndexOf('@'),
      value.lastIndexOf('/')
    )

    if (lastTriggerIndex === -1) {
      mentionState.showDropdown = false
      mentionState.trigger = null
      mentionState.repoFiles = []
      mentionState.commands = []
      selectedFileIndex.value = -1
      return
    }

    const triggerChar = value[lastTriggerIndex] // '@' or '/'
    const textAfterTrigger = value.slice(lastTriggerIndex + 1)

    // Stop if nothing typed or space typed
    if (textAfterTrigger === '' || textAfterTrigger[0] === ' ') {
      mentionState.showDropdown = false
      mentionState.trigger = null
      mentionState.repoFiles = []
      mentionState.commands = []
      selectedFileIndex.value = -1
      return
    }

    const trimmed = textAfterTrigger.trim()
    const normalized = trimmed.toLowerCase()
    const firstWord = trimmed.split(/\s+/)[0].toLowerCase()

    // -------------------------------
    // @ FILE MENTION LOGIC
    // -------------------------------
    if (triggerChar === '@') {
      const isExact = repoFiles.some(f => f.toLowerCase() === firstWord)

      // Close dropdown if user finished typing a full filename
      if (isExact) {
        mentionState.showDropdown = false
        mentionState.trigger = null
        mentionState.repoFiles = []
        selectedFileIndex.value = -1
        return
      }

      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        mentionState.showDropdown = true
        mentionState.trigger = '@'
        mentionState.repoFiles = repoFiles.filter(f =>
          f.toLowerCase().includes(normalized)
        )
        selectedFileIndex.value = -1
      }, 300)

      return
    }

    // -------------------------------
    // / COMMAND MENTION LOGIC
    // -------------------------------
    if (triggerChar === '/') {
      const matchingCommands = commands.filter(cmd => cmd.key.includes(normalized))

      if (matchingCommands && matchingCommands.length > 0) {
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
          mentionState.showDropdown = true
          mentionState.trigger = '/'
          mentionState.commands = matchingCommands
          selectedFileIndex.value = -1
        }, 300)


      } else {
        mentionState.showDropdown = false
        mentionState.trigger = null
        mentionState.repoFiles = []
        mentionState.commands = []
        selectedFileIndex.value = -1
      }
      return
    }
  }

  const handleContextCommandSelection = (value: ICommand) => handleContextSelection(value.key, ' ')

  const handleContextSelection = (value: string, suffix: string) => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = null

    const quill = editorRef.value?.quill
    if (!quill) return

    quill.focus()
    const range = quill.getSelection()
    if (!range) return

    const cursorIndex = range.index

    // Get plain text and remove Quill's trailing newline
    let fullText = quill.getText()
    if (fullText.endsWith('\n')) fullText = fullText.slice(0, -1)

    // Detect last @ or /
    const lastTriggerIndex = Math.max(
      fullText.lastIndexOf('@', cursorIndex),
      fullText.lastIndexOf('/', cursorIndex)
    )

    if (lastTriggerIndex === -1) return

    // Delete everything from trigger to caret
    const deleteLength = cursorIndex - lastTriggerIndex
    quill.deleteText(lastTriggerIndex, deleteLength, 'api')

    // Insert mention embed (always length = 1)
    quill.insertEmbed(lastTriggerIndex, 'mention', {
      type: 'command',
      value
    }, 'api')

    // Insert trailing space
    quill.insertText(lastTriggerIndex + 1, suffix, {}, 'api')

    // Move caret AFTER embed + space
    quill.setSelection(lastTriggerIndex + 2, 0, 'api')

    // Close dropdown
    mentionState.showDropdown = false
    mentionState.trigger = null
    mentionState.repoFiles = []
    mentionState.commands = []
    selectedFileIndex.value = -1
  }

  const dropdownStyle = computed(() => {
    return {
      bottom: '10px',
      left: mentionState.dropdownPosition.left || '0'
    }
  });

  const mentionState = reactive({
    showDropdown: false,
    repoFiles: [] as string[],
    commands: [] as ICommand[],
    trigger: null as '@' | '/' | null,
    selectedValues: [] as string[],
    dropdownPosition: { bottom: '0', left: '0' }
  })

  const insertMultipleMentions = () => {
    const selectedValues = mentionState.selectedValues;
    if (!selectedValues || selectedValues.length === 0) return;

    const quill = editorRef.value?.quill;
    if (!quill) return;

    quill.focus();
    const range = quill.getSelection();
    if (!range) return;

    const cursorIndex = range.index;
    let fullText = quill.getText();
    if (fullText.endsWith('\n')) fullText = fullText.slice(0, -1);

    // 1. Find the trigger character position once
    const lastTriggerIndex = Math.max(
      fullText.lastIndexOf('@', cursorIndex),
      fullText.lastIndexOf('/', cursorIndex)
    )

    if (lastTriggerIndex === -1) return;

    const deleteLength = cursorIndex - lastTriggerIndex;

    // 2. Delete the trigger and typed search text once
    quill.deleteText(lastTriggerIndex, deleteLength, 'api');

    // 3. Batch insert all selected values
    let currentPos = lastTriggerIndex;
    selectedValues.forEach((value) => {
      // Insert mention embed
      quill.insertEmbed(currentPos, 'mention', {
        type: 'file',
        value
      }, 'api');
      currentPos += 1; // Mentions typically have a length of 1 in the document

      // Insert a trailing space (suffix) after each file
      const suffix = ' ';
      quill.insertText(currentPos, suffix, {}, 'api');
      currentPos += suffix.length;
    });

    // 4. Move caret after the last inserted item
    quill.setSelection(currentPos, 0, 'api');

    // 5. Reset mention state
    mentionState.showDropdown = false;
    mentionState.selectedValues = [];
    mentionState.repoFiles = [];
    mentionState.trigger = null;
  };

  const getMessage = (): string => {
    const quill = editorRef.value?.quill
    if (!quill) return ''
    const content = quill.getContents()
    const parsedContent = extractPlainTextFromDelta(content)

    quill.setContents([])
    quill.setSelection(0)

    return parsedContent
  };

  function extractPlainTextFromDelta(delta: QuillDelta): string {
    let result = ''

    for (const op of delta.ops ?? []) {
      if (typeof op.insert === 'string') {
        // Normalize spacing: ensure a single space between segments
        if (!result.endsWith(' ') && !op.insert.startsWith(' ')) {
          result += ' '
        }
        result += op.insert
      }

      else if (typeof op.insert === 'object' && op.insert !== null && 'mention' in op.insert) {
        const mention = (op.insert as { mention: { type?: string; value?: string } }).mention
        let text = ''

        if (mention.type === 'file') {
          text = `@${mention.value}`
        } else if (mention.type === 'command') {
          text = `/${mention.value}`
        } else {
          text = mention.value ?? ''
        }

        // Ensure spacing before mention
        if (!result.endsWith(' ')) {
          result += ' '
        }

        result += text

        // Ensure spacing after mention
        result += ' '
      }
    }

    // Collapse any accidental double spaces and trim edges
    return result.replace(/\s+/g, ' ').trim()
  }

  watchEffect(async () => {
    isStreaming.value = await getStreamingEnabled()
  })

  return {
    getMessage,
    mentionState,
    dropdownStyle,
    handleContextCommandSelection,
    handleTextUpdate,
    modules,
    placeHolderMsg,
    disabledState,
    progressColor,
    onPersonaChange,
    insertMultipleMentions,
    toggleVoiceInput,
    isListening,
    isStreaming,
    isActiveAwaitingResponse,
  }
}