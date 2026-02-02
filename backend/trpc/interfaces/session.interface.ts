import { z } from "zod";

export const SessionUpdateInput = z.object({
    sessionId: z.number(),
    workoutId: z.number().optional(),
    createdAt: z.coerce.date(),
    completedAt: z.coerce.date(),
    userId: z.number().optional(),
    name: z.string().optional(),
    sessionExercisesAdd: z.array(z.object({
        exerciseId: z.number(),
        order: z.number(),
        sessionSets: z.array(z.object({
            setNumber: z.number(),
            reps: z.number(),
            weight: z.number(),
        })),
    })),
    sessionExercisesUpdate: z.array(z.object({
        exerciseId: z.number(),
        order: z.number(),
        sessionSetsUpdate: z.array(z.object({
            sessionSetId: z.number(),
            setNumber: z.number(),
            reps: z.number(),
            weight: z.number(),
            isCompleted: z.boolean(),
        })),
        sessionSetsAdd: z.array(z.object({
            setNumber: z.number(),
            reps: z.number(),
            weight: z.number(),
        })),
    })),
    sessionSetsRemove: z.array(z.number()),
    sessionExercisesRemove: z.array(z.number()),
});