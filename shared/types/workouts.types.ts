import type { Exercise } from "./exercises.types";

interface Workout {
    id: string;
    isDefaultWorkout: boolean | null;
    createdAt: string;
    name: string;
    exerciseCount: number;
    setCount: number;
}

interface WorkoutWithExercises extends Workout {
    workoutExercises: WorkoutExercise[];
}

interface CreateWorkoutInput {
    name: string;
    exercises: {
        exerciseId: string;
        order: number;
        sets: {
            setNumber: number;
            targetReps: number;
            targetWeight: number;
        }[];
    }[];
}

interface WorkoutExercise {
    id: string;
    workoutId: string;
    order: number;
    exercise: Exercise;
    exerciseId?: string;
    sets: Set[];
}

interface Set {
    id: string;
    setNumber: number;
    targetReps: number;
    targetWeight: number;
    workoutExerciseId: string;
}

export type { Workout, WorkoutWithExercises, WorkoutExercise, Exercise, CreateWorkoutInput, Set };