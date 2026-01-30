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
  isCompleted: boolean
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
}

export interface Session {
  id: number
  name: string
  createdAt: string
  completedAt: string | null
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
  }>
}
