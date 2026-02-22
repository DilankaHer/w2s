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
}

interface SessionSet {
    id: string;
    setNumber: number;
    reps: number;
    weight: number;
    sessionExerciseId: string;
}

export type { Session, SessionWithExercises, SessionExercise, SessionSet };