import { ref, Ref, nextTick } from "vue";
import { ChatSessionRecord, ExtendedFile, ExtendedFileResolved } from "../../../shared/types";
import FileUpload from "primevue/fileupload";

type MutableFileUpload = InstanceType<typeof FileUpload> & {
  files: File[];
  clear(): void;
};

interface FileUploadSelectEvent {
  files: File[];
}

export function useInputFileHandler(
  fileUploadRef: Ref<InstanceType<typeof FileUpload> | null>,
  activeSessionRef: () => ChatSessionRecord | null,
  updateSession: (sessionId: string, updates: Partial<ChatSessionRecord>) => Promise<void>,
) {
  const isDragging = ref(false);
  const uploadedFiles = ref<ExtendedFile[]>([]);

  const loadUploadedFiles = async () => {
    const _init_activeSessionRef = activeSessionRef()
    if (_init_activeSessionRef && _init_activeSessionRef.files) {
      // 1. Hydrate your local state
      const hydrated = _init_activeSessionRef.files.map((dbFile: ExtendedFileResolved) => {
        const file = base64ToFile(dbFile.base64, dbFile.name, dbFile.type);
        return {
          file,
          base64: dbFile.base64,
          preview: URL.createObjectURL(file)
        } as ExtendedFile;
      });

      uploadedFiles.value = hydrated;

      // 2. Sync the PrimeVue Component
      await nextTick(); // Wait for the component to be available
      if (fileUploadRef.value) {
        // We only need to pass the native File objects to the component
        (fileUploadRef.value as MutableFileUpload).files = hydrated.map(h => h.file);
      }
    } else {
      // ELSE: Switch to a session with no files
      // 1. Revoke existing object URLs to free memory
      uploadedFiles.value.forEach(f => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });

      // 2. Reset the reactive array
      uploadedFiles.value = [];

      // 3. Reset the PrimeVue component UI
      await nextTick();
      if (fileUploadRef.value) {
        (fileUploadRef.value as MutableFileUpload).files = [];
        // Also call clear() if you want to reset the internal validation/state
        (fileUploadRef.value as MutableFileUpload).clear();
      }
    }
  }

  const base64ToFile = (base64: string, filename: string, mimeType: string): File => {
    const byteString = atob(base64.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new File([ab], filename, { type: mimeType });
  };

  const onDrop = async (event: DragEvent) => {
    isDragging.value = false;
    const files = event.dataTransfer?.files;

    if (files && files.length > 0 && fileUploadRef.value) {
      // 1. Filter out files that already exist in our state
      const fileArray = Array.from(files).filter(newFile => {
        return !uploadedFiles.value.some(existing =>
          existing.file.name === newFile.name &&
          existing.file.size === newFile.size &&
          existing.file.lastModified === newFile.lastModified
        );
      });

      // 2. If all dropped files were duplicates, stop here
      if (fileArray.length === 0) return;

      // 3. Update PrimeVue internal state safely
      const upload = fileUploadRef.value as MutableFileUpload;
      const internalFiles = upload.files || [];
      upload.files = [...internalFiles, ...fileArray];

      await processFiles(fileArray);
    }
  };

  // Unified handler for conversion and list maintenance
  const processFiles = async (files: File[]) => {
    // 1. Convert files to Base64 in parallel
    const filePromises = files.map((file) => {
      return new Promise<ExtendedFile>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            file, // Kept for current memory state only
            preview: URL.createObjectURL(file), // Local preview for UI
            base64: e.target?.result as string
          });
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });
    });

    try {
      const processedResults = await Promise.all(filePromises);
      uploadedFiles.value.push(...processedResults);

      const activeSession = activeSessionRef();
      if (activeSession) {
        // 2. SANITIZE for Dexie: Strip non-cloneable File objects and preview URLs
        const dbFriendlyFiles = uploadedFiles.value.map(f => ({
          name: f.file.name,
          size: f.file.size,
          type: f.file.type,
          base64: f.base64 // This string IS cloneable and persistent
        } as ExtendedFileResolved));

        // 3. Update session with clean objects
        await updateSession(activeSession.sessionId, {
          files: dbFriendlyFiles,
          lastActivity: Date.now()
        });
      }
    } catch (error) {
      console.error("Error processing files:", error);
    }
  };

  const onFileSelect = (event: FileUploadSelectEvent) => {
    const newFiles = (event.files as File[]).filter(newFile => {
      return !uploadedFiles.value.some(existing =>
        existing.file.name === newFile.name &&
        existing.file.size === newFile.size
      );
    });

    if (newFiles.length > 0) {
      processFiles(newFiles);
    }
  };

  // Delete handler
  const removeFile = async (index: number, removeFileCallback: (fileIndex: number) => void) => {
    // 1. Memory Cleanup
    if (uploadedFiles.value[index]) {
      URL.revokeObjectURL(uploadedFiles.value[index].preview);
    }

    // 2. State & UI Cleanup
    // These happen instantly (synchronously)
    uploadedFiles.value.splice(index, 1);
    removeFileCallback(index);

    const persistentFiles: ExtendedFileResolved[] = uploadedFiles.value.map(f => ({
      name: f.file.name,
      size: f.file.size,
      type: f.file.type,
      base64: f.base64
    } as ExtendedFileResolved));

    // 3. Persist the change
    const activeSession = activeSessionRef();
    if (activeSession) {
      try {
        await updateSession(activeSession.sessionId, {
          files: persistentFiles,
          lastActivity: Date.now()
        });
      } catch (error) {
        console.error("Failed to sync file removal to session:", error);
      }
    }
  };

  const onPaste = async (event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    const pastedFiles: File[] = [];

    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          // Prevent duplicates using your existing logic pattern
          const isDuplicate = uploadedFiles.value.some(existing =>
            existing.file.name === file.name && existing.file.size === file.size
          );

          if (!isDuplicate) {
            pastedFiles.push(file);
          }
        }
      }
    }

    if (pastedFiles.length > 0 && fileUploadRef.value) {
      // 1. Update PrimeVue internal state so they appear in UI
      const upload = fileUploadRef.value as MutableFileUpload;
      const internalFiles = upload.files || [];
      upload.files = [...internalFiles, ...pastedFiles];

      // 2. Process for Base64 and Session update
      await processFiles(pastedFiles);
    }
  };

  const clearAllFiles = async () => {
    // 1. Cleanup memory FIRST while we still have the references
    uploadedFiles.value.forEach((item) => URL.revokeObjectURL(item.preview));

    // 2. Clear local state and UI component
    uploadedFiles.value = [];
    (fileUploadRef.value as MutableFileUpload | null)?.clear();

    // 3. Persist the empty state
    const activeSession = activeSessionRef();
    if (activeSession) {
      try {
        await updateSession(activeSession.sessionId, {
          files: [], // Explicitly sending empty array
          lastActivity: Date.now()
        });
      } catch (error) {
        console.error("Failed to clear session files:", error);
      }
    }
  };

  return {
    isDragging,
    uploadedFiles,
    loadUploadedFiles,
    onDrop,
    onFileSelect,
    removeFile,
    onPaste,
    clearAllFiles
  }
}