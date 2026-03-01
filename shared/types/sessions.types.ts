import z from "zod";

const SessionSchema = z.object({
    id: z.string(),
    name: z.string(),
    createdAt: z.string(),
    completedAt: z.string().nullable().optional(),
    workoutId: z.string().nullable().optional(),
    sessionTime: z.string().nullable().optional(),
    isFromDefaultWorkout: z.boolean(),
    exerciseCount: z.number(),
    setCount: z.number(),
    isSynced: z.boolean().optional(),
    updatedWorkoutAt: z.string().nullable().optional(),
    derivedWorkoutId: z.string().nullable().optional(),
});

const SessionExerciseSchema = z.object({
    id: z.string(),
    sessionId: z.string(),
    exerciseId: z.string(),
    order: z.number(),
    isSynced: z.boolean().optional(),
});

const SessionSetSchema = z.object({
    id: z.string(),
    sessionExerciseId: z.string(),
    setNumber: z.number(),
    reps: z.number(),
    weight: z.number(),
    isSynced: z.boolean().optional(),
});

const SessionExercisesSchemaToSync = z.object({
    id: z.string(),
    sessionId: z.string(),
    exerciseId: z.string(),
    order: z.number(),
    isSynced: z.boolean().optional(),
    sessionSets: z.array(SessionSetSchema),
});

const SessionSchemaToSync = z.object({
    id: z.string(),
    name: z.string(),
    createdAt: z.string(),
    completedAt: z.string().nullable().optional(),
    workoutId: z.string().nullable().optional(),
    sessionTime: z.string().nullable().optional(),
    isFromDefaultWorkout: z.boolean(),
    exerciseCount: z.number(),
    setCount: z.number(),
    isSynced: z.boolean().optional(),
    updatedWorkoutAt: z.string().nullable().optional(),
    derivedWorkoutId: z.string().nullable().optional(),
    sessionExercises: z.array(SessionExercisesSchemaToSync),
});

export const SessionsSchema = z.array(SessionSchema);
export const SessionExercisesSchema = z.array(SessionExerciseSchema);
export const SessionSetsSchema = z.array(SessionSetSchema);
export const SessionsSchemaToSync = z.array(SessionSchemaToSync);

export type Session = z.infer<typeof SessionSchema>;
export type SessionExercise = z.infer<typeof SessionExerciseSchema>;
export type SessionSet = z.infer<typeof SessionSetSchema>;
export type SessionExercisesToSync = z.infer<typeof SessionExercisesSchemaToSync>;
export type SessionToSync = z.infer<typeof SessionSchemaToSync>;