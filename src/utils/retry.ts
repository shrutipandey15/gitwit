export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      const isRetryable =
        error.status === 503 ||
        error.status === 429 ||
        (error.status >= 500 && error.status < 600);
      if (!isRetryable || attempt === maxRetries - 1) throw error;

      const delay =
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.log(
        `Attempt ${
          attempt + 1
        } failed: ${error.message}. Retrying in ${Math.round(delay)}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error('All retry attempts failed');
}