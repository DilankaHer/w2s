/**
 * Callback invoked when any API call fails due to timeout or network (server unreachable).
 * Set via setOnServerUnreachable for optional handling (e.g. toast).
 */
let onServerUnreachable: (() => void) | null = null

export function setOnServerUnreachable(fn: (() => void) | null): void {
  onServerUnreachable = fn
}

export function triggerServerUnreachable(): void {
  if (onServerUnreachable) {
    onServerUnreachable()
  }
}
