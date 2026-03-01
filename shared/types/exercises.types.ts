import { z } from "zod";

export const ExerciseSchema = z.object({
    id: z.string(),
    name: z.string(),
    bodyPartId: z.string().nullable(),
    equipmentId: z.string().nullable(),
    isSynced: z.boolean(),
    isDefaultExercise: z.boolean(),
    link: z.string().nullable(),
    info: z.string().nullable(),
    imageName: z.string().nullable(),
});

export const BodyPartSchema = z.object({
    id: z.string(),
    name: z.string(),
});

export const EquipmentSchema = z.object({
    id: z.string(),
    name: z.string(),
}); 

export const ExercisesSchema = z.array(ExerciseSchema);

export type Exercise = z.infer<typeof ExerciseSchema>;
export type BodyPart = z.infer<typeof BodyPartSchema>;
export type Equipment = z.infer<typeof EquipmentSchema>;