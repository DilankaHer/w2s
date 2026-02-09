import type { Session, SessionUpdatePayload } from '../types';

/**
 * Builds the session update payload from current session state.
 * Follows the SessionUpdateInput structure:
 * - sessionExercisesAdd: New exercises (id <= 0) with at least one completed set
 * - sessionExercisesUpdate: Existing exercises (id > 0) with at least one completed set
 * - sessionExercisesRemove: Existing exercises (id > 0) with NO completed sets
 * - sessionSetsRemove: Existing sets (id > 0) that are incomplete
 */
export function buildSessionUpdatePayload(
  session: Session,
  completedAt: Date,
  editingSets?: Map<number, { reps: number; weight: number }>,
  sessionExercisesRemove?: number[],
  removedSessionSetIds?: number[]
): SessionUpdatePayload {
  const sessionSetsRemove: number[] = [...(removedSessionSetIds ?? [])]
  const sessionExercisesAdd: SessionUpdatePayload['sessionExercisesAdd'] = []
  const sessionExercisesUpdate: SessionUpdatePayload['sessionExercisesUpdate'] = []
  const exercisesToRemove: number[] = [...(sessionExercisesRemove ?? [])]

  const getReps = (setId: number, fallback: number | null) => {
    const edited = editingSets?.get(setId)?.reps
    if (edited !== undefined) return edited
    return fallback ?? 0
  }

  const getWeight = (setId: number, fallback: number | null) => {
    const edited = editingSets?.get(setId)?.weight
    if (edited !== undefined) return edited
    return fallback ?? 0
  }

  const hasData = (set: { id: number; reps: number | null; weight: number | null; isCompleted?: boolean }): boolean => {
    // A set is considered completed only if it's marked as completed
    // The isCompleted flag is what the user actually toggles
    return set.isCompleted === true
  }

  // Process each exercise
  for (const exercise of session.sessionExercises) {
    const isNewExercise = exercise.id <= 0

    if (isNewExercise) {
      // New exercise: only add if it has at least one completed set
      const completedSets = exercise.sets.filter(hasData)
      
      if (completedSets.length > 0) {
        sessionExercisesAdd.push({
          exerciseId: exercise.exercise.id,
          order: exercise.order,
          sessionSets: completedSets.map(set => ({
            setNumber: set.setNumber,
            reps: getReps(set.id, set.reps),
            weight: getWeight(set.id, set.weight),
          })),
        })
      }
      // If no completed sets, skip this exercise (don't add it)
    } else {
      // Existing exercise: separate sets into existing (id > 0) and new (id <= 0)
      const existingSets = exercise.sets.filter(s => s.id > 0)
      const newSets = exercise.sets.filter(s => s.id <= 0)

      // Collect completed sets for update
      const completedExistingSets = existingSets.filter(hasData)
      const completedNewSets = newSets.filter(hasData)

      // If exercise has at least one completed set, update it
      if (completedExistingSets.length > 0 || completedNewSets.length > 0) {
        // Add incomplete existing sets to removal list
        for (const set of existingSets) {
          if (!hasData(set)) {
            sessionSetsRemove.push(set.id)
          }
        }

        sessionExercisesUpdate.push({
          exerciseId: exercise.id, // This is the sessionExercise id
          order: exercise.order,
          sessionSetsUpdate: completedExistingSets.map(set => ({
            sessionSetId: set.id,
            setNumber: set.setNumber,
            reps: getReps(set.id, set.reps),
            weight: getWeight(set.id, set.weight),
          })),
          sessionSetsAdd: completedNewSets.map(set => ({
            setNumber: set.setNumber,
            reps: getReps(set.id, set.reps),
            weight: getWeight(set.id, set.weight),
          })),
        })
      } else {
        // Exercise has NO completed sets - remove it and all its existing sets
        exercisesToRemove.push(exercise.id)
        for (const set of existingSets) {
          sessionSetsRemove.push(set.id)
        }
        // New sets (id <= 0) don't need to be removed as they don't exist in DB
      }
    }
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
    sessionExercisesRemove: exercisesToRemove,
  }
}
