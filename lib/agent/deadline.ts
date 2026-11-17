// Enforce the request deadline even if an upstream SDK ignores its abort signal.
export function withinDeadline<T>(
  operation: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(new Error("AI request timeout"));
    // Always consume an eventual rejection, including after a pre-aborted call.
    operation
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", abort));
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener("abort", abort, { once: true });
  });
}
