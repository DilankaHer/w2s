/**
 * User-facing error message from API errors. Hides "Aborted" (timeout) and returns fallback instead.
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  const msg = err instanceof Error ? err.message : ''
  if (msg === 'Aborted') return fallback
  return msg || fallback
}
