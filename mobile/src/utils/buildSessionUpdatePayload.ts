import type { Session, SessionUpdatePayload } from '../types';

/**
 * Builds the session update payload from current session state.
 * - New exercises (id <= 0) with at least one completed set → sessionExercisesAdd.
 * - New exercises with zero completed sets → not added (counted as "remove" / not sent).
 * - Existing exercises (id > 0) → sessionExercisesUpdate with sessionSetsUpdate (existing sets) and sessionSetsAdd (new completed sets); incomplete existing sets in sessionSetsRemove.
 * - Removed session exercise ids (e.g. from delete in UI) → sessionExercisesRemove.
 */
export function buildSessionUpdatePayload(
  session: Session,
  completedAt: Date,
  editingSets?: Map<number, { reps: number; weight: number }>,
  sessionExercisesRemove?: number[]
): SessionUpdatePayload {
  const sessionSetsRemove: number[] = []
  const sessionExercisesAdd: SessionUpdatePayload['sessionExercisesAdd'] = []
  const sessionExercisesUpdate: SessionUpdatePayload['sessionExercisesUpdate'] = []

  const getReps = (setId: number, fallback: number) =>
    editingSets?.get(setId)?.reps ?? fallback ?? 0
  const getWeight = (setId: number, fallback: number) =>
    editingSets?.get(setId)?.weight ?? fallback ?? 0

  for (const se of session.sessionExercises) {
    const isNewExercise = se.id <= 0
    const completedSets = se.sets.filter((s) => s.isCompleted)

    if (isNewExercise) {
      if (completedSets.length === 0) continue
      sessionExercisesAdd.push({
        exerciseId: se.exercise.id,
        order: se.order,
        sessionSets: completedSets.map((s) => ({
          setNumber: s.setNumber,
          reps: getReps(s.id, s.reps ?? 0),
          weight: getWeight(s.id, s.weight ?? 0),
        })),
      })
      continue
    }

    const existingSets = se.sets.filter((s) => s.id > 0)
    const newSets = se.sets.filter((s) => s.id <= 0)
    for (const s of existingSets) {
      if (!s.isCompleted) sessionSetsRemove.push(s.id)
    }
    const sessionSetsUpdate = existingSets
      .filter((s) => s.isCompleted)
      .map((s) => ({
        sessionSetId: s.id,
        setNumber: s.setNumber,
        reps: getReps(s.id, s.reps ?? 0),
        weight: getWeight(s.id, s.weight ?? 0),
        isCompleted: true,
      }))
    const sessionSetsAdd = newSets.filter((s) => s.isCompleted).map((s) => ({
      setNumber: s.setNumber,
      reps: getReps(s.id, s.reps ?? 0),
      weight: getWeight(s.id, s.weight ?? 0),
    }))

    sessionExercisesUpdate.push({
      exerciseId: se.id,
      order: se.order,
      sessionSetsUpdate,
      sessionSetsAdd,
    })
  }

  return {
    sessionId: session.id,
    workoutId: session.workoutId ?? undefined,
    createdAt: new Date(session.createdAt),
    completedAt,
    name: session.name,
    sessionExercisesAdd,
    sessionExercisesUpdate,
    sessionSetsRemove,
    sessionExercisesRemove: sessionExercisesRemove ?? [],
  }
}
