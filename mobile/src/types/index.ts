export interface Exercise {
  id: number
  name: string
}

export interface Set {
  id: number
  setNumber: number
  targetReps: number
  targetWeight: number
}

export interface SessionSet {
  id: number
  setNumber: number
  reps: number | null
  weight: number | null
  isCompleted?: boolean
}

export interface TemplateExercise {
  id: number
  order: number
  exercise: Exercise
  sets: Set[]
}

export interface SessionExercise {
  id: number
  order: number
  exercise: Exercise
  sets: SessionSet[]
}

export interface Template {
  id: number
  name: string
  createdAt: string
  workoutExercises: TemplateExercise[]
  isDefaultTemplate?: boolean
  /** When provided by API, shown on template card as "X exercises • Y sets" */
  exerciseCount?: number
  setCount?: number
}

export interface Session {
  id: number
  name: string
  createdAt: string
  completedAt: string | null
  workoutId?: number | null
  sessionTime?: string | null
  isSyncedOnce?: boolean
  isFromDefaultTemplate?: boolean
  sessionExercises: SessionExercise[]
}

export interface WorkoutInfo {
  username: string
  workouts: Template[]
  sessions: Array<{
    id: number
    workoutId: number | null
    createdAt: string
    completedAt: string | null
    sessionTime: string | null
    /** Session/workout name; when provided by API, shown as card title instead of "Workout" */
    name?: string
    /** When provided by API, shown on session card as "X exercises • Y sets" */
    exerciseCount?: number
    setCount?: number
  }>
}

/** Matches backend SessionUpdateInput – used to save session (supports offline / continue when no internet). */
export interface SessionUpdatePayload {
  sessionId: number
  workoutId?: number
  createdAt: string | Date
  completedAt: string | Date
  userId?: number
  name?: string
  sessionExercisesAdd: Array<{
    exerciseId: number
    order: number
    sessionSets: Array<{
      setNumber: number
      reps: number
      weight: number
    }>
  }>
  sessionExercisesUpdate: Array<{
    /** Backend uses this as sessionExercise id. */
    exerciseId: number
    order: number
    sessionSetsUpdate: Array<{
      sessionSetId: number
      setNumber: number
      reps: number
      weight: number
    }>
    sessionSetsAdd: Array<{
      setNumber: number
      reps: number
      weight: number
    }>
  }>
  sessionSetsRemove: number[]
  sessionExercisesRemove: number[]
}
