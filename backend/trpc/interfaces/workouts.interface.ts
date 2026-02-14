import z from "zod";

export const WorkoutCreateInput = z.object({
  name: z.string(),
  workoutExercises: z.array(z.object({
    id: z.number(),
    order: z.number(),
    sets: z.array(z.object({
      setNumber: z.number(),
      targetReps: z.number(),
      targetWeight: z.number(),
    })),
  })),
});