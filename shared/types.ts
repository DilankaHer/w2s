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

interface WorkoutExercise {
    id: string;
    workoutId: string;
    exercise: Exercise;
    order: number;
    sets: Set[];
}

interface Exercise {
    id: string;
    name: string;
}

interface Set {
    id: string;
    workoutExerciseId: string;
    setNumber: number;
    targetReps: number;
    targetWeight: number;
}

export type { Workout, WorkoutWithExercises, WorkoutExercise, Set, Exercise };