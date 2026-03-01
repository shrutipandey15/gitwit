export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      const status = (error as { status?: number })?.status;
      const isRetryable =
        status === 503 ||
        status === 429 ||
        (status !== undefined && status >= 500 && status < 600);
      if (!isRetryable || attempt === maxRetries - 1) throw error;

      const message = error instanceof Error ? error.message : String(error);
      const delay =
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.log(
        `Attempt ${attempt + 1} failed: ${message}. Retrying in ${Math.round(delay)}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error('All retry attempts failed');
}