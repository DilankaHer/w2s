/**
 * Callback invoked when any API call fails due to timeout or network (server unreachable).
 * AuthProvider sets this to show a toast when the user is already inside the app.
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
