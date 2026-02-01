# Reduce API Timeout, Tab Health Check, and Server-Down Overlay

## Overview

1. Reduce API request timeout to 5s.
2. Run a health check when Profile, History, or Templates tab gains focus, with a 5s cooldown.
3. Replace the server-down full screen and in-app Alert with a toast-sized dialog at the top and a blocking overlay; set `serverDown` when any API fails in-app so the overlay appears (e.g. when opening a template while server is down).

---

## 1. Reduce API request timeout to 5s

**File:** [mobile/src/api/client.ts](mobile/src/api/client.ts)

- Change `API_REQUEST_TIMEOUT_MS` from `10_000` to `5_000`.
- Update the comment on the fetch block from "10s timeout" to "5s timeout".

---

## 2. Health check on tab focus (Profile, History, Templates) with 5s cooldown

**AuthContext** ([mobile/src/contexts/AuthContext.tsx](mobile/src/contexts/AuthContext.tsx))

- Add a `lastHealthCheckAtRef` (or similar) to track last run; skip if `Date.now() - lastHealthCheckAtRef.current < 5_000`.
- Expose `checkServerOnFocus()` (or equivalent) that:
  - Returns immediately if `serverDown` is already true.
  - Returns immediately if last health check was &lt; 5s ago.
  - Calls `runHealthCheck()` in the background (no loading state).
  - On success: set `serverDown(false)` (and optionally refresh auth if desired).
  - On failure: set `serverDown(true)` so the overlay is shown.
  - Update last-run timestamp on start.

**ProfileScreen** ([mobile/src/screens/ProfileScreen.tsx](mobile/src/screens/ProfileScreen.tsx))

- Use `useFocusEffect` from `@react-navigation/native` to call `checkServerOnFocus()` when the Profile tab gains focus.

**TemplatesScreen** ([mobile/src/screens/TemplatesScreen.tsx](mobile/src/screens/TemplatesScreen.tsx))

- Use `useFocusEffect` to call `checkServerOnFocus()` when the Templates tab gains focus.

**HistoryScreen** ([mobile/src/screens/HistoryScreen.tsx](mobile/src/screens/HistoryScreen.tsx))

- Use `useFocusEffect` to call `checkServerOnFocus()` when the History tab gains focus.

Result: switching to any of these tabs runs a health check at most once every 5s; if the server is down (or comes back up), the overlay state updates so the user sees "Server is down" with Retry or can use the app again.

---

## 3. Set serverDown when any API fails in-app

**AuthContext** ([mobile/src/contexts/AuthContext.tsx](mobile/src/contexts/AuthContext.tsx))

- In the `setOnServerUnreachable` callback: call `setServerDown(true)` so the next render shows the overlay. Remove the `Alert.alert` (replaced by the overlay).

This way, if the user opens a template (or does any action) while the server is down, the failing request triggers the callback, sets `serverDown`, and the overlay appears with Retry instead of leaving them on a broken or loading screen.

---

## 4. Server-down UI: toast-sized dialog at top + block screen

**Current behavior:** When `serverDown` is true, `RootNavigator` renders a full-screen `ServerDownScreen` (centered content). When an API fails in-app, an `Alert.alert` is shown and `serverDown` is not set.

**New behavior:**

- When `serverDown` is true, show a **single overlay** that:
  - Covers the full screen with a semi-transparent (or opaque) backdrop so **all touches are blocked** except on the dialog.
  - Shows a **toast-sized dialog at the top** (e.g. below status bar / safe area) with:
    - Short message: e.g. "Server is down. Please retry until connected."
    - A **Retry** button that calls `retryServer()`; while retrying, show loading state (e.g. "Connecting…" or spinner on the button).
  - Is used both for **initial load failure** (health check failed before app content) and **in-app failure** (API failed while user was in the app). So the "content behind" the overlay can be nothing (initial) or the current screen (MainTabs, TemplateDetail, etc.).

**Implementation outline:**

- **App.tsx**
  - Replace the current `if (serverDown) return <ServerDownScreen />` with rendering the main app (stack) and, when `serverDown` is true, rendering the overlay **on top** (e.g. in a fragment or wrapper: main content + overlay when serverDown).
  - For initial load: when `serverDown` and we never showed the app (e.g. `isAuthenticated === null` and not loading), you can still render the stack (or a minimal placeholder) and the overlay on top so the same overlay component is used everywhere.
  - New component (e.g. `ServerDownOverlay`): `Position.absolute`, full screen, `pointerEvents="box-none"` on container and `pointerEvents="auto"` only on the dialog area so the dialog is tappable and the rest blocks touches. Or use a full-screen `TouchableWithoutFeedback` / `Pressable` that doesn’t close but blocks taps, with the small dialog at the top (safe area inset) containing the message and Retry button.
- **Styles:** Small card/dialog at top (e.g. maxWidth, padding, rounded corners), "Server is down" (or similar) + "Please retry until connected." and Retry button. Backdrop can be `rgba(0,0,0,0.5)` or similar.

**AuthContext**

- Ensure the server-unreachable callback sets `serverDown(true)` (see section 3) and remove the Alert so the overlay is the only server-down feedback in-app.

---

## Summary

| Item | Action |
|------|--------|
| API timeout | 5s in [mobile/src/api/client.ts](mobile/src/api/client.ts) |
| Health check on focus | Profile, History, Templates; 5s cooldown; `checkServerOnFocus()` in AuthContext |
| API failure in-app | Callback sets `serverDown(true)`; remove Alert |
| Server-down UI | One overlay: toast-sized dialog at top + Retry; full-screen block; used on initial and in-app |
