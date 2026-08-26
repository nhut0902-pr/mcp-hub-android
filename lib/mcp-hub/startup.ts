/**
 * Keeps first paint responsive when a native storage module is slow or unavailable.
 * The original promise may settle later, but callers can continue with a safe fallback.
 */
export function withStartupTimeout<T>(operation: Promise<T>, fallback: T, timeoutMs = 2500): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), timeoutMs);
    operation
      .then((value) => resolve(value))
      .catch(() => resolve(fallback))
      .finally(() => clearTimeout(timer));
  });
}
