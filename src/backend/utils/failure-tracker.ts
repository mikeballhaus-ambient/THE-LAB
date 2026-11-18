// Constants - export for reuse
export const FAILURE_WINDOW_MS = 30000;  // 30 second sliding window
export const MAX_CONSECUTIVE_FAILURES = 3;  // Trigger after 3 consecutive failures
export const CONSECUTIVE_FAILURE_WINDOW_MS = 10000;  // Check within 10 seconds

// Tool name mapping
export const TOOLS_BY_ID: { [key: string]: string } = {
  'update_file': 'update_file tool',
  'create_file': 'create_file tool',
  'remove_file': 'remove_file tool',
  'create_directory': 'create_directory tool',
  'remove_directory': 'remove_directory tool',
  'documentor': 'documentor tool',
  'run_terminal_command': 'run_terminal_command tool'
};

// Failed tool call entry - tracks EXACT combination
export interface FailedToolCall {
  sessionId: string;
  toolId: string;
  toolCallParams: string | undefined;           // JSON.stringify(params)
  errorResponse: string;            // The exact failure message
  timestamp: number;                // Unix timestamp in milliseconds
  consecutiveCount: number;         // Running count of consecutive failures
  isBreakable: boolean;             // Flag when agent must break loop
  toolResultHash: string;           // Hash of toolResult for quick deduplication
}

// FailureTrackerEntry - per session data
export interface FailureTrackerEntry {
  sessionId: string;
  failures: Map<string, FailedToolCall[]>;  // compositeKey -> failures array
  preventFlags: Map<string, boolean>;       // compositeKey -> isPrevented
}

// Composite key: sessionId + toolCall + toolResult for exact matching
export const COMPOSITE_KEY_FORMAT = 'compositeKey(sessionId, toolCall, toolResult)';

// FailureTracker class - singleton, tracks failures ONLY
export class FailureTracker {
  private readonly FAILURE_WINDOW_MS = 30000;
  private readonly MAX_CONSECUTIVE_FAILURES = 3;
  private readonly CONSECUTIVE_FAILURE_WINDOW_MS = 10000;
  private static _instance: FailureTracker | null = null;
  private failureTracker: Map<string, FailureTrackerEntry>;

