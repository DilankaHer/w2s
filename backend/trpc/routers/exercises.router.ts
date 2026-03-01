import z from "zod";
import { prisma } from "../../prisma/client";
import { protectedProcedure } from "../middleware/auth.middleware";
import { router } from "../trpc";
import { ExercisesSchema } from "@w2s/shared/index";

export const exercisesRouter = router({
  getExercisesToSync: protectedProcedure.query(async () => {
    return prisma.exercise.findMany({
      where: {
        isDefaultExercise: true,
      },
    });
  }),

  getBodyPartsToSync: protectedProcedure.query(async () => {
    return prisma.bodyPart.findMany({});
  }),

  getEquipmentToSync: protectedProcedure.query(async () => {
    return prisma.equipment.findMany({});
  }),

  syncExercises: protectedProcedure.input(ExercisesSchema).mutation(async ({ input, ctx }) => {
    for (const exercise of input) {
      await prisma.exercise.upsert({
        where: { id: exercise.id, userId: ctx.user.userId },
        update: {
          name: exercise.name,
          bodyPartId: exercise.bodyPartId,
          equipmentId: exercise.equipmentId,
          info: exercise.info ? JSON.parse(exercise.info) : null,
        },
        create: {
          id: exercise.id,
          name: exercise.name,
          bodyPartId: exercise.bodyPartId,
          equipmentId: exercise.equipmentId,
          info: exercise.info ? JSON.parse(exercise.info) : null,
          userId: ctx.user.userId,
        },
      });
    }
  }),
});
