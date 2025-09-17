"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCircuitBreakerOpen = isCircuitBreakerOpen;
exports.recordFailure = recordFailure;
exports.recordSuccess = recordSuccess;
const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_TIMEOUT = 60000;
const circuitBreaker = {
    failures: 0,
    lastFailure: null,
    isOpen: false,
};
function isCircuitBreakerOpen() {
    if (!circuitBreaker.isOpen)
        return false;
    if (circuitBreaker.lastFailure &&
        Date.now() - circuitBreaker.lastFailure > CIRCUIT_BREAKER_TIMEOUT) {
        circuitBreaker.isOpen = false;
        circuitBreaker.failures = 0;
        console.log('Circuit breaker has been reset.');
        return false;
    }
    return true;
}
function recordFailure() {
    circuitBreaker.failures++;
    circuitBreaker.lastFailure = Date.now();
    if (circuitBreaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
        circuitBreaker.isOpen = true;
        console.log(`Circuit breaker has OPENED after ${circuitBreaker.failures} failures.`);
    }
}
function recordSuccess() {
    circuitBreaker.failures = 0;
    circuitBreaker.isOpen = false;
}
//# sourceMappingURL=circuitBreaker.js.map