import z from 'zod';
import { prisma } from '../prisma/client';
import { publicProcedure, router } from './trpc';

export const appRouter = router({
    listTemplates: publicProcedure.query(async () => {
      return prisma.template.findMany({
        include: {
          exercises: {
            include: {
              exercise: true,
              sets: {
                orderBy: {
                  setNumber: 'asc',
                },
              },
            },
            orderBy: {
              order: 'asc',
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    }),
    getTemplateById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return prisma.template.findUnique({
        where: { id: input.id },
        include: {
          exercises: {
            include: {
              exercise: true,
              sets: {
                orderBy: {
                  setNumber: 'asc',
                },
              },
            },
            orderBy: {
              order: 'asc',
            },
          },
        },
      })
    }),
    updateSet: publicProcedure
      .input(
        z.object({
          setId: z.number(),
          targetWeight: z.number(),
          targetReps: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        return prisma.set.update({
          where: { id: input.setId },
          data: {
            targetWeight: input.targetWeight,
            targetReps: input.targetReps,
          },
        })
      }),
});

export type AppRouter = typeof appRouter;
