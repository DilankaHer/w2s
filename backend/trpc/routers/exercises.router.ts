import { prisma } from "../../prisma/client";
import { publicProcedure, router } from "../trpc";

export const exercisesRouter = router({
//   create: publicProcedure
//     .input(z.object({ exercise: ExerciseCreateInput }))
//     .mutation(async ({ input }) => {
//       return prisma.exercise.create({
//         data: { name: input.exercise.name },
//       });
//     }),

    list: publicProcedure.query(async () => {
        return prisma.exercise.findMany();
    }),
});