  /**
   * Create composite key for exact matching
   */
  public createCompositeKey(sessionId: string, toolId: string, toolCall: string | undefined, toolResult: string): string {
    const text = `${sessionId}:${toolId}:${toolCall}:${toolResult}`;
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // Singleton initialization
  public static getInstance(): FailureTracker {
    if (!FailureTracker._instance) {
      FailureTracker._instance = new FailureTracker();
    }
    return FailureTracker._instance;
  }

  public constructor() {
    this.failureTracker = new Map();
  }

  /**
   * Track a failure - only adds exact match, ignores duplicates
   */
  public trackFailure(
    sessionId: string,
    toolId: string,
    toolCallParams: string | undefined,
    errorResponse: string,
    currentTime: number
  ): FailedToolCall {
    const compositeKey = this.createCompositeKey(sessionId, toolId, toolCallParams, errorResponse);

    // Initialize session if needed
    if (!this.failureTracker.has(sessionId)) {
      this.failureTracker.set(sessionId, {
        sessionId: sessionId,
        failures: new Map(),
        preventFlags: new Map()
      });
    }

    const sessionEntry = this.failureTracker.get(sessionId)!;

    // Initialize composite key tracking if needed
    if (!sessionEntry.failures.has(compositeKey)) {
      sessionEntry.failures.set(compositeKey, []);
      sessionEntry.preventFlags.set(compositeKey, false);
    }

    const failures = sessionEntry.failures.get(compositeKey)!;

    const failureEntry: FailedToolCall = {
      sessionId: sessionId,
      toolId: toolId,
      toolCallParams: toolCallParams,
      errorResponse: errorResponse,
      timestamp: currentTime,
      consecutiveCount: 0,
      isBreakable: false,
      toolResultHash: this.hashString(errorResponse + toolCallParams)
    };

    failures.unshift(failureEntry);
    this.cleanupFailures(sessionEntry, compositeKey);

    return failureEntry;
  }

  /**
   * Check if consecutive failures detected for this EXACT combination
   * Returns: { prevent: boolean, consecutiveCount: number }
   */
  public shouldPreventSubsequentCalls(
    sessionId: string,
    toolId: string,
    toolCallParams: string | undefined,
    errorResponse: string,
    currentTime: number
  ): { prevent: boolean; consecutiveCount?: number } {
    const compositeKey = this.createCompositeKey(sessionId, toolId, toolCallParams, errorResponse);

    const sessionEntry = this.failureTracker.get(sessionId);
    if (!sessionEntry) {
      return { prevent: false };
    }

    const failures = sessionEntry.failures.get(compositeKey);
    if (!failures) {
      return { prevent: false };
    }

    const windowFailures = failures.filter(
      failure => currentTime - failure.timestamp <= this.CONSECUTIVE_FAILURE_WINDOW_MS
    );

    const currentCount = windowFailures.length;

    const result: { prevent: boolean; consecutiveCount?: number } = { prevent: false };

    if (currentCount >= this.MAX_CONSECUTIVE_FAILURES) {
      result.prevent = true;
      result.consecutiveCount = currentCount;
      sessionEntry.preventFlags.set(compositeKey, true);
    }

    return result;
  }

  /**
   * Update failure counts for all entries in a session
   */
  public updateFailureCounts(sessionId: string, currentTime: number): void {
    const sessionEntry = this.failureTracker.get(sessionId);
    if (!sessionEntry) return;

    for (const [, failures] of sessionEntry.failures.entries()) {
      const windowFailures = failures.filter(
        failure => currentTime - failure.timestamp <= this.CONSECUTIVE_FAILURE_WINDOW_MS
      );

      failures.forEach(failure => {
        failure.consecutiveCount = windowFailures.length;
        failure.isBreakable = windowFailures.length >= this.MAX_CONSECUTIVE_FAILURES;
      });
    }
  }

  /**
   * Get prevention status for exact combination
   */
  public isPrevented(
    sessionId: string,
    toolId: string,
    toolCallParams: string | undefined,
    errorResponse: string
  ): boolean {
    const sessionEntry = this.failureTracker.get(sessionId);
    if (!sessionEntry) return false;

    const compositeKey = this.createCompositeKey(sessionId, toolId, toolCallParams, errorResponse);
    const keyFlag = sessionEntry.preventFlags.get(compositeKey);
    return keyFlag === true;
  }

  /**
   * Remove prevention flag (when agent breaks the loop)
   */
  public resetPrevention(
    sessionId: string,
    toolId: string,
    toolCallParams: string | undefined,
    errorResponse: string
  ): void {
    const compositeKey = this.createCompositeKey(sessionId, toolId, toolCallParams, errorResponse);
    const sessionEntry = this.failureTracker.get(sessionId);
    if (!sessionEntry) return;

    const preventFlags = sessionEntry.preventFlags;
    preventFlags.set(compositeKey, false);
  }

  /**
   * Clear all data for a session (cleanup on session end)
   */
  public clearSession(sessionId: string): void {
    this.failureTracker.delete(sessionId);
  }

  /**
   * Cleanup failures outside the window
   */
  private cleanupFailures(sessionEntry: FailureTrackerEntry, compositeKey: string): void {
    const now = Date.now();
    const failures = sessionEntry.failures.get(compositeKey);
    if (!failures) return;

    const validFailures = failures.filter(
      failure => now - failure.timestamp <= this.FAILURE_WINDOW_MS
    );

    if (validFailures.length > this.MAX_CONSECUTIVE_FAILURES) {
      failures.length = 0;
      failures.push(...validFailures.slice(0, this.MAX_CONSECUTIVE_FAILURES));
    } else {
      failures.length = 0;
      failures.push(...validFailures);
    }
  }

  /**
   * Get tool display name
   */
  public static getToolDisplayName(toolId: string): string {
    return TOOLS_BY_ID[toolId] || toolId;
  }

  /**
   * Simple hash function for consistency
   */
  private hashString(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}
