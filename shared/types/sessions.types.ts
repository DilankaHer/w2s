import type { Exercise } from "./exercises.types";

interface Session {
    id: string;
    name: string;
    workoutId: string | null;
    createdAt: string;
    completedAt?: string | null;
    sessionTime?: string | null;
    isSynced?: boolean;
    isFromDefaultWorkout?: boolean;
    derivedWorkoutId?: string | null;
    updatedWorkoutAt?: string | null;
}

interface SessionWithExercises extends Session {
    sessionExercises: SessionExercise[];
}

interface SessionExercise {
    id: string;
    sessionId: string;
    exerciseId: string;
    exercise?: Exercise;
    order: number;
    sessionSets?: SessionSet[];
    isSynced?: boolean;
}

interface SessionSet {
    id: string;
    setNumber: number;
    reps: number;
    weight: number;
    sessionExerciseId: string;
    isSynced?: boolean;
}

export type { Session, SessionWithExercises, SessionExercise, SessionSet };