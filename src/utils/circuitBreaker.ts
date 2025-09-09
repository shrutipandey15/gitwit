import { CircuitBreaker } from '../types';

const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_TIMEOUT = 60000;

const circuitBreaker: CircuitBreaker = {
  failures: 0,
  lastFailure: null,
  isOpen: false,
};

export function isCircuitBreakerOpen(): boolean {
  if (!circuitBreaker.isOpen) return false;

  if (
    circuitBreaker.lastFailure &&
    Date.now() - circuitBreaker.lastFailure > CIRCUIT_BREAKER_TIMEOUT
  ) {
    circuitBreaker.isOpen = false;
    circuitBreaker.failures = 0;
    console.log('Circuit breaker has been reset.');
    return false;
  }
  return true;
}

export function recordFailure(): void {
  circuitBreaker.failures++;
  circuitBreaker.lastFailure = Date.now();
  if (circuitBreaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitBreaker.isOpen = true;
    console.log(
      `Circuit breaker has OPENED after ${circuitBreaker.failures} failures.`
    );
  }
}

export function recordSuccess(): void {
  circuitBreaker.failures = 0;
  circuitBreaker.isOpen = false;
}