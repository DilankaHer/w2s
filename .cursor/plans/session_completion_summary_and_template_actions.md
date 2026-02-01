# Session completion summary and template actions

## Current behavior

- In [mobile/src/screens/SessionDetailScreen.tsx](mobile/src/screens/SessionDetailScreen.tsx), when the user taps "Complete Workout" (authenticated), `trpc.sessions.update.mutate(...)` is called and the app immediately navigates to `MainTabs` (lines 272–279).
- The backend `sessions.update` already returns the updated session object (with `sessionExercises` and scalar fields including `workoutId`); the mobile code does not use the return value.
- Backend procedures `workouts.updateBySession` and `workouts.createBySession` exist in [backend/trpc/routers/workouts.router..ts](backend/trpc/routers/workouts.router..ts) (inputs: `{ sessionId, workoutId }` and `{ sessionId, name }`).

## Target behavior

1. After `sessions.update` returns, **stay on the session screen** and show a **session summary** (name, duration, exercises/sets completed).
2. Two buttons:
   - **"Update Template"** if the session has `workoutId`; otherwise **"Create Template"**.
   - **"Go to Templates"** (confirm) — only this navigates away (to the Templates tab).
3. **Update Template**: call `workouts.updateBySession({ sessionId, workoutId })`. Stay on page; show loading, then success or error with **Retry**.
4. **Create Template**: collect a **new template name** (modal with TextInput), then call `workouts.createBySession({ sessionId, name })`. Same in-page loading/success/error/retry behavior.
5. Navigate out **only** when the user taps "Go to Templates" (navigate to MainTabs with Templates tab).
6. **Toast messages**: show relevant toasts for success and failure of key actions (see below).

---

## Toast messages

Use `Toast.show()` (already used elsewhere in the app, e.g. SessionDetailScreen, CreateTemplateScreen) with `type: 'success'` or `type: 'error'`, `text1`, and `text2` as below.

| When | Type | text1 | text2 (or equivalent) |
|------|------|-------|----------------------|
| Session completed successfully (after `sessions.update` returns) | success | Success | Workout completed and saved. |
| Update Template succeeded | success | Success | Template updated. |
| Update Template failed | error | Error | Failed to update template. Please try again. |
| Create Template succeeded | success | Success | Template created. |
| Create Template failed | error | Error | Failed to create template. Please try again. |
| Complete workout failed (existing flow) | error | Error | (keep existing: "Failed to complete workout. Please try again.") |

- Show the **session completed** toast once when the summary is shown (after `sessions.update` returns).
- Show **Update/Create template** toasts when the respective mutation succeeds or fails (in addition to any in-page success/error state and Retry, so the user gets clear feedback).

---

## Implementation (mobile only)

Per [AGENTS.md](AGENTS.md), backend and shared folders are not edited; only mobile changes are below. Any backend needs are summarized at the end.

### 1. Types and session mapping

- ** [mobile/src/types/index.ts](mobile/src/types/index.ts)**  
  Add optional `workoutId?: number | null` to the `Session` interface so the completion UI can branch on "Update" vs "Create" and pass `workoutId` to `updateBySession`.

- ** [mobile/src/screens/SessionDetailScreen.tsx](mobile/src/screens/SessionDetailScreen.tsx)**  
  In `mapSessionData`, include `workoutId: sessionData.workoutId ?? undefined` in the returned object so both `getById` and the `sessions.update` return value populate `session.workoutId`.

### 2. Completion flow and state

- In **handleCompleteWorkout** (authenticated path):  
  - Keep calling `trpc.sessions.update.mutate(...)` as today.  
  - Use the **returned** session: map it with `mapSessionData` and call `setSession(mapped)`.  
  - Set a new flag, e.g. `showCompletionSummary`, to `true` instead of calling `navigation.navigate('MainTabs')`.  
  - Show toast: **Success** / "Workout completed and saved."  
  - Do not navigate in this handler.

- Add state for the post-completion template actions:
  - `showCompletionSummary: boolean`
  - `templateError: string | null`
  - `templateLoading: boolean`
  - `templateSuccess: boolean`
  - For "Create Template": `showCreateTemplateModal: boolean`, `newTemplateName: string` (and optionally a ref to "retry create" so Retry re-opens the modal with the same name or last error).

### 3. Session summary UI

- When `showCompletionSummary` is true (and `session.completedAt` is set), show a **summary block** instead of or in addition to the current "Workout completed!" line:
  - Session name, duration (use `session.sessionTime` from API if available on the returned session, otherwise compute from `completedAt - createdAt`), and a short recap (e.g. exercise count, sets completed).
- In the same block, show:
  - **Primary action**:  
    - If `session.workoutId` exists: button **"Update Template"** → calls `workouts.updateBySession`.  
    - If not: button **"Create Template"** → opens modal for name, then calls `workouts.createBySession`.
  - **Secondary action**: button **"Go to Templates"** → `navigation.navigate('MainTabs', { screen: 'Templates' })`.
- While `templateLoading` is true: disable the template button and show a loading indicator.
- If `templateError`: show the error message and a **Retry** button (same action as before: Update or Create, with Create re-using or re-prompting name as desired). Show toast on failure (see table above).
- If `templateSuccess`: show a short success message (e.g. "Template updated" / "Template created") and show the corresponding success toast when the mutation succeeds.

### 4. Create Template name input

- Use a **Modal** with `TextInput` and Confirm/Cancel so it works on both iOS and Android (avoid relying on `Alert.prompt`, which is iOS-only).
- Confirm: validate non-empty name, then call `workouts.createBySession.mutate({ sessionId: session.id, name: newTemplateName })`, set loading/success/error as above, show success/error toast, close modal.
- Retry after a failed create: either re-open the same modal with the last `newTemplateName` or a "Retry" that calls the API again with that name.

### 5. Navigation to Templates tab

- "Go to Templates" button:  
  `navigation.navigate('MainTabs', { screen: 'Templates' })`  
- If TypeScript complains (e.g. `MainTabs: undefined` in [mobile/App.tsx](mobile/App.tsx)), extend the stack param list so MainTabs accepts an optional initial tab, e.g.  
  `MainTabs: { screen?: keyof TabParamList } | undefined`.

---

## Backend (no edits; optional improvement)

- **sessions.update** already returns the full session (including `workoutId`). No change needed.
- **workouts.updateBySession** and **workouts.createBySession** exist and have the right inputs. No change required for the flow above.
- **Optional**: `createBySession` currently returns the string `"Workout created successfully"`. If you later want to navigate to the new template (e.g. TemplateDetail), the backend could return the created workout `{ id, name }` instead of (or in addition to) the message. The current plan only navigates to the Templates list.

---

## Files to touch

| File | Changes |
|------|--------|
| [mobile/src/types/index.ts](mobile/src/types/index.ts) | Add `workoutId?: number \| null` to `Session`. |
| [mobile/src/screens/SessionDetailScreen.tsx](mobile/src/screens/SessionDetailScreen.tsx) | Use `sessions.update` return value; add completion summary state and UI; map `workoutId` in `mapSessionData`; handlers for Update/Create template with loading/error/retry and **toasts**; modal for create name; "Go to Templates" navigation. |
| [mobile/App.tsx](mobile/App.tsx) | Optionally type `MainTabs` params so `{ screen: 'Templates' }` is valid. |

No backend or shared code changes are required for the described behavior.
