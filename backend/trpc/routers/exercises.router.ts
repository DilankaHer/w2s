import z from "zod";
import { prisma } from "../../prisma/client";
import { publicProcedure, router } from "../trpc";

export const exercisesRouter = router({
  create: publicProcedure
    .input(z.object({ sessionId: z.number(), exerciseId: z.number(), order: z.number() }))
    .mutation(async ({ input }) => {
      return prisma.sessionExercise.create({
        data: { sessionId: input.sessionId, exerciseId: input.exerciseId, order: input.order },
      });
    }),

    list: publicProcedure.query(async () => {
        return prisma.exercise.findMany();
    }),
});