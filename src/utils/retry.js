"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryWithBackoff = retryWithBackoff;
async function retryWithBackoff(operation, maxRetries = 3, baseDelay = 1000) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            const isRetryable = error.status === 503 ||
                error.status === 429 ||
                (error.status >= 500 && error.status < 600);
            if (!isRetryable || attempt === maxRetries - 1)
                throw error;
            const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
            console.log(`Attempt ${attempt + 1} failed: ${error.message}. Retrying in ${Math.round(delay)}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
    throw new Error('All retry attempts failed');
}
//# sourceMappingURL=retry.js.map