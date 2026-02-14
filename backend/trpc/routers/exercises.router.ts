import z from "zod";
import { prisma } from "../../prisma/client";
import { publicProcedure, router } from "../trpc";
import { ExerciseInput } from "../interfaces/exercises.interface";

export const exercisesRouter = router({
  create: publicProcedure
    .input(ExerciseInput)
    .mutation(async ({ input }) => {
      return prisma.exercise.create({
        data: { name: input.name, bodyPartId: input.bodyPartId, equipmentId: input.equipmentId },
      });
    }),

    add: publicProcedure
    .input(z.object({ sessionId: z.number(), exerciseId: z.number(), order: z.number() }))
    .mutation(async ({ input }) => {
      return prisma.sessionExercise.create({
        data: { sessionId: input.sessionId, exerciseId: input.exerciseId, order: input.order },
      });
    }),

    list: publicProcedure.query(async () => {
        return prisma.exercise.findMany({
            include: {
                bodyPart: true,
                equipment: true,
            },
        })
    }),

    filterBodyParts: publicProcedure
    .query(async () => {
        return prisma.bodyPart.findMany({
          where: {
            exercises: {
              some: {}
            },
          },
          orderBy: {
            name: 'asc',
          },
        })
    }),

    filterEquipment: publicProcedure
    .query(async () => {
        return prisma.equipment.findMany({
          where: {
            exercises: {
              some: {},
            },
          },
          orderBy: {
            name: 'asc',
          },
        })
    }),
});