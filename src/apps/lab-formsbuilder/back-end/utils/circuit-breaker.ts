/**
 * Circuit Breaker Pattern Implementation
 * 
 * Provides resilience for external API calls by automatically failing fast
 * when a service is unavailable, preventing cascading failures.
 * 
 * Based on the circuit breaker pattern:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service failed too many times, requests fail immediately
 * - HALF-OPEN: Testing if service recovered, one request allowed
 */

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
}

/**
 * Circuit Breaker Configuration
 */
export interface CircuitBreakerConfig {
  name: string;                    // Name for logging purposes
  failureThreshold: number;        // Number of failures before opening circuit
  resetTimeout: number;            // Time in ms to wait before trying HALF_OPEN
  halfOpenMaxRequests: number;     // Max requests allowed in HALF_OPEN state
}

/**
 * Default configuration for circuit breakers
 */
export const DEFAULT_CONFIG: CircuitBreakerConfig = {
  name: 'default',
  failureThreshold: 5,             // Open after 5 consecutive failures
  resetTimeout: 30000,             // Wait 30 seconds before trying again
  halfOpenMaxRequests: 3,          // Allow 3 test requests in HALF_OPEN state
};

/**
 * Circuit Breaker Class
 */
export class CircuitBreaker {
  private state: CircuitBreakerState;
  private config: CircuitBreakerConfig;
  private callCount: number = 0;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
    this.state = {
      state: 'CLOSED',
      failureCount: 0,
      successCount: 0,
    };
  }

  /**
   * Execute a call through the circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.callCount++;

    // If circuit is OPEN, wait for reset timeout before attempting HALF_OPEN
    if (this.state.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - (this.state.lastFailureTime?.getTime() || 0);
      
      if (timeSinceLastFailure >= this.config.resetTimeout) {
        // Transition to HALF_OPEN state
        this.transitionToHalfOpen();
      } else {
        // Still in OPEN state, fail immediately
        throw new CircuitBreakerOpenError(
          `Circuit breaker [${this.config.name}] is OPEN. Retry after ${this.config.resetTimeout - timeSinceLastFailure}ms`
        );
      }
    }

    try {
      // Execute the actual call
      const result = await fn();
      
      // Success handling
      this.handleSuccess();
      return result;
    } catch (error: unknown) {
      // Failure handling
      this.handleFailure();
      throw error;
    }
  }

  /**
   * Record a successful call
   */
  private handleSuccess(): void {
    this.state.successCount++;
    this.state.failureCount = 0;
    this.state.lastSuccessTime = new Date();

    // If in HALF_OPEN state and we've seen enough successes, close the circuit
    if (this.state.state === 'HALF_OPEN' && 
        this.state.successCount >= this.config.halfOpenMaxRequests) {
      this.transitionToClosed();
    }
  }

  /**
   * Record a failed call
   */
  private handleFailure(): void {
    this.state.failureCount++;
    this.state.lastFailureTime = new Date();

    // If in HALF_OPEN state, transition back to OPEN on failure
    if (this.state.state === 'HALF_OPEN') {
      this.transitionToOpen();
    }
    // If CLOSED and we hit the failure threshold, open the circuit
    else if (this.state.state === 'CLOSED' && 
             this.state.failureCount >= this.config.failureThreshold) {
      this.transitionToOpen();
    }
  }

  /**
   * Transition to OPEN state
   */
  private transitionToOpen(): void {
    this.state.state = 'OPEN';
    console.warn(`[CircuitBreaker] ${this.config.name} circuit is now OPEN after ${this.state.failureCount} failures`);
  }

  /**
   * Transition to HALF_OPEN state
   */
  private transitionToHalfOpen(): void {
    this.state.state = 'HALF_OPEN';
    this.state.successCount = 0;
    console.info(`[CircuitBreaker] ${this.config.name} circuit is now in HALF_OPEN state`);
  }

  /**
   * Transition to CLOSED state
   */
  private transitionToClosed(): void {
    this.state.state = 'CLOSED';
    this.state.failureCount = 0;
    console.info(`[CircuitBreaker] ${this.config.name} circuit is now CLOSED (service recovered)`);
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  /**
   * Reset the circuit breaker (useful for testing)
   */
  reset(): void {
    this.state = {
      state: 'CLOSED',
      failureCount: 0,
      successCount: 0,
    };
    this.callCount = 0;
    console.info(`[CircuitBreaker] ${this.config.name} circuit has been reset`);
  }

  /**
   * Check if circuit is open
   */
  isOpen(): boolean {
    return this.state.state === 'OPEN';
  }

  /**
   * Get the current state string
   */
  getStateString(): string {
    return this.state.state;
  }
}

/**
 * Circuit Breaker Open Error
 */
export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

/**
 * Factory function to create a circuit breaker for external API calls
 */
export function createExternalApiCircuitBreaker(
  name: string,
  config?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  return new CircuitBreaker({
    name,
    failureThreshold: config?.failureThreshold ?? DEFAULT_CONFIG.failureThreshold,
    resetTimeout: config?.resetTimeout ?? DEFAULT_CONFIG.resetTimeout,
    halfOpenMaxRequests: config?.halfOpenMaxRequests ?? DEFAULT_CONFIG.halfOpenMaxRequests,
  });
}

/**
 * Create a circuit breaker with default configuration
 */
export function createDefaultCircuitBreaker(name: string): CircuitBreaker {
  return new CircuitBreaker({
    name,
    failureThreshold: DEFAULT_CONFIG.failureThreshold,
    resetTimeout: DEFAULT_CONFIG.resetTimeout,
    halfOpenMaxRequests: DEFAULT_CONFIG.halfOpenMaxRequests,
  });
}
