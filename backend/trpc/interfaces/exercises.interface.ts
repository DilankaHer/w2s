import z from "zod";

export const ExerciseInput = z.object({
    name: z.string(),
    bodyPartId: z.number(),
    equipmentId: z.number(),
});