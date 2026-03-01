/**
 * Callback invoked when any API returns 401 Unauthorized (e.g. token expired).
 * Set via setOnUnauthorized for optional handling (e.g. toast).
 */
let onUnauthorized: (() => void) | null = null

export function setOnUnauthorized(fn: (() => void) | null): void {
  onUnauthorized = fn
}

export function triggerUnauthorized(): void {
  if (onUnauthorized) {
    onUnauthorized()
  }
}
