import z from "zod";

const WorkoutSchema = z.object({
    id: z.string(),
    isDefaultWorkout: z.boolean().optional(),
    createdAt: z.string(),
    name: z.string(),
    exerciseCount: z.number(),
    setCount: z.number(),
    isSynced: z.boolean().optional(),
});

const WorkoutExerciseSchema = z.object({
    id: z.string(),
    workoutId: z.string(),
    order: z.number(),
    exerciseId: z.string(),
    isSynced: z.boolean().optional(),
});

const SetSchema = z.object({
    id: z.string(),
    setNumber: z.number(),
    targetReps: z.number(),
    targetWeight: z.number(),
    workoutExerciseId: z.string(),
    isSynced: z.boolean().optional(),
});

export const WorkoutsSchema = z.array(WorkoutSchema);
export const WorkoutExercisesSchema = z.array(WorkoutExerciseSchema);
export const SetsSchema = z.array(SetSchema);

export type Workout = z.infer<typeof WorkoutSchema>;
export type WorkoutExercise = z.infer<typeof WorkoutExerciseSchema>;
export type Set = z.infer<typeof SetSchema>;