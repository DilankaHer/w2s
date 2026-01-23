// backend/trpc/routers/templates.router.ts
import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { prisma } from "../../prisma/client";

export const templatesRouter = router({
  list: publicProcedure.query(async () => {
    return prisma.template.findMany({
      include: {
        exercises: {
          include: {
            exercise: true,
            sets: {
              orderBy: { setNumber: "asc" },
            },
          },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return prisma.template.findUnique({
        where: { id: input.id },
        include: {
          exercises: {
            include: {
              exercise: true,
              sets: {
                orderBy: { setNumber: "asc" },
              },
            },
            orderBy: { order: "asc" },
          },
        },
      });
    }),
});
